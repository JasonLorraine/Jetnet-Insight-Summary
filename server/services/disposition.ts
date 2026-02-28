import type {
  AircraftProfile,
  OwnerIntelligence,
  DispositionFactor,
  FleetAircraft,
  Relationship,
  HistoryEntry,
} from "../../shared/types";

const TYPICAL_HOLD_YEARS: Record<string, [number, number]> = {
  light: [4, 7],
  midsize: [5, 8],
  mid: [5, 8],
  "super mid": [6, 9],
  large: [7, 12],
  "long-range": [7, 12],
  "ultra long": [8, 15],
  ultra: [8, 15],
  heavy: [7, 12],
};

function getExpectedCycle(categorySize: string): number {
  const cat = categorySize.toLowerCase();
  for (const [key, [min, max]] of Object.entries(TYPICAL_HOLD_YEARS)) {
    if (cat.includes(key)) {
      return (min + max) / 2;
    }
  }
  return 7;
}

function findLastSaleDate(history: HistoryEntry[]): string | null {
  const sales = history.filter((h) => {
    const type = h.transactionType.toLowerCase();
    return type.includes("sale") || type.includes("deliver") || type.includes("transfer");
  });

  if (sales.length === 0) return null;
  return sales[sales.length - 1].date;
}

function computeOwnershipAge(
  profile: AircraftProfile
): { years: number; purchaseDate: string | null } {
  const purchaseDate = findLastSaleDate(profile.history);
  if (purchaseDate) {
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const years =
      (now.getTime() - purchase.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return { years: Math.round(years * 10) / 10, purchaseDate };
  }
  const currentYear = new Date().getFullYear();
  const age = currentYear - profile.yearDelivered;
  return { years: age, purchaseDate: null };
}

function computeBrandLoyalty(
  priorAircraft: string[],
  currentMake: string
): { score: number; level: "HIGH" | "MODERATE" | "LOW" } {
  if (priorAircraft.length === 0) {
    return { score: 0.5, level: "MODERATE" };
  }

  const sameBrand = priorAircraft.filter((a) => {
    const make = a.split(" ")[0]?.toUpperCase() || "";
    return make === currentMake.toUpperCase();
  }).length;

  const ratio = sameBrand / priorAircraft.length;
  if (ratio >= 0.7) return { score: ratio, level: "HIGH" };
  if (ratio >= 0.4) return { score: ratio, level: "MODERATE" };
  return { score: ratio, level: "LOW" };
}

function classifyOwnerArchetype(
  ownershipYears: number,
  priorAircraftCount: number,
  avgOwnershipYears: number,
  fleetSize: number,
  fleetTrend: "Expanding" | "Stable" | "Contracting"
): string {
  if (fleetSize >= 3 && fleetTrend !== "Contracting") {
    return "Fleet Operator";
  }
  if (priorAircraftCount >= 3 && avgOwnershipYears < 5) {
    return "Serial Upgrader";
  }
  if (ownershipYears > 10 || avgOwnershipYears > 8) {
    return "Long-Term Holder";
  }
  if (fleetTrend === "Contracting") {
    return "Consolidator";
  }
  if (priorAircraftCount <= 1) {
    return "Lifestyle Owner";
  }
  return "Opportunistic Seller";
}

export function computeDisposition(
  profile: AircraftProfile,
  fleetAircraft: FleetAircraft[] = [],
  priorAircraft: string[] = []
): OwnerIntelligence {
  const { years: ownershipYears, purchaseDate } = computeOwnershipAge(profile);
  const expectedCycle = getExpectedCycle(profile.categorySize || "mid");
  const cycleRatio = ownershipYears / expectedCycle;

  let replacementCycleStatus: "Early Ownership" | "Watch Zone" | "Replacement Window";
  if (cycleRatio < 0.6) replacementCycleStatus = "Early Ownership";
  else if (cycleRatio <= 1.0) replacementCycleStatus = "Watch Zone";
  else replacementCycleStatus = "Replacement Window";

  const avgOwnershipYears =
    priorAircraft.length > 0 ? Math.min(ownershipYears, 6.8) : ownershipYears;

  const brandLoyalty = computeBrandLoyalty(priorAircraft, profile.make);

  const fleetSize = fleetAircraft.length;
  const fleetTrend: "Expanding" | "Stable" | "Contracting" =
    fleetSize >= 3 ? "Stable" : fleetSize >= 1 ? "Stable" : "Contracting";

  const ownerArchetype = classifyOwnerArchetype(
    ownershipYears,
    priorAircraft.length,
    avgOwnershipYears,
    fleetSize,
    fleetTrend
  );

  const factors: DispositionFactor[] = [];

  let ownershipCycleScore: number;
  if (cycleRatio >= 1.2) ownershipCycleScore = 28;
  else if (cycleRatio >= 1.0) ownershipCycleScore = 24;
  else if (cycleRatio >= 0.8) ownershipCycleScore = 18;
  else if (cycleRatio >= 0.6) ownershipCycleScore = 12;
  else ownershipCycleScore = 5;

  factors.push({
    name: "Ownership Age vs Cycle",
    weight: 0.3,
    score: ownershipCycleScore,
    maxScore: 30,
    explanation: `${ownershipYears} years owned vs ${expectedCycle}-year expected cycle (ratio: ${cycleRatio.toFixed(2)}). Status: ${replacementCycleStatus}.`,
  });

  let behaviorScore: number;
  if (priorAircraft.length >= 3) behaviorScore = 16;
  else if (priorAircraft.length >= 1) behaviorScore = 10;
  else behaviorScore = 5;

  factors.push({
    name: "Historical Upgrade Behavior",
    weight: 0.2,
    score: behaviorScore,
    maxScore: 20,
    explanation:
      priorAircraft.length > 0
        ? `Owner has ${priorAircraft.length} prior aircraft. Pattern: ${ownerArchetype}.`
        : "No prior aircraft history available.",
  });

  let fleetScore: number;
  if (fleetTrend === "Contracting") fleetScore = 13;
  else if (fleetSize >= 3) fleetScore = 8;
  else fleetScore = 7;

  factors.push({
    name: "Fleet Expansion/Reduction",
    weight: 0.15,
    score: fleetScore,
    maxScore: 15,
    explanation: `Fleet size: ${fleetSize} aircraft. Trend: ${fleetTrend}.`,
  });

  let brandScore: number;
  if (brandLoyalty.level === "HIGH") brandScore = 12;
  else if (brandLoyalty.level === "MODERATE") brandScore = 8;
  else brandScore = 5;

  factors.push({
    name: "Brand Loyalty Upgrade Path",
    weight: 0.15,
    score: brandScore,
    maxScore: 15,
    explanation: `Brand loyalty: ${brandLoyalty.level} (${Math.round(brandLoyalty.score * 100)}%). ${brandLoyalty.level === "HIGH" ? "Likely to upgrade within same OEM." : "May consider cross-OEM options."}`,
  });

  let utilizationScore: number;
  const util = profile.utilizationSummary;
  if (!util || util.totalFlights === 0) {
    utilizationScore = 6;
  } else if (util.avgFlightsPerMonth < 5) {
    utilizationScore = 8;
  } else if (util.avgFlightsPerMonth > 30) {
    utilizationScore = 4;
  } else {
    utilizationScore = 5;
  }

  factors.push({
    name: "Utilization Trend",
    weight: 0.1,
    score: utilizationScore,
    maxScore: 10,
    explanation: util
      ? `${util.avgFlightsPerMonth.toFixed(1)} flights/month. ${util.avgFlightsPerMonth < 5 ? "Declining use often precedes listing." : "Active use suggests continued need."}`
      : "No utilization data available.",
  });

  let marketScore: number;
  if (profile.marketSignals.forSale) {
    marketScore = 8;
  } else {
    marketScore = 5;
  }

  factors.push({
    name: "Market Timing Alignment",
    weight: 0.1,
    score: marketScore,
    maxScore: 10,
    explanation: profile.marketSignals.forSale
      ? "Currently listed — already in sell cycle."
      : "Not currently listed.",
  });

  const sellProbability = factors.reduce((sum, f) => sum + f.score, 0);

  let windowLow: number;
  let windowHigh: number;
  if (sellProbability >= 75) {
    windowLow = 3;
    windowHigh = 9;
  } else if (sellProbability >= 55) {
    windowLow = 9;
    windowHigh = 18;
  } else if (sellProbability >= 35) {
    windowLow = 18;
    windowHigh = 36;
  } else {
    windowLow = 36;
    windowHigh = 60;
  }

  const confidence = Math.min(
    0.95,
    0.5 + (priorAircraft.length > 0 ? 0.15 : 0) + (fleetSize > 0 ? 0.1 : 0) + (profile.history.length > 0 ? 0.1 : 0) + (profile.utilizationSummary ? 0.1 : 0)
  );

  const upgradePattern =
    priorAircraft.length >= 2
      ? "Incremental OEM upgrades"
      : priorAircraft.length === 1
        ? "Single prior upgrade"
        : "No upgrade history";

  return {
    purchaseDate,
    ownershipYears,
    avgOwnershipYears,
    brandLoyalty: brandLoyalty.level,
    brandLoyaltyScore: brandLoyalty.score,
    priorAircraft,
    upgradePattern,
    sellProbability,
    predictedSellWindow: `${windowLow}-${windowHigh} months`,
    confidence,
    ownerArchetype,
    replacementCycleStatus,
    cycleRatio: Math.round(cycleRatio * 100) / 100,
    fleetSize,
    fleetAircraft,
    fleetTrend,
    explanationFactors: factors,
  };
}
