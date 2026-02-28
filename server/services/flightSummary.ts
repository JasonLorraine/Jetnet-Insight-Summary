import type { AircraftProfile, AISummary } from "../../shared/types";
import type { FlightIntelligence } from "./flightAnalyzer";

const FLIGHT_SYSTEM_PROMPT = `You are an aviation operational intelligence analyst writing for aircraft brokers and dealers. Analyze aircraft behavior patterns from flight activity data. Focus on operational intent, ownership signals, and sale probability. Be concise, direct, and commercially actionable.`;

function buildFlightPrompt(profile: AircraftProfile, intel: FlightIntelligence): string {
  const monthlyLines = intel.monthlyBreakdown
    .map((m) => `  ${m.month}: ${m.flights} flights${m.hours ? ` (${m.hours} hrs)` : ""}`)
    .join("\n");

  const topRouteLines = intel.topRoutes
    .map((r) => `  ${r.route}: ${r.count} flights`)
    .join("\n");

  const downtimeLines = intel.downtimePeriods
    .map((d) => `  ${d.startDate} to ${d.endDate} (${d.days} days idle)`)
    .join("\n");

  return `Analyze the flight activity for this aircraft and provide operational intelligence.

Aircraft: ${profile.registration} — ${profile.yearMfr} ${profile.make} ${profile.model}
Owner: ${profile.relationships.find((r) => r.relationType.toLowerCase() === "owner")?.companyName || "Unknown"}
Operator: ${profile.relationships.find((r) => r.relationType.toLowerCase() === "operator")?.companyName || "Unknown"}
For Sale: ${profile.marketSignals.forSale ? "Yes" : "No"}
${profile.hotNotScore ? `Hot/Not Score: ${profile.hotNotScore.score}/100` : ""}

Flight Data Summary (Last 12 Months):
  Total Flights: ${intel.totalFlights}
  ${intel.totalHours ? `Total Hours: ${intel.totalHours}` : ""}
  Avg Flights/Month: ${intel.avgFlightsPerMonth}
  ${intel.avgHoursPerFlight ? `Avg Hours/Flight: ${intel.avgHoursPerFlight}` : ""}
  Unique Airports Visited: ${intel.uniqueAirports}
  Primary Base: ${intel.primaryBaseAirport || "Undetermined"}
  Activity Trend: ${intel.activityTrendSlope}
  Route Repetition: ${intel.routeRepetitionScore}%
  International Ratio: ${Math.round(intel.internationalRatio * 100)}%
  Charter Likelihood: ${intel.charterLikelihood}
  ${intel.seasonalPattern ? `Seasonal Pattern: ${intel.seasonalPattern}` : ""}

Monthly Breakdown:
${monthlyLines || "  No monthly data"}

Top Routes:
${topRouteLines || "  No route data"}

${intel.downtimePeriods.length > 0 ? `Downtime Periods (30+ days idle):\n${downtimeLines}` : "No significant downtime periods"}

${intel.preSaleSignals.length > 0 ? `Pre-Sale Signals Detected:\n${intel.preSaleSignals.map((s) => `  - ${s}`).join("\n")}` : "No pre-sale signals detected"}

Respond with EXACTLY this JSON format:
{
  "summaryMarkdown": "Operational intelligence summary (2-3 sentences, broker voice, focus on what the flight pattern reveals about owner intent)",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "redFlags": ["flag1", "flag2"],
  "suggestedNextQuestions": ["question1", "question2", "question3"]
}

Guidelines:
- summaryMarkdown: Lead with the operational verdict — is this aircraft actively used, winding down, or idle?
- keyInsights: What the flight pattern tells a broker about likelihood of sale, owner behavior, and timing (3-5 bullets)
- redFlags: Operational concerns a broker should know (irregular patterns, sudden stops, charter-like behavior) — can be empty
- suggestedNextQuestions: What a broker should investigate based on flight patterns
- If activity is declining, frame it as a potential acquisition opportunity
- If charter-like patterns detected, note implications for deal complexity
- Use only the provided data. Be specific about numbers and dates.`;
}

export async function generateFlightSummary(
  profile: AircraftProfile,
  flightIntelligence: FlightIntelligence,
  provider: "openai" | "anthropic",
  apiKey: string,
  maxTokens: number = 1000
): Promise<AISummary> {
  const userPrompt = buildFlightPrompt(profile, flightIntelligence);

  if (provider === "openai") {
    return generateOpenAI(apiKey, userPrompt, maxTokens);
  } else {
    return generateAnthropic(apiKey, userPrompt, maxTokens);
  }
}

async function generateOpenAI(
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
        { role: "system", content: FLIGHT_SYSTEM_PROMPT },
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
  return parseSummaryResponse(content);
}

async function generateAnthropic(
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
      system: FLIGHT_SYSTEM_PROMPT,
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
  return parseSummaryResponse(text);
}

function parseSummaryResponse(content: string): AISummary {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
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
