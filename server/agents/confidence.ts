import type { PersonaId, PersonaIntelPayload } from "../../shared/types/persona";
import { CONFIDENCE_PENALTY_MULTIPLIERS } from "../../constants/contact-weights";

interface ConfidenceResult {
  score: number;
  explanation: string[];
  missingData: string[];
}

const BASE_PENALTIES: Record<string, number> = {
  recommendations: 40,
  contacts: 25,
  companies: 20,
  flightIntel: 25,
  transactionsIntel: 25,
  marketIntel: 15,
};

export function computeConfidence(
  personaId: PersonaId,
  payload: PersonaIntelPayload
): ConfidenceResult {
  let score = 100;
  const explanation: string[] = [];
  const missingData: string[] = [];
  const multipliers = CONFIDENCE_PENALTY_MULTIPLIERS[personaId];

  if (!payload.recommendations || payload.recommendations.length === 0) {
    const penalty = Math.round(BASE_PENALTIES.recommendations * (multipliers.recommendations ?? 1));
    score -= penalty;
    missingData.push("Contact recommendations");
    explanation.push(`No contact recommendations available (-${penalty})`);
  }

  if (!payload.contacts || payload.contacts.length === 0) {
    const penalty = Math.round(BASE_PENALTIES.contacts * (multipliers.contacts ?? 1));
    score -= penalty;
    missingData.push("Contact details");
    explanation.push(`No contact details available (-${penalty})`);
  }

  if (!payload.companies || payload.companies.length === 0) {
    const penalty = Math.round(BASE_PENALTIES.companies * (multipliers.companies ?? 1));
    score -= penalty;
    missingData.push("Company relationships");
    explanation.push(`No company relationships available (-${penalty})`);
  }

  if (!payload.flightIntel || !payload.flightIntel.available) {
    const penalty = Math.round(BASE_PENALTIES.flightIntel * (multipliers.flightIntel ?? 1));
    score -= penalty;
    missingData.push("Flight intelligence");
    explanation.push(`Flight data not available (-${penalty})`);
  }

  if (!payload.transactionsIntel || !payload.transactionsIntel.available) {
    const penalty = Math.round(BASE_PENALTIES.transactionsIntel * (multipliers.transactionsIntel ?? 1));
    score -= penalty;
    missingData.push("Transaction history");
    explanation.push(`Transaction history not available (-${penalty})`);
  }

  if (!payload.marketIntel || !payload.marketIntel.available) {
    const penalty = Math.round(BASE_PENALTIES.marketIntel * (multipliers.marketIntel ?? 1));
    score -= penalty;
    missingData.push("Market intelligence");
    explanation.push(`Market data not available (-${penalty})`);
  }

  if (missingData.length === 0) {
    explanation.push("All data sources available");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    explanation,
    missingData,
  };
}
