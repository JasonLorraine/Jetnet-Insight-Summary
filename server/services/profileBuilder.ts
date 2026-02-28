import type { SessionState } from "../jetnet/session";
import {
  lookupByRegistration,
  getPictures,
  getRelationships,
  getFlightDataPaged,
  getHistoryListPaged,
  searchFleetByCompany,
  getCompanyList,
  getContactList,
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
  CompanyProfile,
  Contact,
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

function classifyContactRole(title: string | null): Contact["roleSignal"] {
  if (!title) return "Operational";
  const t = title.toLowerCase();
  if (
    t.includes("director") ||
    t.includes("vp") ||
    t.includes("vice president") ||
    t.includes("president") ||
    t.includes("ceo") ||
    t.includes("owner") ||
    t.includes("principal") ||
    t.includes("cfo") ||
    t.includes("coo") ||
    t.includes("managing") ||
    t.includes("chairman")
  ) {
    return "Decision Maker";
  }
  if (
    t.includes("pilot") ||
    t.includes("captain") ||
    t.includes("chief pilot") ||
    t.includes("aviation manager") ||
    t.includes("flight") ||
    t.includes("broker")
  ) {
    return "Influencer";
  }
  return "Operational";
}

function extractContacts(data: Record<string, unknown>): Contact[] {
  const items = (data as any)?.contactlistresult || (data as any)?.contacts || [];
  if (!Array.isArray(items)) return [];

  return items
    .map((c: any) => {
      const firstName = c.firstname || c.contactfirstname || "";
      const lastName = c.lastname || c.contactlastname || "";
      const name = [firstName, lastName].filter(Boolean).join(" ");
      if (!name) return null;

      const title = c.title || c.contacttitle || null;
      return {
        contactName: name,
        title,
        email: c.email || c.contactemail || null,
        phone: c.office || c.mobile || c.phone || null,
        roleSignal: classifyContactRole(title),
      } as Contact;
    })
    .filter(Boolean) as Contact[];
}

function extractCompanyProfile(data: Record<string, unknown>, companyId: number): CompanyProfile | null {
  const items = (data as any)?.companylistresult || (data as any)?.companies || [];
  const company = Array.isArray(items) ? items[0] : null;
  if (!company) return null;

  const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "https://evolution.jetnet.com";

  return {
    companyId,
    companyName: company.name || company.companyname || "Unknown",
    companyType: company.companytype || company.type || null,
    headquarters: {
      city: company.city || null,
      state: company.state || null,
      country: company.country || null,
    },
    industry: company.industry || company.siccode || null,
    evolutionLink: `${EVOLUTION_BASE_URL}/company/${companyId}`,
  };
}

function extractFleetAircraft(data: Record<string, unknown>, currentAircraftId: number): FleetAircraft[] {
  const items = (data as any)?.fleetresult || (data as any)?.fleet || [];
  if (!Array.isArray(items)) return [];

  const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "https://evolution.jetnet.com";

  return items
    .filter((ac: any) => {
      const id = ac.aircraftid || ac.aircraftId;
      return id && id !== currentAircraftId;
    })
    .map((ac: any) => ({
      registration: ac.regnbr || ac.registration || "N/A",
      aircraftId: ac.aircraftid || ac.aircraftId,
      make: ac.make || "Unknown",
      model: ac.model || "Unknown",
      yearMfr: ac.yearmfr || 0,
      serialNumber: ac.serialnbr || ac.sernbr || "",
      forSale: ac.forsale === true || ac.forsale === "Y" || String(ac.forsale).toLowerCase() === "y",
      evolutionLink: `${EVOLUTION_BASE_URL}/aircraft/${ac.aircraftid || ac.aircraftId}`,
    }))
    .slice(0, 20);
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

  const ownerRelFlat = flatRelationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );
  const ownerCompanyId = ownerRelFlat?.companyId || null;
  const ownerCompanyName = ownerRelFlat?.companyName || null;

  const [
    picturesData,
    relationshipsData,
    flightData,
    historyData,
    modelTrendsData,
    companyData,
    contactsData,
    fleetData,
  ] = await Promise.allSettled([
    getPictures(aircraftId, session),
    getRelationships(aircraftId, session),
    getFlightDataPaged(aircraftId, session),
    getHistoryListPaged(aircraftId, session),
    modelId ? fetchModelTrends(modelId, session) : Promise.reject("no modelId"),
    ownerCompanyId ? getCompanyList(ownerCompanyId, session) : Promise.reject("no companyId"),
    ownerCompanyId ? getContactList(ownerCompanyId, session) : Promise.reject("no companyId"),
    ownerCompanyName ? searchFleetByCompany(ownerCompanyName, session) : Promise.reject("no companyName"),
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

  const companyProfile: CompanyProfile | null =
    companyData.status === "fulfilled" && ownerCompanyId
      ? extractCompanyProfile(companyData.value, ownerCompanyId)
      : null;

  const contacts: Contact[] =
    contactsData.status === "fulfilled"
      ? extractContacts(contactsData.value)
      : [];

  const fleetAircraft: FleetAircraft[] =
    fleetData.status === "fulfilled"
      ? extractFleetAircraft(fleetData.value, aircraftId)
      : [];

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
    companyProfile,
    contacts,
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

  const priorAircraft = history
    .filter((h) => h.transactionType.toLowerCase().includes("sale"))
    .map((h) => h.description)
    .slice(0, 5);

  profile.ownerIntelligence = computeDisposition(
    profile,
    fleetAircraft,
    priorAircraft
  );

  return profile;
}
