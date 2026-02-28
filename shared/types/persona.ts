export type PersonaId =
  | 'dealer_broker'
  | 'fbo'
  | 'mro'
  | 'charter'
  | 'fleet_management'
  | 'finance'
  | 'catering'
  | 'ground_transportation'
  | 'detailing';

export interface PersonaConfig {
  id: PersonaId;
  label: string;
  icon: string;
  coreMission: string;
  primaryContacts: string[];
  secondaryContacts: string[];
  dataPriorities: string[];
  reportTone: string;
  outreachEnabled: boolean;
  dashboardWidgets: string[];
}

export interface OutreachEmail {
  to: string[];
  subject: string;
  body: string;
}

export interface OutreachSMS {
  to: string[];
  body: string;
}

export interface PersonaIntelPayload {
  request: {
    personaId: PersonaId;
    mode: 'all';
    tone: string;
    maxOutreachLength: {
      emailWords: number;
      smsChars: number;
    };
  };
  aircraft: {
    regNbr: string;
    acid: number;
    model: string;
    year: number;
    serialNumber: string;
    make: string;
    category: string;
    engineType?: string;
    passengerCapacity?: number;
    range?: string;
    forSale?: boolean;
    weightClass?: string;
    lifecycleStatus?: string;
    baseCity?: string;
    baseCountry?: string;
    askingPrice?: string;
    daysOnMarket?: number;
  };
  companies: Array<{
    companyId: number;
    companyName: string;
    relationshipRole: string;
  }>;
  contacts: Array<{
    contactId: number;
    companyId: number;
    fullName: string;
    firstName: string;
    lastName: string;
    title: string;
    relationshipType: string;
    emails: string[];
    phones: {
      mobile?: string;
      work?: string;
    };
  }>;
  recommendations: Array<{
    contactId: number;
    companyId: number;
    relationshipType: string;
    tier: string;
    score: number;
    reasons: string[];
    preferredChannels: string[];
  }>;
  flightIntel: {
    available: boolean;
    totalFlights?: number;
    totalHours?: number;
    windowDays?: number;
    topRoutes?: Array<{ from: string; to: string; count: number }>;
    topAirports?: Array<{ code: string; count: number; role: string }>;
    estimatedHomeBase?: string;
    avgFlightsPerMonth?: number;
    notes?: string[];
  } | null;
  transactionsIntel: {
    available: boolean;
    transactions?: Array<{
      date: string;
      type: string;
      buyer?: string;
      seller?: string;
      price?: number;
    }>;
    lastSaleDate?: string;
    totalTransactions?: number;
  } | null;
  marketIntel: {
    available: boolean;
    modelForSaleCount?: number;
    avgAskingPrice?: number;
    avgDaysOnMarket?: number;
    recentComparables?: Array<{
      regNbr: string;
      saleDate: string;
      price: number;
    }>;
  } | null;
}

export interface PersonaIntelResponseBase {
  meta: {
    regNbr: string;
    personaId: PersonaId;
    mode: string;
    generatedAt: string;
  };
  executiveSummary: string[];
  personaTakeaways: string[];
  dataConfidence: {
    score: number;
    explanation: string[];
    missingData: string[];
  };
  whoToContactFirst: Array<{
    contactId: number;
    companyId: number;
    recommendedChannel: string;
    reason: string;
  }>;
  recommendedNextActions: string[];
  complianceNotes: string[];
}

export interface DealerBrokerResponse extends PersonaIntelResponseBase {
  brokerTakeaways: string[];
  marketContext?: {
    forSale: boolean;
    modelAvgAskingPrice?: number;
    modelAvgDaysOnMarket?: number;
    comparableCount?: number;
  };
  outreachDrafts: {
    emailPrimary: OutreachEmail;
    smsPrimary: OutreachSMS;
    emailOps: OutreachEmail;
  };
}

