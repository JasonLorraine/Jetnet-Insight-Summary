export interface Relationship {
  companyId: number | null;
  companyName: string;
  relationType: string;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface FleetAircraft {
  registration: string;
  aircraftId: number;
  make: string;
  model: string;
  yearMfr: number;
  serialNumber: string;
  forSale: boolean;
  evolutionLink: string;
}

export interface OwnerIntelligence {
  purchaseDate: string | null;
  ownershipYears: number;
  avgOwnershipYears: number;
  brandLoyalty: "HIGH" | "MODERATE" | "LOW";
  brandLoyaltyScore: number;
  priorAircraft: string[];
  upgradePattern: string;
  sellProbability: number;
  predictedSellWindow: string;
  confidence: number;
  ownerArchetype: string;
  replacementCycleStatus: "Early Ownership" | "Watch Zone" | "Replacement Window";
  cycleRatio: number;
  fleetSize: number;
  fleetAircraft: FleetAircraft[];
  fleetTrend: "Expanding" | "Stable" | "Contracting";
  explanationFactors: DispositionFactor[];
}

export interface DispositionFactor {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ScoringFactor {
  name: string;
  weight: number;
  value: number;
  explanation: string;
}

export interface HotNotScore {
  score: number;
  label: "HOT" | "WARM" | "NEUTRAL" | "COLD";
  timeToSellEstimateDays: number;
  factors: ScoringFactor[];
  assumptions: string[];
  dataFreshness: {
    jetnetTokenValidatedAt: string;
    lookupsCompletedAt: string;
  };
}

export interface MarketSignals {
  forSale: boolean;
  askingPrice: string | null;
  daysOnMarket: number | null;
  marketStatus: string | null;
}

export interface UtilizationSummary {
  totalFlights: number;
  dateRange: string;
  avgFlightsPerMonth: number;
}

export interface AircraftPicture {
  url: string;
  caption: string | null;
}

export interface HistoryEntry {
  date: string;
  transactionType: string;
  description: string;
}

export interface CompanyProfile {
  companyId: number;
  companyName: string;
  companyType: string | null;
  headquarters: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  industry: string | null;
  evolutionLink: string;
}

export interface Contact {
  contactName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  roleSignal: "Decision Maker" | "Influencer" | "Operational";
}

export interface ModelTrendSignals {
  modelId: number;
  avgDaysOnMarket: number | null;
  inventoryTrend: "Increasing" | "Stable" | "Decreasing";
  domTrend: "Improving" | "Stable" | "Worsening";
  askingPriceTrend: "Rising" | "Flat" | "Falling";
  transactionVelocityTrend: "Increasing" | "Stable" | "Declining";
  marketHeatScore: number;
  marketHeatLabel: "Strong" | "Moderate" | "Weak";
}

export interface AircraftSpecs {
  engineModel: string | null;
  engineCount: number | null;
  engineProgram: string | null;
  apuModel: string | null;
  rangeNm: number | null;
  maxSpeed: number | null;
  mtow: number | null;
  fuelCapacity: number | null;
  cabinSeats: number | null;
  cabinConfig: string | null;
  avionicsSuite: string | null;
  wifiEquipped: boolean | null;
  totalLandings: number | null;
  lastIntRefurb: string | null;
  lastExtPaint: string | null;
  operationType: string | null;
  certificate: string | null;
  noiseStage: string | null;
}

export interface AircraftProfile {
  registration: string;
  aircraftId: number;
  modelId: number | null;
  make: string;
  model: string;
  series: string | null;
  yearMfr: number;
  yearDelivered: number;
  serialNumber: string;
  lifecycleStatus: string;
  usage: string;
  weightClass: string;
  categorySize: string;
  baseLocation: {
    icao: string | null;
    airport: string | null;
    city: string | null;
    country: string | null;
  };
  relationships: Relationship[];
  companyProfile: CompanyProfile | null;
  contacts: Contact[];
  pictures: AircraftPicture[];
  utilizationSummary: UtilizationSummary | null;
  marketSignals: MarketSignals;
  modelTrends: ModelTrendSignals | null;
  history: HistoryEntry[];
  ownerIntelligence: OwnerIntelligence | null;
  hotNotScore: HotNotScore | null;
  specs: AircraftSpecs | null;
  evolutionLink: string;
  estimatedAFTT: number | null;
}

export interface AISummary {
  summaryMarkdown: string;
  keyInsights: string[];
  redFlags: string[];
  suggestedNextQuestions: string[];
}

export interface AuthLoginRequest {
  jetnetEmail: string;
  jetnetPassword: string;
}

export interface AuthLoginResponse {
  appSessionToken: string;
  expiresAt: string;
}

export interface AISummaryRequest {
  provider: "openai" | "anthropic";
  apiKey: string;
  summaryStyle?: string;
  maxTokens?: number;
}
