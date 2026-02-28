export interface FlightRecord {
  date: string;
  origin: string;
  destination: string;
  flightHours: number | null;
}

export interface FlightIntelligence {
  totalFlights: number;
  totalHours: number | null;
  avgFlightsPerMonth: number;
  avgHoursPerFlight: number | null;
  uniqueAirports: number;
  primaryBaseAirport: string | null;
  topRoutes: { route: string; count: number }[];
  monthlyBreakdown: { month: string; flights: number; hours: number | null }[];
  activityTrendSlope: "increasing" | "stable" | "declining";
  routeRepetitionScore: number;
  internationalRatio: number;
  downtimePeriods: { startDate: string; endDate: string; days: number }[];
  seasonalPattern: string | null;
  charterLikelihood: "low" | "medium" | "high";
  preSaleSignals: string[];
}

export function normalizeFlights(raw: Record<string, unknown>): FlightRecord[] {
  const items = (raw as any)?.flightdataresult || (raw as any)?.flights || [];
  if (!Array.isArray(items)) return [];

  return items
    .map((f: any) => {
      const dateStr = f.flightdate || f.date || f.departuredate || "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;

      return {
        date: d.toISOString().split("T")[0],
        origin: (f.departureairport || f.origin || f.departairport || f.depart || "").toUpperCase().trim(),
        destination: (f.arrivalairport || f.destination || f.arriveairport || f.arrive || "").toUpperCase().trim(),
        flightHours: f.flighthours != null ? Number(f.flighthours) || null : null,
      } as FlightRecord;
    })
    .filter(Boolean) as FlightRecord[];
}

export function analyzeFlights(flights: FlightRecord[]): FlightIntelligence {
  if (flights.length === 0) {
    return emptyIntelligence();
  }

  const sorted = [...flights].sort((a, b) => a.date.localeCompare(b.date));
  const totalFlights = sorted.length;

  const hoursArray = sorted.map((f) => f.flightHours).filter((h) => h !== null) as number[];
  const totalHours = hoursArray.length > 0 ? Math.round(hoursArray.reduce((s, h) => s + h, 0) * 10) / 10 : null;
  const avgHoursPerFlight = hoursArray.length > 0 ? Math.round((totalHours! / hoursArray.length) * 10) / 10 : null;

  const airports = new Set<string>();
  const airportCounts: Record<string, number> = {};
  const routeCounts: Record<string, number> = {};

  for (const f of sorted) {
    if (f.origin) {
      airports.add(f.origin);
      airportCounts[f.origin] = (airportCounts[f.origin] || 0) + 1;
    }
    if (f.destination) {
      airports.add(f.destination);
      airportCounts[f.destination] = (airportCounts[f.destination] || 0) + 1;
    }
    if (f.origin && f.destination) {
      const pair = [f.origin, f.destination].sort().join("-");
      routeCounts[pair] = (routeCounts[pair] || 0) + 1;
    }
  }

  const primaryBaseAirport = Object.entries(airportCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  const routeRepetitionScore = totalFlights > 0
    ? Math.round((topRoutes.reduce((s, r) => s + r.count, 0) / totalFlights) * 100)
    : 0;

  const monthMap = new Map<string, { flights: number; hours: number }>();
  for (const f of sorted) {
    const key = f.date.substring(0, 7);
    const entry = monthMap.get(key) || { flights: 0, hours: 0 };
    entry.flights++;
    if (f.flightHours) entry.hours += f.flightHours;
    monthMap.set(key, entry);
  }

  const monthlyBreakdown = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      flights: data.flights,
      hours: data.hours > 0 ? Math.round(data.hours * 10) / 10 : null,
    }));

  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const monthSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
  const avgFlightsPerMonth = Math.round((totalFlights / monthSpan) * 10) / 10;

  const activityTrendSlope = computeTrendSlope(monthlyBreakdown);

  let internationalCount = 0;
  for (const f of sorted) {
    if (f.origin && f.destination) {
      const oPrefix = f.origin.substring(0, 1);
      const dPrefix = f.destination.substring(0, 1);
      if (oPrefix !== dPrefix) internationalCount++;
    }
  }
  const internationalRatio = totalFlights > 0 ? Math.round((internationalCount / totalFlights) * 100) / 100 : 0;

  const downtimePeriods = findDowntimePeriods(sorted);

  const seasonalPattern = detectSeasonalPattern(monthlyBreakdown);

  const charterLikelihood = detectCharterLikelihood(sorted, airports.size, routeRepetitionScore);

  const preSaleSignals = detectPreSaleSignals(
    activityTrendSlope,
    downtimePeriods,
    monthlyBreakdown,
    avgFlightsPerMonth
  );

  return {
    totalFlights,
    totalHours,
    avgFlightsPerMonth,
    avgHoursPerFlight,
    uniqueAirports: airports.size,
    primaryBaseAirport,
    topRoutes,
    monthlyBreakdown,
    activityTrendSlope,
    routeRepetitionScore,
    internationalRatio,
    downtimePeriods,
    seasonalPattern,
    charterLikelihood,
    preSaleSignals,
  };
}

