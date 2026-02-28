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

  const sd = startDate || formatDate(oneYearAgo);
  const ed = endDate || formatDate(now);
  const pageSize = 100;
  const maxPages = 5;
  let allRecords: any[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const result = await jetnetRequest(
      "POST",
      `/api/Aircraft/getFlightDataPaged/{apiToken}/${pageSize}/${page}`,
      session,
      {
        aclist: [aircraftId],
        modlist: [],
        startdate: sd,
        enddate: ed,
      }
    );

    const resultAny = result as any;
    let pageItems: any[] = [];

    const tryKeys = [
      "flightdataresult", "FlightDataResult",
      "flights", "flightdata", "FlightData",
      "result", "Result", "data", "Data",
    ];
    for (const key of tryKeys) {
      if (Array.isArray(resultAny[key])) {
        pageItems = resultAny[key];
        break;
      }
    }
    if (pageItems.length === 0 && !Array.isArray(resultAny)) {
      for (const key of Object.keys(resultAny)) {
        if (Array.isArray(resultAny[key]) && resultAny[key].length > 0) {
          pageItems = resultAny[key];
          break;
        }
      }
    }
    if (Array.isArray(resultAny)) {
      pageItems = resultAny;
    }

    allRecords = allRecords.concat(pageItems);
    console.log(`[flight-paging] page=${page} items=${pageItems.length} total=${allRecords.length}`);

    if (pageItems.length < pageSize) break;
  }

  return { flightdataresult: allRecords };
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

export async function getCompanyList(
  companyId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "POST",
    `/api/Company/getCompanyList/{apiToken}/100/1`,
    session,
    {
      companyid: companyId,
    }
  );
}

export async function getContactList(
  companyId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "POST",
    `/api/Contact/getContactList/{apiToken}/100/1`,
    session,
    {
      companyid: companyId,
    }
  );
}

export async function getAircraft(
  aircraftId: number,
  session: SessionState
): Promise<Record<string, unknown>> {
  return jetnetRequest(
    "GET",
    `/api/Aircraft/getAircraft/${aircraftId}/{apiToken}`,
    session
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
