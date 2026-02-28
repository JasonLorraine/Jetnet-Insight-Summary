import type { SessionState } from "../jetnet/session";
import {
  lookupByRegistration,
  getPictures,
  getRelationships,
  getFlightDataPaged,
  getHistoryListPaged,
} from "../jetnet/api";
import { buildEvolutionLink } from "./evolutionLink";
import { computeHotNotScore } from "./scoring";
import { computeDisposition } from "./disposition";
import { fetchModelTrends } from "./modelTrends";
import type {
  AircraftProfile,
  Relationship,
  AircraftPicture,
  HistoryEntry,
  UtilizationSummary,
  MarketSignals,
  ModelTrendSignals,
  FleetAircraft,
} from "../../shared/types";

function extractRelationships(data: Record<string, unknown>): Relationship[] {
  const results: Relationship[] = [];
  const items = (data as any)?.aircraftrelationshipresult || (data as any)?.relationships || [];

  if (Array.isArray(items)) {
    for (const item of items) {
      const rels = item.companyrelationships || item.relationships || [item];
      for (const rel of Array.isArray(rels) ? rels : [rels]) {
        results.push({
          companyId: rel.companyid || rel.companyId || null,
          companyName: rel.name || rel.companyname || rel.companyName || "Unknown",
          relationType: rel.relationtype || rel.companyrelation || rel.relationType || "Unknown",
          contactName: [rel.contactfirstname || rel.owrfname, rel.contactlastname || rel.owrlname].filter(Boolean).join(" ") || null,
          contactTitle: rel.title || rel.contacttitle || null,
          contactEmail: rel.email || rel.contactemail || null,
          contactPhone: rel.office || rel.mobile || rel.contactphone || null,
          city: rel.city || null,
          state: rel.state || null,
          country: rel.country || null,
        });
      }
    }
  }

  return results;
}

function extractRelationshipsFromFlat(ac: Record<string, unknown>): Relationship[] {
  const rels: Relationship[] = [];
  const companyRels = (ac as any).companyrelationships || [];
  if (Array.isArray(companyRels)) {
    for (const rel of companyRels) {
      rels.push({
        companyId: rel.companyid || null,
        companyName: rel.name || "Unknown",
        relationType: rel.companyrelation || "Unknown",
        contactName: [rel.owrfname, rel.owrlname].filter(Boolean).join(" ") || null,
        contactTitle: rel.title || null,
        contactEmail: rel.email || null,
        contactPhone: rel.office || rel.mobile || null,
        city: rel.city || null,
        state: rel.state || null,
        country: rel.country || null,
      });
    }
  }
  return rels;
}

function extractPictures(data: Record<string, unknown>): AircraftPicture[] {
  const pics = (data as any)?.pictureresult || (data as any)?.pictures || [];
  if (!Array.isArray(pics)) return [];

  return pics.map((p: any) => ({
    url: p.pictureurl || p.url || "",
    caption: p.caption || p.description || null,
  })).filter((p: AircraftPicture) => p.url);
}

function extractHistory(data: Record<string, unknown>): HistoryEntry[] {
  const items = (data as any)?.historylistresult || (data as any)?.history || [];
  if (!Array.isArray(items)) return [];

  return items.map((h: any) => ({
    date: h.transdate || h.date || "",
    transactionType: h.transtype || h.transactionType || "Unknown",
    description: h.description || h.transdesc || `${h.transtype || "Transaction"} - ${h.transdate || ""}`,
  }));
}

function extractUtilization(data: Record<string, unknown>): UtilizationSummary | null {
  const flights = (data as any)?.flightdataresult || (data as any)?.flights || [];
  if (!Array.isArray(flights) || flights.length === 0) return null;

  const totalFlights = flights.length;
  const dates = flights
    .map((f: any) => new Date(f.flightdate || f.date || ""))
    .filter((d: Date) => !isNaN(d.getTime()));

  if (dates.length < 2) {
    return {
      totalFlights,
      dateRange: "Last 12 months",
      avgFlightsPerMonth: totalFlights / 12,
    };
  }

  const earliest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
  const monthSpan = Math.max(1, (latest.getTime() - earliest.getTime()) / (30 * 24 * 60 * 60 * 1000));

  return {
    totalFlights,
    dateRange: `${earliest.toLocaleDateString()} - ${latest.toLocaleDateString()}`,
    avgFlightsPerMonth: Math.round((totalFlights / monthSpan) * 10) / 10,
  };
}