function computeTrendSlope(
  monthly: { month: string; flights: number }[]
): "increasing" | "stable" | "declining" {
  if (monthly.length < 3) return "stable";

  const half = Math.floor(monthly.length / 2);
  const firstHalf = monthly.slice(0, half);
  const secondHalf = monthly.slice(half);

  const avgFirst = firstHalf.reduce((s, m) => s + m.flights, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, m) => s + m.flights, 0) / secondHalf.length;

  const change = (avgSecond - avgFirst) / Math.max(1, avgFirst);
  if (change > 0.15) return "increasing";
  if (change < -0.15) return "declining";
  return "stable";
}

function findDowntimePeriods(sorted: FlightRecord[]): { startDate: string; endDate: string; days: number }[] {
  const gaps: { startDate: string; endDate: string; days: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date);
    const curr = new Date(sorted[i].date);
    const daysBetween = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (daysBetween >= 30) {
      gaps.push({
        startDate: sorted[i - 1].date,
        endDate: sorted[i].date,
        days: daysBetween,
      });
    }
  }
  return gaps.sort((a, b) => b.days - a.days).slice(0, 5);
}

function detectSeasonalPattern(monthly: { month: string; flights: number }[]): string | null {
  if (monthly.length < 6) return null;

  const monthAgg: Record<number, number[]> = {};
  for (const m of monthly) {
    const monthNum = parseInt(m.month.split("-")[1], 10);
    if (!monthAgg[monthNum]) monthAgg[monthNum] = [];
    monthAgg[monthNum].push(m.flights);
  }

  const avgByMonth: Record<number, number> = {};
  for (const [k, v] of Object.entries(monthAgg)) {
    avgByMonth[Number(k)] = v.reduce((s, n) => s + n, 0) / v.length;
  }

  const winterMonths = [11, 12, 1, 2, 3].filter((m) => avgByMonth[m] !== undefined);
  const summerMonths = [5, 6, 7, 8, 9].filter((m) => avgByMonth[m] !== undefined);

  if (winterMonths.length >= 2 && summerMonths.length >= 2) {
    const winterAvg = winterMonths.reduce((s, m) => s + (avgByMonth[m] || 0), 0) / winterMonths.length;
    const summerAvg = summerMonths.reduce((s, m) => s + (avgByMonth[m] || 0), 0) / summerMonths.length;

    if (winterAvg > summerAvg * 1.5) return "Winter-heavy (snowbird pattern)";
    if (summerAvg > winterAvg * 1.5) return "Summer-heavy";
  }

  return "No strong seasonal pattern";
}

function detectCharterLikelihood(
  flights: FlightRecord[],
  uniqueAirports: number,
  routeRepetitionScore: number
): "low" | "medium" | "high" {
  if (flights.length < 5) return "low";
  if (uniqueAirports > flights.length * 0.6 && routeRepetitionScore < 30) return "high";
  if (uniqueAirports > flights.length * 0.4 && routeRepetitionScore < 50) return "medium";
  return "low";
}

function detectPreSaleSignals(
  trend: string,
  downtimes: { days: number }[],
  monthly: { month: string; flights: number }[],
  avgPerMonth: number
): string[] {
  const signals: string[] = [];

  if (trend === "declining") {
    signals.push("Activity trend is declining — possible reduced owner interest");
  }

  const recentDowntime = downtimes.find((d) => d.days >= 60);
  if (recentDowntime) {
    signals.push(`Extended downtime of ${recentDowntime.days} days detected`);
  }

  if (monthly.length >= 3) {
    const lastThree = monthly.slice(-3);
    const lastThreeAvg = lastThree.reduce((s, m) => s + m.flights, 0) / 3;
    if (lastThreeAvg < avgPerMonth * 0.5 && avgPerMonth > 2) {
      signals.push("Recent 3-month activity well below average — possible pre-listing phase");
    }
  }

  if (monthly.length >= 2) {
    const lastMonth = monthly[monthly.length - 1];
    if (lastMonth.flights === 0) {
      signals.push("Zero flights in most recent month");
    }
  }

  return signals;
}

function emptyIntelligence(): FlightIntelligence {
  return {
    totalFlights: 0,
    totalHours: null,
    avgFlightsPerMonth: 0,
    avgHoursPerFlight: null,
    uniqueAirports: 0,
    primaryBaseAirport: null,
    topRoutes: [],
    monthlyBreakdown: [],
    activityTrendSlope: "stable",
    routeRepetitionScore: 0,
    internationalRatio: 0,
    downtimePeriods: [],
    seasonalPattern: null,
    charterLikelihood: "low",
    preSaleSignals: [],
  };
}
