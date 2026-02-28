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

export function normalizeCondensedRecord(raw: Record<string, unknown>): CondensedAircraftProfile {
  return {
    aircraftId: Number(raw.aircraftid) || 0,
    regNbr: String(raw.regnbr || ""),
    serialNumber: String(raw.serialnumber || ""),
    yearMfr: Number(raw.yearmfr) || 0,
    make: String(raw.make || ""),
    model: String(raw.model || ""),
    modelId: Number(raw.modelid) || 0,

    aircraftType: String(raw.aircrafttype || ""),
    category: String(raw.category || ""),
    engineMake: strOrNull(raw.enginemake),
    engineModel: strOrNull(raw.enginemodel),
    engineCount: nullIfZero(raw.enginecount),
    maxPassengers: nullIfZero(raw.maxpassengers),
    maxRange: nullIfZero(raw.maxrange),
    maxSpeed: nullIfZero(raw.maxspeed),
    mtow: nullIfZero(raw.mtow),
    cabinHeight: nullIfZero(raw.cabinheight),
    cabinWidth: nullIfZero(raw.cabinwidth),
    cabinLength: nullIfZero(raw.cabinlength),
    baggageCapacity: nullIfZero(raw.baggagecapacity),
    airframeTotalHours: nullIfZero(raw.airframetotalhours),
    airframeTotalLandings: nullIfZero(raw.airframetotallandings),
    engineTotalHours: nullIfZero(raw.enginetotalhours),

    country: strOrNull(raw.country),
    state: strOrNull(raw.state),
    city: strOrNull(raw.city),
    basedAirport: strOrNull(raw.basedairport),
    lifecycle: strOrNull(raw.lifecycle),

    forSale: String(raw.forsale).toLowerCase() === "true",
    askingPrice: nullIfZero(raw.askingprice),
    daysOnMarket: nullIfZero(raw.daysonmarket),

    avionics: strOrNull(raw.avionics),
    interiorDate: strOrNull(raw.interiordate),
    exteriorDate: strOrNull(raw.exteriordate),
    lastInspectionType: strOrNull(raw.lastinspectiontype),
    lastInspectionDate: strOrNull(raw.lastinspectiondate),

    ownerCompanyName: strOrNull(raw.ownercompanyname),
    ownerCompanyId: nullIfZero(raw.ownercompanyid),
    operatorCompanyName: strOrNull(raw.operatorcompanyname),
    operatorCompanyId: nullIfZero(raw.operatorcompanyid),
    managerCompanyName: strOrNull(raw.managercompanyname),
    managerCompanyId: nullIfZero(raw.managercompanyid),
  };
}

export function normalizeCondensedResponse(
  raw: Record<string, unknown>
): CondensedAircraftProfile | null {
  const records = (raw as any).aircraftowneroperators;
  if (!Array.isArray(records) || records.length === 0) return null;
  return normalizeCondensedRecord(records[0]);
}