export async function buildAircraftProfile(
  registration: string,
  session: SessionState
): Promise<AircraftProfile> {
  const regData = await lookupByRegistration(registration, session);
  const ac = (regData as any).aircraftresult || regData;

  const aircraftId = ac.aircraftid || ac.aircraftId;
  if (!aircraftId) {
    throw new Error(`Aircraft not found for registration: ${registration}`);
  }

  const modelId: number | null = ac.modelid || ac.modelId || null;

  let flatRelationships = extractRelationshipsFromFlat(ac);

  const [picturesData, relationshipsData, flightData, historyData, modelTrendsData] =
    await Promise.allSettled([
      getPictures(aircraftId, session),
      getRelationships(aircraftId, session),
      getFlightDataPaged(aircraftId, session),
      getHistoryListPaged(aircraftId, session),
      modelId ? fetchModelTrends(modelId, session) : Promise.reject("no modelId"),
    ]);

  const pictures =
    picturesData.status === "fulfilled"
      ? extractPictures(picturesData.value)
      : [];

  let relationships = flatRelationships;
  if (relationshipsData.status === "fulfilled") {
    const enrichedRels = extractRelationships(relationshipsData.value);
    if (enrichedRels.length > 0) {
      relationships = enrichedRels;
    }
  }

  const history =
    historyData.status === "fulfilled"
      ? extractHistory(historyData.value)
      : [];

  const utilization =
    flightData.status === "fulfilled"
      ? extractUtilization(flightData.value)
      : null;

  const forSale = ac.forsale === true || ac.forsale === "Y" || ac.forsale === "true" || String(ac.forsale).toLowerCase() === "y";

  const marketSignals: MarketSignals = {
    forSale,
    askingPrice: ac.askingprice || null,
    daysOnMarket: ac.daysonmarket || null,
    marketStatus: ac.marketstatus || null,
  };

  const modelTrends: ModelTrendSignals | null =
    modelTrendsData.status === "fulfilled"
      ? (modelTrendsData.value as ModelTrendSignals)
      : null;

  const profile: AircraftProfile = {
    registration: ac.regnbr || registration,
    aircraftId,
    modelId,
    make: ac.make || "Unknown",
    model: ac.model || "Unknown",
    series: ac.series || null,
    yearMfr: ac.yearmfr || 0,
    yearDelivered: ac.yeardlv || ac.yearmfr || 0,
    serialNumber: ac.serialnbr || ac.sernbr || "",
    lifecycleStatus: ac.lifecycle || "Unknown",
    usage: ac.usage || "Unknown",
    weightClass: ac.weightclass || "Unknown",
    categorySize: ac.categorysize || "Unknown",
    baseLocation: {
      icao: ac.baseicao || null,
      airport: ac.baseairport || null,
      city: ac.basecity || null,
      country: ac.basecountry || null,
    },
    relationships,
    pictures,
    utilizationSummary: utilization,
    marketSignals,
    modelTrends,
    history,
    ownerIntelligence: null,
    hotNotScore: null,
    evolutionLink: buildEvolutionLink(aircraftId),
    estimatedAFTT: ac.estaftt || null,
  };

  profile.hotNotScore = computeHotNotScore(profile);

  const ownerRel = relationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );
  const priorAircraft = history
    .filter((h) => h.transactionType.toLowerCase().includes("sale"))
    .map((h) => h.description)
    .slice(0, 5);

  const fleetAircraft: FleetAircraft[] = [];

  profile.ownerIntelligence = computeDisposition(
    profile,
    fleetAircraft,
    priorAircraft
  );

  return profile;
}
