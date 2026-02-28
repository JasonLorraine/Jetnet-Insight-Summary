# Flight Data: 12-Month Rolling Window Constraint
### Engineering Implementation Instructions
**Priority:** HIGH — Apply alongside Contact Enrichment fix
**Repo:** `https://github.com/JasonLorraine/Jetnet-Insight-Summary`

---

## Current Problem

The app is currently pulling flight data with no date constraint. The N413AF screenshots show a flight window of **8/14/2025 – 2/27/2026** (roughly 6 months), but this is incidental — the API is returning whatever it has, and other aircraft may return years of data. This creates three problems:

1. **Stale data pollutes analysis.** Flights from 3+ years ago reflect a different owner, operator, or usage pattern. Including them skews utilization calculations and route analysis.
2. **Performance.** Unconstrained flight queries on high-activity aircraft can return thousands of records across dozens of pages, slowing the app.
3. **Inconsistent comparisons.** If Aircraft A returns 6 months of data and Aircraft B returns 4 years, their "flights per month" averages are not comparable.

## Rule

**All flight data queries must be constrained to a 12-month rolling window: today minus 365 days.**

This applies to every persona, every search, every AI summary. No exceptions.

---

## Implementation

### The Endpoint

```
POST https://customer.jetnetconnect.com/api/Aircraft/getFlightDataPaged/{apiToken}/{pagesize}/{page}
Authorization: Bearer {bearerToken}
Content-Type: application/json
```

### Request Body — Current (Wrong)

If the app is currently sending something like this, it has no date constraint:

```json
{
  "aclist": [211461],
  "modlist": [],
  "startdate": "",
  "enddate": ""
}
```

Empty `startdate` and `enddate` means JETNET returns ALL available flight data — potentially years of records.

### Request Body — Correct (12-Month Window)

```json
{
  "aclist": [211461],
  "modlist": [],
  "startdate": "03/01/2025",
  "enddate": "02/28/2026"
}
```

### Date Format

JETNET requires `MM/DD/YYYY` with leading zeros. This is critical:

| Format | Valid? |
|--------|--------|
| `03/01/2025` | Yes |
| `3/1/2025` | **No — will fail or return unexpected results** |
| `2025-03-01` | **No — wrong format entirely** |

### Code

```typescript
// server/jetnet/flight-data.ts

function getFlightDateWindow(): { startdate: string; enddate: string } {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return {
    startdate: formatJetnetDate(oneYearAgo),
    enddate: formatJetnetDate(now),
  };
}

function formatJetnetDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Usage in the fetch pipeline
async function getFlightData(
  acid: number,
  apiToken: string,
  bearerToken: string
) {
  const { startdate, enddate } = getFlightDateWindow();
  const pagesize = 100;
  let page = 1;
  let allFlights: any[] = [];

  while (true) {
    const response = await fetch(
      `https://customer.jetnetconnect.com/api/Aircraft/getFlightDataPaged/${apiToken}/${pagesize}/${page}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aclist: [acid],
          modlist: [],
          startdate,
          enddate,
        }),
      }
    );

    const data = await response.json();

    // Check for JETNET error
    if (data.responsestatus && data.responsestatus.toUpperCase().includes('ERROR')) {
      console.error('JETNET getFlightData error:', data.responsestatus);
      break;
    }

    const flights = data.flightdata || [];
    allFlights = allFlights.concat(flights);

    // Pagination: stop when we've hit the last page
    if (page >= (data.maxpages || 1)) break;
    page++;
  }

  return allFlights;
}
```

### Building the Flight Intel Summary

After fetching, compute the summary object that feeds both the UI and the AI agent:

```typescript
interface FlightIntelSummary {
  available: boolean;
  totalFlights: number;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  avgFlightsPerMonth: number;
  topRoutes: Array<{ from: string; to: string; count: number }>;
  topAirports: Array<{ code: string; count: number; role: 'origin' | 'destination' | 'both' }>;
  estimatedHomeBase: string | null;
  notes: string[];
}

