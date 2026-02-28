import type {
  AircraftProfile,
  HotNotScore,
  ScoringFactor,
} from "../../shared/types";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function computeModelLiquidity(profile: AircraftProfile): ScoringFactor {
  let value = 0.5;
  let explanation = "Baseline liquidity assumed for model category.";

  const category = (profile.categorySize || "").toLowerCase();
  if (category.includes("large") || category.includes("long")) {
    value = 0.65;
    explanation = "Large cabin / long-range jets have strong market demand.";
  } else if (category.includes("mid")) {
    value = 0.7;
    explanation = "Midsize jets are the most liquid segment.";
  } else if (category.includes("light")) {
    value = 0.6;
    explanation = "Light jets have reasonable market liquidity.";
  } else if (category.includes("ultra")) {
    value = 0.55;
    explanation =
      "Ultra long-range jets have a smaller buyer pool but command premium.";
  }

  if (profile.marketSignals.forSale) {
    value = Math.min(value + 0.1, 1.0);
    explanation += " Currently listed for sale increases exposure.";
  }

  return {
    name: "Model Liquidity",
    weight: 0.25,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeDaysOnMarket(profile: AircraftProfile): ScoringFactor {
  const dom = profile.marketSignals.daysOnMarket;
  let value = 0.5;
  let explanation: string;

  if (dom === null || dom === undefined) {
    if (profile.marketSignals.forSale) {
      value = 0.6;
      explanation = "Listed for sale but days-on-market data unavailable.";
    } else {
      value = 0.5;
      explanation =
        "Not currently listed. Days-on-market not applicable (baseline).";
    }
  } else if (dom < 30) {
    value = 0.95;
    explanation = `Only ${dom} days on market — very fresh listing.`;
  } else if (dom < 90) {
    value = 0.8;
    explanation = `${dom} days on market — still within normal sell window.`;
  } else if (dom < 180) {
    value = 0.55;
    explanation = `${dom} days on market — approaching stale territory.`;
  } else if (dom < 365) {
    value = 0.3;
    explanation = `${dom} days on market — pricing or positioning likely needs review.`;
  } else {
    value = 0.15;
    explanation = `${dom} days on market — significantly stale listing.`;
  }

  return {
    name: "Days on Market Signal",
    weight: 0.2,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeAgeFit(profile: AircraftProfile): ScoringFactor {
  const currentYear = new Date().getFullYear();
  const age = currentYear - profile.yearMfr;
  let value: number;
  let explanation: string;

  if (age <= 5) {
    value = 0.9;
    explanation = `${age} years old — in the sweet spot for buyers.`;
  } else if (age <= 10) {
    value = 0.75;
    explanation = `${age} years old — still strong demand.`;
  } else if (age <= 15) {
    value = 0.6;
    explanation = `${age} years old — moderate demand, condition matters.`;
  } else if (age <= 20) {
    value = 0.4;
    explanation = `${age} years old — narrower buyer pool, value-focused buyers.`;
  } else {
    value = 0.25;
    explanation = `${age} years old — limited demand, specialized buyers only.`;
  }

  return {
    name: "Age & Configuration Fit",
    weight: 0.15,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeTransactionPattern(profile: AircraftProfile): ScoringFactor {
  const historyCount = profile.history.length;
  let value = 0.5;
  let explanation: string;

  if (historyCount === 0) {
    value = 0.5;
    explanation = "No transaction history available.";
  } else if (historyCount === 1) {
    value = 0.6;
    explanation = "Single owner history — stable ownership may appeal to buyers.";
  } else if (historyCount <= 3) {
    value = 0.65;
    explanation = `${historyCount} transactions — normal lifecycle.`;
  } else if (historyCount <= 5) {
    value = 0.55;
    explanation = `${historyCount} transactions — moderate turnover.`;
  } else {
    value = 0.35;
    explanation = `${historyCount} transactions — frequent flips may signal issues.`;
  }

  return {
    name: "Transaction Pattern",
    weight: 0.1,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeUtilization(profile: AircraftProfile): ScoringFactor {
  const util = profile.utilizationSummary;
  let value = 0.5;
  let explanation: string;

  if (!util || util.totalFlights === 0) {
    value = 0.35;
    explanation =
      "No utilization data — possible hangar queen, may concern buyers.";
  } else {
    const monthlyAvg = util.avgFlightsPerMonth;
    if (monthlyAvg >= 15 && monthlyAvg <= 40) {
      value = 0.8;
      explanation = `${monthlyAvg.toFixed(1)} flights/month — healthy utilization.`;
    } else if (monthlyAvg >= 5 && monthlyAvg < 15) {
      value = 0.6;
      explanation = `${monthlyAvg.toFixed(1)} flights/month — moderate use.`;
    } else if (monthlyAvg > 40) {
      value = 0.5;
      explanation = `${monthlyAvg.toFixed(1)} flights/month — heavy use may increase maintenance concerns.`;
    } else {
      value = 0.4;
      explanation = `${monthlyAvg.toFixed(1)} flights/month — low utilization.`;
    }
  }

  return {
    name: "Utilization Profile",
    weight: 0.1,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeOwnershipSimplicity(profile: AircraftProfile): ScoringFactor {
  const rels = profile.relationships;
  const ownerCount = rels.filter(
    (r) => r.relationType.toLowerCase() === "owner"
  ).length;
  const trusteeCount = rels.filter(
    (r) => r.relationType.toLowerCase() === "trustee"
  ).length;
  const totalRelations = rels.length;
  let value: number;
  let explanation: string;

  if (totalRelations <= 2 && trusteeCount === 0) {
    value = 0.9;
    explanation = "Simple ownership structure — easy to transact.";
  } else if (trusteeCount > 0 && totalRelations <= 4) {
    value = 0.6;
    explanation = "Trustee involvement adds complexity but is common.";
  } else if (totalRelations <= 4) {
    value = 0.7;
    explanation = "Moderate relationship complexity.";
  } else {
    value = 0.4;
    explanation = `${totalRelations} relationships — layered structure may slow transactions.`;
  }

  return {
    name: "Ownership Simplicity",
    weight: 0.1,
    value: clamp(value, 0, 1),
    explanation,
  };
}

function computeDataCompleteness(profile: AircraftProfile): ScoringFactor {
  let score = 0;
  let total = 0;
  const missing: string[] = [];

  total++;
  if (profile.pictures.length > 0) score++;
  else missing.push("pictures");

  total++;
  if (profile.relationships.length > 0) score++;
  else missing.push("relationships");

  total++;
  if (profile.utilizationSummary && profile.utilizationSummary.totalFlights > 0)
    score++;
  else missing.push("utilization");

  total++;
  if (profile.history.length > 0) score++;
  else missing.push("history");

  total++;
  if (profile.serialNumber) score++;
  else missing.push("serial number");

  total++;
  if (profile.baseLocation.icao || profile.baseLocation.city) score++;
  else missing.push("base location");

  total++;
  if (profile.yearMfr > 0) score++;

  const value = score / total;
  const explanation =
    missing.length > 0
      ? `Missing: ${missing.join(", ")}. ${score}/${total} data points available.`
      : `All ${total} key data points available.`;

  return {
    name: "Data Completeness",
    weight: 0.1,
    value: clamp(value, 0, 1),
    explanation,
  };
}

export function computeHotNotScore(profile: AircraftProfile): HotNotScore {
  const factors: ScoringFactor[] = [
    computeModelLiquidity(profile),
    computeDaysOnMarket(profile),
    computeAgeFit(profile),
    computeTransactionPattern(profile),
    computeUtilization(profile),
    computeOwnershipSimplicity(profile),
    computeDataCompleteness(profile),
  ];

  const rawScore = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
  const score = Math.round(rawScore * 100);

  let label: "HOT" | "WARM" | "NEUTRAL" | "COLD";
  if (score >= 80) label = "HOT";
  else if (score >= 60) label = "WARM";
  else if (score >= 40) label = "NEUTRAL";
  else label = "COLD";

  const baselineDays = 180;
  let multiplier: number;
  if (label === "HOT") multiplier = 0.8;
  else if (label === "WARM") multiplier = 1.0;
  else if (label === "NEUTRAL") multiplier = 1.25;
  else multiplier = 1.7;

  const timeToSellEstimateDays = Math.round(baselineDays * multiplier);

  const assumptions = [
    "Score is based on publicly available JETNET data at time of lookup.",
    "Market liquidity is estimated from model category, not real-time inventory.",
    "Time-to-sell is a heuristic estimate based on scoring factors.",
  ];

  if (profile.marketSignals.daysOnMarket === null) {
    assumptions.push(
      "Days-on-market data was not available; baseline assumed."
    );
  }

  return {
    score,
    label,
    timeToSellEstimateDays,
    factors,
    assumptions,
    dataFreshness: {
      jetnetTokenValidatedAt: new Date().toISOString(),
      lookupsCompletedAt: new Date().toISOString(),
    },
  };
}