export interface FBOResponse extends PersonaIntelResponseBase {
  aircraftServiceProfile: {
    category: string;
    fuelType?: string;
    estimatedFuelCapacity?: string;
    cabinClass?: string;
    passengerCapacity?: number;
    hangarRequirements?: string;
  };
  visitPotential?: {
    topDestinations: Array<{ airport: string; frequency: number }>;
    estimatedVisitsPerQuarter?: number;
  };
  outreachDrafts: {
    emailCrew: OutreachEmail;
    smsCrew: OutreachSMS;
    emailPassenger: OutreachEmail;
  };
}

export interface MROResponse extends PersonaIntelResponseBase {
  maintenanceProfile: {
    aircraftAge: number;
    estimatedUtilization?: string;
    maintenanceWindowSignals: string[];
    recentSaleFlag: boolean;
    operatorFleetSize?: number;
  };
  outreachDrafts: {
    emailMaintenance: OutreachEmail;
    smsMaintenance: OutreachSMS;
    emailOperator: OutreachEmail;
  };
}

export interface CharterResponse extends PersonaIntelResponseBase {
  utilizationAnalysis: {
    flightsPerMonth?: number;
    activityRate?: string;
    routeConcentration?: string;
    deadLegIndicators?: string[];
  };
  charterMarketContext?: {
    forSale: boolean;
    operatorIdentified: boolean;
    managerIdentified: boolean;
  };
  outreachDrafts: {
    emailOperator: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}

export interface FleetManagementResponse extends PersonaIntelResponseBase {
  ownershipChainAnalysis: {
    layers: number;
    entities: string[];
    transparencyLevel: 'clear' | 'moderate' | 'opaque';
    gaps: string[];
  };
  utilizationBenchmark?: {
    thisAircraft: string;
    modelAverage?: string;
    assessment: string;
  };
  operationalAlerts: string[];
  assetValuationContext?: {
    modelMarketPosition: string;
    recentTransactionSignal?: string;
  };
}

export interface FinanceResponse extends PersonaIntelResponseBase {
  valuationContext: {
    modelForSaleCount?: number;
    avgAskingPrice?: number;
    avgDaysOnMarket?: number;
    comparableTransactions?: Array<{
      date: string;
      price?: number;
      regNbr?: string;
    }>;
    valuationAssessment: string;
  };
  kycAnalysis: {
    ownershipTransparency: 'clear' | 'moderate' | 'opaque' | 'insufficient_data';
    ownershipLayers: number;
    flightPatternAssessment: string;
    jurisdictionalNotes: string[];
    transactionVelocity: string;
  };
  complianceFlags: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'insufficient_data';
    detail: string;
  }>;
}

export interface CateringResponse extends PersonaIntelResponseBase {
  provisioningProfile: {
    passengerCapacity?: number;
    cabinClass?: string;
    estimatedOrderSize: string;
  };
  arrivalAnalysis?: {
    topAirports: Array<{ code: string; frequency: number }>;
    timeOfDayPattern?: string;
    mealWindowEstimate?: string;
  };
  outreachDrafts: {
    emailScheduler: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}

export interface GroundTransportResponse extends PersonaIntelResponseBase {
  destinationAnalysis?: {
    topAirports: Array<{ code: string; frequency: number }>;
    arrivalTimingPattern?: string;
  };
  passengerProfile: {
    aircraftCategory: string;
    estimatedServiceTier: string;
    recurringAccountPotential: string;
  };
  outreachDrafts: {
    emailEA: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}

export interface DetailingResponse extends PersonaIntelResponseBase {
  serviceProfile: {
    aircraftCategory: string;
    modelSize: string;
    estimatedJobScope: string;
  };
  homeBaseAnalysis?: {
    estimatedBase: string;
    confidence: string;
    basedOnFlights: number;
  };
  detailingCycleEstimate?: {
    flightFrequency: string;
    recommendedFrequency: string;
  };
  outreachDrafts: {
    emailOps: OutreachEmail;
    smsOps: OutreachSMS;
  };
}

export type PersonaIntelResponse =
  | DealerBrokerResponse
  | FBOResponse
  | MROResponse
  | CharterResponse
  | FleetManagementResponse
  | FinanceResponse
  | CateringResponse
  | GroundTransportResponse
  | DetailingResponse;
