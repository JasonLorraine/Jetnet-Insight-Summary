import type { AircraftProfile, AISummary } from "../../shared/types";

const SYSTEM_PROMPT = `You are an aircraft sales analyst writing for brokers and dealers. Write in concise broker tone. No fluff. Be direct and actionable.`;

function buildUserPrompt(profile: AircraftProfile): string {
  return `Analyze the following aircraft data and provide a broker-focused assessment.

Aircraft: ${profile.registration} — ${profile.yearMfr} ${profile.make} ${profile.model}
Serial: ${profile.serialNumber}
Status: ${profile.lifecycleStatus}
Base: ${profile.baseLocation.city || "Unknown"}, ${profile.baseLocation.country || "Unknown"}
For Sale: ${profile.marketSignals.forSale ? "Yes" : "No"}
${profile.marketSignals.askingPrice ? `Asking: ${profile.marketSignals.askingPrice}` : ""}
${profile.marketSignals.daysOnMarket ? `Days on Market: ${profile.marketSignals.daysOnMarket}` : ""}
Weight Class: ${profile.weightClass}
Category: ${profile.categorySize}
Est. AFTT: ${profile.estimatedAFTT || "Unknown"}

Owner: ${profile.relationships.find((r) => r.relationType.toLowerCase() === "owner")?.companyName || "Unknown"}
Operator: ${profile.relationships.find((r) => r.relationType.toLowerCase() === "operator")?.companyName || "Unknown"}

Relationships: ${profile.relationships.length}
Pictures Available: ${profile.pictures.length}
Transaction History Entries: ${profile.history.length}
${profile.utilizationSummary ? `Utilization: ${profile.utilizationSummary.totalFlights} flights, ${profile.utilizationSummary.avgFlightsPerMonth.toFixed(1)} flights/month` : "Utilization: Unknown"}

${profile.hotNotScore ? `Hot/Not Score: ${profile.hotNotScore.score}/100 (${profile.hotNotScore.label})
Est. Time to Sell: ${profile.hotNotScore.timeToSellEstimateDays} days` : ""}

${profile.ownerIntelligence ? `Owner Intelligence:
  Ownership: ${profile.ownerIntelligence.ownershipYears} years
  Archetype: ${profile.ownerIntelligence.ownerArchetype}
  Sell Probability: ${profile.ownerIntelligence.sellProbability}/100
  Predicted Window: ${profile.ownerIntelligence.predictedSellWindow}
  Brand Loyalty: ${profile.ownerIntelligence.brandLoyalty}
  Replacement Cycle: ${profile.ownerIntelligence.replacementCycleStatus}
  Fleet Size: ${profile.ownerIntelligence.fleetSize}` : ""}

Respond with EXACTLY this JSON format:
{
  "summaryMarkdown": "Executive summary paragraph (2-3 sentences, broker voice)",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "redFlags": ["flag1", "flag2"],
  "suggestedNextQuestions": ["question1", "question2", "question3"]
}

Guidelines:
- keyInsights: "Why it will sell" factors (3-5 bullets)
- redFlags: "Why it might stall" concerns (1-3 bullets, can be empty array if none)
- suggestedNextQuestions: What a broker should ask or investigate next
- Use only the provided data. If data is missing, note what's missing.
- Include Evolution link reference if actionable.`;
}

export async function generateAISummary(
  profile: AircraftProfile,
  provider: "openai" | "anthropic",
  apiKey: string,
  maxTokens: number = 1000
): Promise<AISummary> {
  const userPrompt = buildUserPrompt(profile);

  if (provider === "openai") {
    return generateOpenAISummary(apiKey, userPrompt, maxTokens);
  } else {
    return generateAnthropicSummary(apiKey, userPrompt, maxTokens);
  }
}

async function generateOpenAISummary(
  apiKey: string,
  userPrompt: string,
  maxTokens: number
): Promise<AISummary> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return parseAISummaryResponse(content);
}

async function generateAnthropicSummary(
  apiKey: string,
  userPrompt: string,
  maxTokens: number
): Promise<AISummary> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      system: SYSTEM_PROMPT,
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

  if (!text) {
    throw new Error("Anthropic returned empty response");
  }

  return parseAISummaryResponse(text);
}

function parseAISummaryResponse(content: string): AISummary {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summaryMarkdown: parsed.summaryMarkdown || "Summary not available.",
      keyInsights: parsed.keyInsights || [],
      redFlags: parsed.redFlags || [],
      suggestedNextQuestions: parsed.suggestedNextQuestions || [],
    };
  } catch {
    return {
      summaryMarkdown: content,
      keyInsights: [],
      redFlags: [],
      suggestedNextQuestions: [],
    };
  }
}
