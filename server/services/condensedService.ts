import type { CondensedAircraftProfile } from "../../shared/types";

function nullIfZero(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) || num === 0 ? null : num;
}

function strOrNull(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val);
}

function lowercaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key.toLowerCase()] = obj[key];
  }
  return result;
}

export function normalizeCondensedRecord(rawInput: Record<string, unknown>): CondensedAircraftProfile {
  const raw = lowercaseKeys(rawInput);

  const eng1tt = nullIfZero(raw.eng1tt);
  const eng2tt = nullIfZero(raw.eng2tt);
  const eng3tt = nullIfZero(raw.eng3tt);
  const eng4tt = nullIfZero(raw.eng4tt);
  const engineTotalHours = eng1tt;

  const forSaleRaw = raw.asking ?? raw.forsale;
  const forSale =
    forSaleRaw === true ||
    String(forSaleRaw).toLowerCase() === "true" ||
    String(forSaleRaw).toLowerCase() === "for sale";

  return {
    aircraftId: Number(raw.acid ?? raw.aircraftid) || 0,
    regNbr: String(raw.regnbr || ""),
    serialNumber: String(raw.serialnbr ?? raw.serialnumber ?? ""),
    yearMfr: Number(raw.yearmfg ?? raw.yearmfr) || 0,
    make: String(raw.make || ""),
    model: String(raw.model || ""),
    modelId: Number(raw.modelid) || 0,

    aircraftType: String(raw.airframetype ?? raw.aircrafttype ?? ""),
    category: String(raw.categorysize ?? raw.category ?? ""),
    engineMake: strOrNull(raw.manufacturer ?? raw.enginemake),
    engineModel: strOrNull(raw.engmodel ?? raw.enginemodel),
    engineCount: nullIfZero(raw.enginecount) ?? (eng2tt != null ? (eng3tt != null ? (raw.eng4tt != null ? 4 : 3) : 2) : eng1tt != null ? 1 : null),
    maxPassengers: nullIfZero(raw.passgr ?? raw.maxpassengers),
    maxRange: nullIfZero(raw.maxrange),
    maxSpeed: nullIfZero(raw.maxspeed),
    mtow: nullIfZero(raw.mtow),
    cabinHeight: nullIfZero(raw.cabinheight),
    cabinWidth: nullIfZero(raw.cabinwidth),
    cabinLength: nullIfZero(raw.cabinlength),
    baggageCapacity: nullIfZero(raw.baggagecapacity),
    airframeTotalHours: nullIfZero(raw.aftt ?? raw.airframetotalhours),
    airframeTotalLandings: nullIfZero(raw.landings ?? raw.airframetotallandings),
    engineTotalHours: engineTotalHours,

    country: strOrNull(raw.basecountry ?? raw.country),
    state: strOrNull(raw.basestate ?? raw.state),
    city: strOrNull(raw.basecity ?? raw.city),
    basedAirport: strOrNull(raw.baseicao ?? raw.baseiata ?? raw.basedairport),
    lifecycle: strOrNull(raw.lifecycle),

    forSale,
    askingPrice: nullIfZero(raw.askingamt ?? raw.askingprice),
    daysOnMarket: nullIfZero(raw.daysonmarket),

    avionics: strOrNull(raw.avionics),
    interiorDate: strOrNull(raw.intyr ?? raw.interiordate),
    exteriorDate: strOrNull(raw.extyr ?? raw.exteriordate),
    lastInspectionType: strOrNull(raw.mxprog ?? raw.lastinspectiontype),
    lastInspectionDate: strOrNull(raw.timesasofdate ?? raw.lastinspectiondate),

    estimatedValue: nullIfZero(raw.evalue ?? raw.estimatedvalue),
    avgEstimatedValue: nullIfZero(raw.avgevalue ?? raw.averageestimatedvalue),
    weightClass: strOrNull(raw.weightclass),

    ownerCompanyName: strOrNull(raw.comp1name ?? raw.ownercompanyname),
    ownerCompanyId: nullIfZero(raw.comp1id ?? raw.ownercompanyid),
    operatorCompanyName: strOrNull(raw.comp2name ?? raw.operatorcompanyname),
    operatorCompanyId: nullIfZero(raw.comp2id ?? raw.operatorcompanyid),
    managerCompanyName: strOrNull(raw.chpilotcompname ?? raw.managercompanyname),
    managerCompanyId: nullIfZero(raw.chpilotcompid ?? raw.managercompanyid),
  };
}

function findKey(obj: Record<string, unknown>, target: string): string | undefined {
  const lower = target.toLowerCase();
  return Object.keys(obj).find((k) => k.toLowerCase() === lower);
}

export function normalizeCondensedResponse(
  raw: Record<string, unknown>
): CondensedAircraftProfile | null {
  const key = findKey(raw, "aircraftowneroperators");
  const records = key ? (raw as any)[key] : undefined;
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }
  return normalizeCondensedRecord(records[0]);
}