function buildFlightIntel(flights: any[]): FlightIntelSummary {
  if (!flights || flights.length === 0) {
    return {
      available: false,
      totalFlights: 0,
      windowDays: 365,
      windowStart: '',
      windowEnd: '',
      avgFlightsPerMonth: 0,
      topRoutes: [],
      topAirports: [],
      estimatedHomeBase: null,
      notes: ['No flight data available for the past 12 months.'],
    };
  }

  const { startdate, enddate } = getFlightDateWindow();
  const windowDays = 365;
  const totalFlights = flights.length;
  const avgFlightsPerMonth = Math.round((totalFlights / 12) * 10) / 10;

  // Top routes
  const routeCounts = new Map<string, number>();
  for (const f of flights) {
    const from = f.departureicao || f.departureairport || '';
    const to = f.arrivalicao || f.arrivalairport || '';
    if (from && to) {
      const key = `${from}-${to}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
    }
  }
  const topRoutes = Array.from(routeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => {
      const [from, to] = route.split('-');
      return { from, to, count };
    });

  // Top airports (origins and destinations combined)
  const airportCounts = new Map<string, { origin: number; destination: number }>();
  for (const f of flights) {
    const from = f.departureicao || f.departureairport || '';
    const to = f.arrivalicao || f.arrivalairport || '';
    if (from) {
      const entry = airportCounts.get(from) || { origin: 0, destination: 0 };
      entry.origin++;
      airportCounts.set(from, entry);
    }
    if (to) {
      const entry = airportCounts.get(to) || { origin: 0, destination: 0 };
      entry.destination++;
      airportCounts.set(to, entry);
    }
  }
  const topAirports = Array.from(airportCounts.entries())
    .map(([code, counts]) => ({
      code,
      count: counts.origin + counts.destination,
      role: (counts.origin > 0 && counts.destination > 0 ? 'both' :
             counts.origin > 0 ? 'origin' : 'destination') as 'origin' | 'destination' | 'both',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Home base estimation: airport with highest origin count
  const originCounts = Array.from(airportCounts.entries())
    .map(([code, counts]) => ({ code, origins: counts.origin }))
    .sort((a, b) => b.origins - a.origins);
  const estimatedHomeBase = originCounts.length > 0 ? originCounts[0].code : null;

  // Notes
  const notes: string[] = [];
  const missingDepartures = flights.filter(f => !f.departureicao && !f.departureairport).length;
  const missingArrivals = flights.filter(f => !f.arrivalicao && !f.arrivalairport).length;
  if (missingDepartures > 0) notes.push(`${missingDepartures} flights missing departure airport.`);
  if (missingArrivals > 0) notes.push(`${missingArrivals} flights missing destination airport.`);

  return {
    available: true,
    totalFlights,
    windowDays,
    windowStart: startdate,
    windowEnd: enddate,
    avgFlightsPerMonth,
    topRoutes,
    topAirports,
    estimatedHomeBase,
    notes,
  };
}
```

---

## UI Updates

### "Is it active?" Section

Update the Period display to always show the 12-month window and label it clearly:

**Current:**
```
TOTAL FLIGHTS    500
AVG/MONTH        76.0
PERIOD           8/14/2025 - 2/27/2026
```

**Updated:**
```
TOTAL FLIGHTS    500
AVG/MONTH        41.7
PERIOD           Last 12 months (03/01/2025 - 02/28/2026)
```

Note: If the current app is showing 500 flights with 76.0 avg/month over a 6.5-month window, constraining to 12 months may change these numbers. The 12-month window gives a more stable, comparable metric across aircraft.

### AI Summary Impact

When building the `PersonaIntelPayload` for the AI agent, always include the window metadata:

```json
"flightIntel": {
  "available": true,
  "totalFlights": 500,
  "windowDays": 365,
  "windowStart": "03/01/2025",
  "windowEnd": "02/28/2026",
  "avgFlightsPerMonth": 41.7,
  "topRoutes": [...],
  "topAirports": [...],
  "estimatedHomeBase": "KHPN",
  "notes": ["12-month rolling window"]
}
```

This way the AI agent knows the exact scope of the data and can make accurate statements like "Over the past 12 months, this aircraft averaged 41.7 flights per month" rather than vague references to an unknown time range.

---

## Persona-Specific Relevance

The 12-month window matters differently by persona:

| Persona | Why 12 months matters |
|---------|----------------------|
| Dealer/Broker | Utilization trend over a full year shows seasonal patterns and overall activity level — key sell signals |
| FBO | Full year captures seasonal visit patterns (snowbirds, summer travel) that 3 months would miss |
| MRO | 12 months of utilization better estimates maintenance cycle position than a partial window |
| Charter | Full year of route data reveals seasonal demand and dead-leg patterns |
| Fleet Management | Year-over-year benchmarking requires consistent 12-month windows |
| Finance | KYC flight pattern analysis needs a meaningful sample — 12 months avoids false flags from short windows |
| Catering | Seasonal arrival patterns only visible over a full year |
| Ground Transport | Same — seasonal destination patterns |
| Detailing | Flight frequency and home base estimation more accurate with 12-month sample |

---

## Edge Cases

### Aircraft with no flights in the past 12 months

Return:
```json
{
  "available": false,
  "totalFlights": 0,
  "windowDays": 365,
  "avgFlightsPerMonth": 0,
  "notes": ["No flight data available for the past 12 months."]
}
```

The UI should show:
```
📈 Is it active?
TOTAL FLIGHTS    0
STATUS           No recorded flights in the past 12 months
```

This is a meaningful signal, not an error. For a broker it may indicate storage, for an MRO it may signal an upcoming return-to-service event, for finance it may flag an inactive asset.

### Aircraft with very few flights (< 6 in 12 months)

Include a note:
```json
"notes": ["Low flight activity: 4 flights in 12 months. Limited route analysis possible."]
```

### JETNET returns fewer months than 12

Sometimes JETNET's flight data for an aircraft only goes back a few months (new registration, new tracking). The `windowDays` should reflect the actual data range, not 365:

```typescript
if (flights.length > 0) {
  const dates = flights
    .map(f => new Date(f.flightdate))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length > 0) {
    const actualWindowDays = Math.ceil(
      (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
    );
    // Use actual window for avg/month calculation
    const actualMonths = Math.max(actualWindowDays / 30.44, 1);
    const avgFlightsPerMonth = Math.round((totalFlights / actualMonths) * 10) / 10;
  }
}
```

Add a note when the actual data window is shorter than 12 months:
```json
"notes": ["Flight data available for 4 months (aircraft may be newly registered or recently tracked)."]
```

---

## Testing Checklist

- [ ] Verify `startdate` and `enddate` are sent in every `getFlightDataPaged` call
- [ ] Verify date format is `MM/DD/YYYY` with leading zeros (not `M/D/YYYY`, not ISO)
- [ ] Verify `startdate` is exactly 365 days before today
- [ ] Verify `enddate` is today
- [ ] Verify pagination works correctly with date-constrained queries
- [ ] Test with a high-activity aircraft — confirm data stops at 12 months back
- [ ] Test with an inactive aircraft — confirm graceful "0 flights" state
- [ ] Test with a newly registered aircraft — confirm shorter-than-12-month window is handled
- [ ] Verify `avgFlightsPerMonth` uses actual data window, not assumed 12 months
- [ ] Verify UI "Period" label reflects the 12-month window
- [ ] Verify AI payload includes `windowDays` and `windowStart`/`windowEnd`

---

*End of Flight Data Window Constraint Instructions*
