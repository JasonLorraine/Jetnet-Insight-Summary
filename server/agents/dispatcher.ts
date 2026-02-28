import * as fs from "fs";
import * as path from "path";
import type { PersonaId, PersonaIntelPayload, PersonaIntelResponseBase } from "../../shared/types/persona";
import { PERSONAS } from "../../constants/personas";
import { computeConfidence } from "./confidence";

const SKILL_DIR = path.join(process.cwd(), ".agents", "skills", "personas");

function loadSkillFile(personaId: PersonaId): string {
  const filePath = path.join(SKILL_DIR, `${personaId}.md`);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    const config = PERSONAS[personaId];
    return buildFallbackPrompt(config.label, config.coreMission, config.reportTone);
  }
}

function buildFallbackPrompt(label: string, mission: string, tone: string): string {
  return `You are an AI agent embedded in a ${label}-focused aviation intelligence app.

Your mission: ${mission}

You will receive a JSON payload containing aircraft data, company relationships, contacts,
and optional flight, transaction, and market intelligence.

You MUST return ONLY valid JSON matching the PersonaIntelResponse schema.

Tone: ${tone}

CONSTRAINTS:
- Only use information present in the payload
- If information is missing, say it is unknown
- Never invent facts
- Return ONLY valid JSON`;
}

function buildSystemPrompt(personaId: PersonaId): string {
  const skillContent = loadSkillFile(personaId);

  return `${skillContent}

ABSOLUTE CONSTRAINTS (override everything above):
- Only reference data explicitly present in the payload
- If information is missing, say it is unknown — never invent
- Never identify aircraft as belonging to specific public figures unless the payload names them
- Never infer tax strategies, legal disputes, or regulatory violations
- Never speculate about the purpose of specific flights
- Never claim flight activity exists when flightIntel is missing or available is false
- generatedAt must be ISO 8601 UTC
- All "to" arrays in outreach must be subsets of emails/phones in the input
- Email body must be within request.maxOutreachLength.emailWords words
- SMS body must be within request.maxOutreachLength.smsChars characters
- Return ONLY valid JSON — no markdown, no backticks, no commentary`;
}

function buildUserPrompt(personaId: PersonaId, payload: PersonaIntelPayload): string {
  return `Persona: ${personaId}
Operation: all
Return JSON only.

Payload:
${JSON.stringify(payload, null, 2)}`;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices as Array<{ message: { content: string } }>;
  const content = choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return content;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const content = data.content as Array<{ type: string; text: string }>;
  const text = content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned empty response");
  return text;
}

function parseResponse(raw: string): Record<string, unknown> {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  return JSON.parse(jsonMatch[0]);
}

function ensureBaseFields(
  parsed: Record<string, unknown>,
  personaId: PersonaId,
  regNbr: string,
  confidenceResult: { score: number; explanation: string[]; missingData: string[] }
): PersonaIntelResponseBase {
  return {
    meta: {
      regNbr,
      personaId,
      mode: "all",
      generatedAt: (parsed.meta as any)?.generatedAt || new Date().toISOString(),
    },
    executiveSummary: (parsed.executiveSummary as string[]) || [],
    personaTakeaways: (parsed.personaTakeaways as string[]) || (parsed.brokerTakeaways as string[]) || [],
    dataConfidence: {
      score: confidenceResult.score,
      explanation: confidenceResult.explanation,
      missingData: confidenceResult.missingData,
    },
    whoToContactFirst: (parsed.whoToContactFirst as any[]) || [],
    recommendedNextActions: (parsed.recommendedNextActions as string[]) || [],
    complianceNotes: (parsed.complianceNotes as string[]) || [],
  };
}

export interface DispatchResult {
  response: PersonaIntelResponseBase & Record<string, unknown>;
  rawResponse: string;
}

export async function dispatchToAgent(
  personaId: PersonaId,
  payload: PersonaIntelPayload,
  provider: "openai" | "anthropic",
  apiKey: string,
  maxTokens: number = 2000
): Promise<DispatchResult> {
  const systemPrompt = buildSystemPrompt(personaId);
  const userPrompt = buildUserPrompt(personaId, payload);

  const rawResponse =
    provider === "openai"
      ? await callOpenAI(apiKey, systemPrompt, userPrompt, maxTokens)
      : await callAnthropic(apiKey, systemPrompt, userPrompt, maxTokens);

  const parsed = parseResponse(rawResponse);
  const confidenceResult = computeConfidence(personaId, payload);
  const base = ensureBaseFields(parsed, personaId, payload.aircraft.regNbr, confidenceResult);

  const response = {
    ...parsed,
    ...base,
  };

  return { response, rawResponse };
}
