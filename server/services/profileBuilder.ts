import type { SessionState } from "../jetnet/session";
import {
  lookupByRegistration,
  getAircraft,
  getPictures,
  getRelationships,
  getFlightDataPaged,
  getHistoryListPaged,
  searchFleetByCompany,
  getCompanyList,
  getContactList,
} from "../jetnet/api";
import { buildEvolutionAircraftLink, buildEvolutionCompanyLink } from "./evolutionLink";
import { computeHotNotScore } from "./scoring";
import { computeDisposition } from "./disposition";
import { fetchModelTrends } from "./modelTrends";
import type {
  AircraftProfile,
  AircraftSpecs,
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

function extractCompanyProfile(data: Record<string, unknown>, companyId: number, securityToken: string): CompanyProfile | null {
  const items = (data as any)?.companylistresult || (data as any)?.companies || [];
  const company = Array.isArray(items) ? items[0] : null;
  if (!company) return null;

  const pageUrl = company.pageurl || company.pageUrl || null;

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
    evolutionLink: buildEvolutionCompanyLink(companyId, securityToken, pageUrl),
  };
}

function extractSpecs(data: Record<string, unknown>): AircraftSpecs | null {
  const ac = (data as any)?.aircraftresult || data;
  if (!ac) return null;

  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const toBool = (v: unknown): boolean | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    if (s === "y" || s === "yes" || s === "true" || s === "1") return true;
    if (s === "n" || s === "no" || s === "false" || s === "0") return false;
    return null;
  };

  const specs: AircraftSpecs = {
    engineModel: ac.enginemodel || ac.enginemake || ac.engmodel || null,
    engineCount: toNum(ac.numberofengines || ac.enginecount || ac.nbrofengines),
    engineProgram: ac.engineprogram || ac.engprogram || null,
    apuModel: ac.apumodel || ac.apu || null,
    rangeNm: toNum(ac.range || ac.rangefull || ac.maxrange),
    maxSpeed: toNum(ac.maxspeed || ac.highspeed || ac.cruisespeed),
    mtow: toNum(ac.mtow || ac.maxrampwt || ac.maxtakeoffweight),
    fuelCapacity: toNum(ac.fuelcapacity || ac.maxfuel),
    cabinSeats: toNum(ac.seatcapacity || ac.paxseats || ac.cabinseats || ac.seats),
    cabinConfig: ac.cabinconfig || ac.interiorconfig || ac.interiordescription || null,
    avionicsSuite: ac.avionics || ac.avionicssuite || ac.cockpitavionics || null,
    wifiEquipped: toBool(ac.wifi || ac.wifiequipped || ac.wifionboard),
    totalLandings: toNum(ac.totallandings || ac.landings || ac.cycles),
    lastIntRefurb: ac.lastintrefurb || ac.interiorrefurb || ac.intrefurbyear || null,
    lastExtPaint: ac.lastextpaint || ac.extpaint || ac.extpaintyear || null,
    operationType: ac.operationtype || ac.optype || ac.part135 || null,
    certificate: ac.certificate || ac.typecertificate || null,
    noiseStage: ac.noisestage || ac.noise || null,
  };

  const hasAny = Object.values(specs).some((v) => v !== null);
  return hasAny ? specs : null;
}

function extractFleetAircraft(data: Record<string, unknown>, currentAircraftId: number, securityToken: string): FleetAircraft[] {
  const items = (data as any)?.fleetresult || (data as any)?.fleet || [];
  if (!Array.isArray(items)) return [];

  return items
    .filter((ac: any) => {
      const id = ac.aircraftid || ac.aircraftId;
      return id && id !== currentAircraftId;
    })
    .map((ac: any) => {
      const acId = ac.aircraftid || ac.aircraftId;
      const pageUrl = ac.pageurl || ac.pageUrl || null;
      return {
        registration: ac.regnbr || ac.registration || "N/A",
        aircraftId: acId,
        make: ac.make || "Unknown",
        model: ac.model || "Unknown",
        yearMfr: ac.yearmfr || 0,
        serialNumber: ac.serialnbr || ac.sernbr || "",
        forSale: ac.forsale === true || ac.forsale === "Y" || String(ac.forsale).toLowerCase() === "y",
        evolutionLink: buildEvolutionAircraftLink(acId, securityToken, pageUrl),
      };
    })
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
    fullAircraftData,
  ] = await Promise.allSettled([
    getPictures(aircraftId, session),
    getRelationships(aircraftId, session),
    getFlightDataPaged(aircraftId, session),
    getHistoryListPaged(aircraftId, session),
    modelId ? fetchModelTrends(modelId, session) : Promise.reject("no modelId"),
    ownerCompanyId ? getCompanyList(ownerCompanyId, session) : Promise.reject("no companyId"),
    ownerCompanyId ? getContactList(ownerCompanyId, session) : Promise.reject("no companyId"),
    ownerCompanyName ? searchFleetByCompany(ownerCompanyName, session) : Promise.reject("no companyName"),
    getAircraft(aircraftId, session),
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
      ? extractCompanyProfile(companyData.value, ownerCompanyId, session.apiToken)
      : null;

  const contacts: Contact[] =
    contactsData.status === "fulfilled"
      ? extractContacts(contactsData.value)
      : [];

  const fleetAircraft: FleetAircraft[] =
    fleetData.status === "fulfilled"
      ? extractFleetAircraft(fleetData.value, aircraftId, session.apiToken)
      : [];

  let specs: AircraftSpecs | null = null;
  if (fullAircraftData.status === "fulfilled") {
    specs = extractSpecs(fullAircraftData.value);
    const fullAc = (fullAircraftData.value as any)?.aircraftresult || fullAircraftData.value;
    if (fullAc?.pageurl || fullAc?.pageUrl) {
      ac.pageurl = fullAc.pageurl || fullAc.pageUrl;
    }
    if (!ac.estaftt && fullAc?.estaftt) {
      ac.estaftt = Number(fullAc.estaftt) || null;
    }
  }
  if (!specs) {
    specs = extractSpecs({ aircraftresult: ac });
  }

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
    specs,
    evolutionLink: buildEvolutionAircraftLink(aircraftId, session.apiToken, ac.pageurl || ac.pageUrl || null),
    estimatedAFTT: Number(ac.estaftt) || null,
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
