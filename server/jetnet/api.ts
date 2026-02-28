import { SessionState, jetnetRequest } from "./session";

export async function lookupByRegistration(
  reg: string,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "GET",
    `/api/Aircraft/getRegNumber/${encodeURIComponent(reg)}/{apiToken}`,
    session
  );
}

export async function getPictures(
  aircraftId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "GET",
    `/api/Aircraft/getPictures/${aircraftId}/{apiToken}`,
    session
  );
}

export async function getRelationships(
  aircraftId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "POST",
    `/api/Aircraft/getRelationships/{apiToken}`,
    session,
    {
      aclist: [aircraftId],
      modlist: [],
    }
  );
}

export async function getFlightDataPaged(
  aircraftId: number,
  session: SessionState,
  startDate?: string,
  endDate?: string
): Promise<Record<string, unknown>> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  return jetnetRequest(
    "POST",
    `/api/Aircraft/getFlightDataPaged/{apiToken}/100/1`,
    session,
    {
      aclist: [aircraftId],
      modlist: [],
      startdate: startDate || formatDate(oneYearAgo),
      enddate: endDate || formatDate(now),
    }
  );
}

export async function getHistoryListPaged(
  aircraftId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  const now = new Date();
  const tenYearsAgo = new Date(now);
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const formatDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  return jetnetRequest(
    "POST",
    `/api/Aircraft/getHistoryListPaged/{apiToken}/100/1`,
    session,
    {
      aclist: [aircraftId],
      modlist: [],
      transtype: ["None"],
      startdate: formatDate(tenYearsAgo),
      enddate: formatDate(now),
    }
  );
}

export async function searchFleetByCompany(
  companyName: string,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "POST",
    `/api/Aircraft/getFleetPaged/{apiToken}/100/1`,
    session,
    {
      aclist: [],
      modlist: [],
      companyname: companyName,
    }
  );
}

export async function getMarketTrends(
  modelId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "GET",
    `/api/Aircraft/getMarketTrends/${modelId}/{apiToken}`,
    session
  );
}
