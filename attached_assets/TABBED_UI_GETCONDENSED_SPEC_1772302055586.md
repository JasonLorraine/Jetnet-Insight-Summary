# Aircraft Profile: Tabbed Experience + getCondensed Spec + Loading Design System
### Engineering + Design Handoff for Replit Build Team
**Priority:** HIGH — Core UX overhaul
**Repo:** `https://github.com/JasonLorraine/Jetnet-Insight-Summary`

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The New Experience](#2-the-new-experience)
3. [Data Waterfall Architecture](#3-data-waterfall-architecture)
4. [Tab 1: Overview](#4-tab-1-overview)
5. [Tab 2: Specs & Intel](#5-tab-2-specs--intel)
6. [Tab 3: Summary & Outreach](#6-tab-3-summary--outreach)
7. [getCondensedOwnerOperators Endpoint Spec](#7-getcondensedowneroperators-endpoint-spec)
8. [Loading Design System ("Thumb Suckers")](#8-loading-design-system)
9. [Design System: Typography, Color, Motion](#9-design-system)
10. [Component Specifications](#10-component-specifications)
11. [Persona-Aware Rendering](#11-persona-aware-rendering)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. The Problem

Today the Aircraft Profile is a single long scroll. Everything loads at once (or tries to), and when data is still fetching, sections either show stale placeholders ("Unknown Unknown") or jump into view abruptly. The user has no sense of progress, no hierarchy of information, and no clear path through the experience.

The current "Unknown Unknown" location shown in the N413AF screenshots is the opposite of graceful. It looks broken. We need to fix this at a fundamental level.

---

## 2. The New Experience

Three tabs. Progressive disclosure. Data arrives in waves, and the UI communicates every state transition with intention.

```
┌─────────────────────────────────────────────────────┐
│  ← Aircraft Profile                          ⚙️     │
│                                                     │
│  ✈️ N413AF                                          │
│  2024 Pilatus PC-12 NGX · S/N 2413                 │
│                                                     │
│  ┌───────────┬───────────────┬──────────────────┐   │
│  │ Overview  │  Specs & Intel │  Summary         │   │
│  │  ●        │               │                  │   │
│  └───────────┴───────────────┴──────────────────┘   │
│                                                     │
│           [ Tab content area ]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab Architecture

| Tab | Name | Data Source | Loads When | Purpose |
|-----|------|------------|-----------|---------|
| 1 | **Overview** | `getRegNumber` | Instantly (first API response) | Identity, ownership headline, activity status, photos |
| 2 | **Specs & Intel** | `getCondensedOwnerOperators` + `getRelationships` + `getFlightDataPaged` | ACID available (~1s) | Full aircraft specs, contacts, flight patterns, market data |
| 3 | **Summary** | AI agent response | User taps tab or "Generate" | Persona-shaped AI analysis, outreach drafts, recommendations |

### Loading Philosophy

The user should never see a blank screen, a spinner in the middle of nowhere, or the word "Loading." Instead:

1. **Tab 1 appears instantly** with the getRegNumber data (tail, model, year, serial, operator name, for-sale status). This is the data you already have.
2. **Tab 2 shows skeleton states** immediately. As getCondensed, getRelationships, and getFlightData resolve, sections animate in. Each section transitions independently — specs might fill in before contacts.
3. **Tab 3 shows a clear CTA** — "Generate AI Summary" — or auto-generates when the user navigates to it (if all data is ready). Shows a purpose-built generating animation while the AI works.

---

## 3. Data Waterfall Architecture

```
Time →

0ms     getRegNumber fires
        ↓
~400ms  Response arrives → Tab 1 renders instantly
        ↓ ACID extracted
        ↓
~500ms  Parallel batch fires:
        ├── getCondensedOwnerOperators (ACID)
        ├── getRelationships (ACID)
        ├── getPictures (ACID)
        │
~1500ms getFlightDataPaged fires (1s delay for cache warm-up)
        │
~800ms  getPictures resolves → photos slide into Tab 1
~1200ms getCondensed resolves → specs populate Tab 2
~1500ms getRelationships resolves → contacts populate Tab 2
        │
~2500ms getFlightData resolves → flight section populates Tab 2
        │
        All data ready → Tab 3 can generate AI summary
```

### Server Implementation

```typescript
// server/routes/aircraft-profile.ts

// Phase 1: Instant response
router.get('/api/aircraft/lookup/:regNbr', async (req, res) => {
  const result = await jetnet.getRegNumber(req.params.regNbr);
  res.json({
    phase: 1,
    aircraft: normalizeRegNumberResponse(result),
    acid: result.aircraftresult?.aircraftid,
  });
});

// Phase 2: Enrichment (client calls after receiving ACID)
router.get('/api/aircraft/enrich/:acid', async (req, res) => {
  const acid = parseInt(req.params.acid);

  // Fire getCondensed + getRelationships + getPictures in parallel
  const [condensed, relationships, pictures] = await Promise.all([
    jetnet.getCondensedOwnerOperators(acid),
    jetnet.getRelationships(acid),
    jetnet.getPictures(acid),
  ]);

  res.json({
    phase: 2,
    condensed: normalizeCondensedResponse(condensed),
    relationships: normalizeRelationships(relationships),
    pictures: normalizePictures(pictures),
  });
});

// Phase 3: Flight data (client calls ~1s after enrichment fires)
router.get('/api/aircraft/flights/:acid', async (req, res) => {
  const acid = parseInt(req.params.acid);
  const flights = await jetnet.getFlightDataPaged(acid, get12MonthWindow());

  res.json({
    phase: 3,
    flightIntel: buildFlightIntel(flights),
  });
});

// Phase 4: AI Summary (client calls when user requests or navigates to Tab 3)
router.post('/api/aircraft/summary', async (req, res) => {
  const { personaId, payload } = req.body;
  const summary = await agentDispatcher.dispatch(personaId, payload);

  res.json({
    phase: 4,
    summary,
  });
});
```

### Client Orchestration

```typescript
// hooks/useAircraftProfile.ts

function useAircraftProfile(regNbr: string) {
  const [phase1, setPhase1] = useState(null);  // getRegNumber
  const [phase2, setPhase2] = useState(null);  // getCondensed + relationships + pictures
  const [phase3, setPhase3] = useState(null);  // flights
  const [phase4, setPhase4] = useState(null);  // AI summary

  useEffect(() => {
    // Phase 1: Instant
    api.lookup(regNbr).then(data => {
      setPhase1(data);

      // Phase 2: Enrichment (immediate after ACID)
      api.enrich(data.acid).then(setPhase2);

      // Phase 3: Flights (1s delay)
      setTimeout(() => {
        api.flights(data.acid).then(setPhase3);
      }, 1000);
    });
  }, [regNbr]);

  return {
    aircraft: phase1?.aircraft,
    acid: phase1?.acid,
    condensed: phase2?.condensed,
    relationships: phase2?.relationships,
    pictures: phase2?.pictures,
    flightIntel: phase3?.flightIntel,
    summary: phase4?.summary,
    generateSummary: (personaId, payload) =>
      api.summary(personaId, payload).then(setPhase4),
    // Loading states
    isPhase1Loading: !phase1,
    isPhase2Loading: !phase2,
    isPhase3Loading: !phase3,
    isPhase4Loading: false, // only true when user requests
  };
}
```

---

## 4. Tab 1: Overview

**Data source:** `getRegNumber` (already working)
**Loads:** Instantly on search

This tab is the "first impression" — fast, clean, and confident. It answers the three questions every persona asks first: What is it? Who has it? Is it active?

### Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │         [Aircraft Photo]            │    │  ← Skeleton shimmer until
│  │         or Type Silhouette          │    │    getPictures resolves
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  N413AF                                     │  ← Large, confident type
│  2024 Pilatus PC-12 NGX                     │  ← Model + year
│  S/N 2413                                   │  ← Serial number
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  OPERATOR                           │    │
│  │  Alpha Flying, Inc.                 │    │
│  │  ─────────────────────────          │    │
│  │  CATEGORY        Turboprop          │    │
│  │  MAKE            Pilatus            │    │
│  │  STATUS          Active             │    │
│  │  FOR SALE        No                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🔗 Open in JETNET Evolution    →   │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### What NOT to show on Tab 1

- No sell probability (that's analysis — Tab 3)
- No disposition factors (analysis — Tab 3)
- No contacts (enrichment — Tab 2)
- No flight data (enrichment — Tab 2)
- No specs beyond what getRegNumber provides

Tab 1 is fast because it only shows what you already have. Everything else loads behind the scenes for Tab 2.

### Photo Handling

- If `getPictures` hasn't resolved yet: Show a **type silhouette** placeholder (generic jet/turboprop/helicopter outline in a muted tone) with a subtle shimmer animation
- If `getPictures` resolves with images: Crossfade the first image in. No jump cut.
- If no photos available: Show the type silhouette with a small "No photos available" label beneath

---

## 5. Tab 2: Specs & Intel

**Data sources:** `getCondensedOwnerOperators` + `getRelationships` + `getFlightDataPaged`
**Loads:** Progressive — each section fills as its data arrives

This is the depth tab. It has four sections that load independently.

### Section Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─ AIRCRAFT SPECIFICATIONS ────────────┐   │
│  │                                      │   │  ← From getCondensed
│  │  Range         1,803 nm              │   │
│  │  Max Speed     290 ktas              │   │
│  │  Passengers    9                     │   │
│  │  Engines       1× PT6A-67P          │   │
│  │  MTOW          10,450 lb            │   │
│  │  Cabin H/W/L   4.9 × 5.0 × 16.9 ft │   │
│  │  Baggage       40 cu ft             │   │
│  │                                      │   │
│  │  REGISTRATION                        │   │
│  │  Country       United States         │   │
│  │  Reg Authority FAA                   │   │
│  │  Base          KHPN                  │   │
│  │  Lifecycle     In Operation          │   │
│  │                                      │   │
│  │  CONFIGURATION                       │   │
│  │  Avionics      Honeywell Primus Apex │   │
│  │  Interior      2022 Refurb           │   │
│  │  Exterior      2022 Repaint          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ WHO'S INVOLVED ────────────────────┐    │
│  │                                     │    │  ← From getRelationships
│  │  [Company cards + Contact cards]    │    │
│  │  [Bucketed by tier]                 │    │
│  │  [With Call / Text / Email actions] │    │
│  │                                     │    │
│  │  [📋 Copy Contact Pack]            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ FLIGHT ACTIVITY (12 months) ───────┐    │
│  │                                     │    │  ← From getFlightData
│  │  Total Flights    500               │    │
│  │  Avg / Month      41.7             │    │
│  │  Home Base        KHPN (est.)      │    │
│  │                                     │    │
│  │  TOP ROUTES                         │    │
│  │  KHPN → KPBI    ████████  12       │    │
│  │  KHPN → KTEB    ██████    8        │    │
│  │  KPBI → KHPN    █████     7        │    │
│  │                                     │    │
│  │  TOP AIRPORTS                       │    │
│  │  KHPN  ████████████████  89        │    │
│  │  KPBI  ██████████        42        │    │
│  │  KTEB  ████████          31        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ MARKET CONTEXT ────────────────────┐    │
│  │                                     │    │  ← From getCondensed
│  │  For Sale       No                  │    │    (forSale, askingPrice, etc.)
│  │  Days on Market —                   │    │
│  │  Model Avg Ask  $5.8M              │    │    ← Only if persona needs it
│  │  Fleet For Sale 14 of 198          │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Independent Loading

Each section has its own loading state. When data arrives, that section transitions from skeleton to content independently:

```
[Specs section]      skeleton → content  (when getCondensed resolves)
[Contacts section]   skeleton → content  (when getRelationships resolves)
[Flight section]     skeleton → content  (when getFlightData resolves)
[Market section]     skeleton → content  (when getCondensed resolves, same as Specs)
```

---

## 6. Tab 3: Summary & Outreach

**Data source:** AI agent response
**Loads:** On user action (tap "Generate") or auto-generates when user navigates to tab and all data is ready

### Pre-Generation State

When the user taps Tab 3 before a summary exists:

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│           ┌──────────────────┐              │
│           │                  │              │
│           │   ✦  ✦  ✦       │              │
│           │                  │              │
│           │   AI Analysis    │              │
│           │                  │              │
│           └──────────────────┘              │
│                                             │
│  Your [Broker] analysis for N413AF          │
│  is ready to generate.                      │
│                                             │
│  Includes:                                  │
│  • Executive summary                        │
│  • Who to contact first                     │
│  • Outreach drafts (email + SMS)            │
│  • Recommended next actions                 │
│  • Data confidence assessment               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     ✦  Generate Analysis            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Uses data from Tabs 1 & 2.                │
│  2 of 3 data sources loaded.               │
│  [████████████░░] Waiting for flights...   │
│                                             │
└─────────────────────────────────────────────┘
```

### Generating State

Once the user taps Generate (or it auto-fires):

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│              ╭─────────────╮                │
│              │             │                │
│              │  [Animated  │                │
│              │   orb/pulse]│                │
│              │             │                │
│              ╰─────────────╯                │
│                                             │
│     Analyzing N413AF as a Broker...         │
│                                             │
│     ┌──────────────────────────────┐        │
│     │ ✓ Aircraft identity          │        │
│     │ ✓ Ownership chain            │        │
│     │ ◌ Flight patterns            │        │  ← Animated checklist
│     │ ◌ Contact ranking            │        │
│     │ ◌ Drafting outreach          │        │
│     └──────────────────────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

The animated checklist progresses on a timed sequence (not tied to real AI progress, since Claude returns all at once). This gives the user a sense of the work being done:

```typescript
const ANALYSIS_STEPS = [
  { label: 'Aircraft identity', delay: 0 },
  { label: 'Ownership chain', delay: 800 },
  { label: 'Flight patterns', delay: 1600 },
  { label: 'Contact ranking', delay: 2400 },
  { label: 'Drafting outreach', delay: 3200 },
];
```

### Generated State

Once the AI response arrives, the content reveals section by section with staggered animation:

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─ EXECUTIVE SUMMARY ─────────────────┐    │
│  │                                     │    │
│  │  • N413AF is a 2024 PC-12 NGX      │    │
│  │    operated by Alpha Flying, Inc.   │    │
│  │  • High utilization (42 flights/mo) │    │
│  │  • Not currently listed for sale    │    │
│  │  • Operator contact identified      │    │
│  │  • No transaction history available │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ BROKER TAKEAWAYS ──────────────────┐    │
│  │                                     │    │
│  │  1. High utilization suggests       │    │
│  │     continued operational need      │    │
│  │  2. Contact Chief Pilot for ops     │    │
│  │     intelligence on future plans    │    │
│  │  3. Serial Upgrader archetype —     │    │
│  │     monitor for replacement cycle   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ CONTACT FIRST ─────────────────────┐    │
│  │                                     │    │
│  │  John Smith · Chief Pilot           │    │
│  │  Alpha Flying, Inc.                 │    │
│  │  📧  via email (recommended)        │    │
│  │                                     │    │
│  │  "Operator relationship, Chief      │    │
│  │   Pilot title, email available"     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ OUTREACH DRAFTS ──────────────────┐     │
│  │                                    │     │
│  │  EMAIL                             │     │
│  │  To: jsmith@alphaflying.com        │     │
│  │  Subject: Quick question on N413AF │     │
│  │  ┌────────────────────────────┐    │     │
│  │  │ Hi John — I am reaching    │    │     │
│  │  │ out about N413AF...        │    │     │
│  │  └────────────────────────────┘    │     │
│  │  [📧 Open in Mail] [📋 Copy]      │     │
│  │                                    │     │
│  │  SMS                               │     │
│  │  To: (917) 555-1111                │     │
│  │  ┌────────────────────────────┐    │     │
│  │  │ Hi John — quick question   │    │     │
│  │  │ on N413AF. Do you have...  │    │     │
│  │  └────────────────────────────┘    │     │
│  │  [💬 Open in Messages] [📋 Copy]  │     │
│  └────────────────────────────────────┘     │
│                                             │
│  ┌─ NEXT ACTIONS ──────────────────────┐    │
│  │  1. Email John Smith re: N413AF     │    │
│  │  2. Research Alpha Flying fleet     │    │
│  │  3. Monitor for listing changes     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ DATA CONFIDENCE ──────────────────┐     │
│  │                                    │     │
│  │  ┌──────────────────────────┐      │     │
│  │  │ ████████████████░░░  72  │      │     │
│  │  └──────────────────────────┘      │     │
│  │                                    │     │
│  │  • Contact data available          │     │
│  │  • Flight data available (12 mo)   │     │
│  │  ⚠ Transaction history missing     │     │
│  │  ⚠ Market trends not available     │     │
│  └────────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 7. getCondensedOwnerOperators Endpoint Spec

### Endpoint

```
POST https://customer.jetnetconnect.com/api/Aircraft/getCondensedOwnerOperatorsPaged/{apiToken}/{pagesize}/{page}
Authorization: Bearer {bearerToken}
Content-Type: application/json
```

This is a **paged** endpoint. Response key is `aircraftowneroperators`.

### Request Body

```json
{
  "aclist": [211461],
  "modlist": [],
  "makeType": "None",
  "airframeType": "None",
  "lifecycle": "None",
  "forsale": "",
  "countrylist": [],
  "regionlist": [],
  "startdate": "",
  "enddate": ""
}
```

For a single aircraft lookup, pass the ACID in `aclist`. Leave all other filters empty/default.

### Expected Response Structure

The response key is `aircraftowneroperators`. Each record is a denormalized row combining aircraft specs with owner/operator data:

```json
{
  "aircraftowneroperators": [
    {
      "aircraftid": 211461,
      "regnbr": "N413AF",
      "serialnumber": "2413",
      "yearmfr": 2024,
      "make": "PILATUS",
      "model": "PC-12 NGX",
      "modelid": 892,

      "aircrafttype": "Turboprop",
      "category": "Turboprop",
      "enginemake": "Pratt & Whitney Canada",
      "enginemodel": "PT6A-67P",
      "enginecount": 1,

      "maxpassengers": 9,
      "maxrange": 1803,
      "maxspeed": 290,
      "mtow": 10450,
      "cabinheight": 4.9,
      "cabinwidth": 5.0,
      "cabinlength": 16.9,
      "baggagecapacity": 40,

      "country": "United States",
      "state": "NY",
      "city": "White Plains",
      "basedairport": "KHPN",
      "lifecycle": "In Operation",

      "forsale": "false",
      "askingprice": null,
      "daysonmarket": null,

      "avionics": "Honeywell Primus Apex",
      "interiordate": "2022",
      "exteriordate": "2022",
      "lastinspectiontype": "Annual",
      "lastinspectiondate": "06/15/2025",

      "ownercompanyname": "N413AF LLC",
      "ownercompanyid": 99001,
      "operatorcompanyname": "Alpha Flying, Inc.",
      "operatorcompanyid": 12345,
      "managercompanyname": "",
      "managercompanyid": null,

      "airframetotalhours": 1250,
      "airframetotallandings": 980,
      "enginetotalhours": 1250
    }
  ],
  "count": 1,
  "maxpages": 1,
  "responsestatus": "SUCCESS: PAGE [ 1 of 1 ]"
}
```

### Field Mapping for UI

**Note:** Not all fields are guaranteed. Many will be null or empty for any given aircraft. The UI must handle every field being absent.

#### Aircraft Specifications Card

| UI Label | Response Field | Unit | Fallback |
|----------|---------------|------|----------|
| Range | `maxrange` | nm | — |
| Max Speed | `maxspeed` | ktas | — |
| Passengers | `maxpassengers` | — | — |
| Engines | `enginecount` × `enginemodel` | — | `enginemake` only |
| MTOW | `mtow` | lb | — |
| Cabin Height | `cabinheight` | ft | — |
| Cabin Width | `cabinwidth` | ft | — |
| Cabin Length | `cabinlength` | ft | — |
| Baggage | `baggagecapacity` | cu ft | — |
| Airframe Hours | `airframetotalhours` | hrs | — |
| Airframe Landings | `airframetotallandings` | — | — |
| Engine Hours | `enginetotalhours` | hrs | — |

#### Registration & Status Card

| UI Label | Response Field | Fallback |
|----------|---------------|----------|
| Country | `country` | — |
| State | `state` | — |
| City | `city` | — |
| Based Airport | `basedairport` | — |
| Lifecycle | `lifecycle` | — |
| For Sale | `forsale` | — |
| Asking Price | `askingprice` | — |
| Days on Market | `daysonmarket` | — |

#### Configuration Card

| UI Label | Response Field | Fallback |
|----------|---------------|----------|
| Avionics | `avionics` | — |
| Interior | `interiordate` | — |
| Exterior | `exteriordate` | — |
| Last Inspection | `lastinspectiontype` + `lastinspectiondate` | — |

#### Ownership Summary

| UI Label | Response Field | Fallback |
|----------|---------------|----------|
| Owner | `ownercompanyname` | — |
| Operator | `operatorcompanyname` | — |
| Manager | `managercompanyname` | — |

### Implementation

```typescript
// server/jetnet/condensed.ts

async function getCondensedOwnerOperators(
  acid: number,
  apiToken: string,
  bearerToken: string
): Promise<CondensedAircraftProfile | null> {
  const response = await fetch(
    `https://customer.jetnetconnect.com/api/Aircraft/getCondensedOwnerOperatorsPaged/${apiToken}/10/1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aclist: [acid],
        modlist: [],
        makeType: 'None',
        airframeType: 'None',
        lifecycle: 'None',
        forsale: '',
        countrylist: [],
        regionlist: [],
        startdate: '',
        enddate: '',
      }),
    }
  );

  const data = await response.json();

  if (data.responsestatus?.toUpperCase().includes('ERROR')) {
    console.error('JETNET getCondensed error:', data.responsestatus);
    return null;
  }

  const records = data.aircraftowneroperators || [];
  if (records.length === 0) return null;

  // Take the first record (single aircraft lookup)
  return normalizeCondensedRecord(records[0]);
}

interface CondensedAircraftProfile {
  // Identity
  aircraftId: number;
  regNbr: string;
  serialNumber: string;
  yearMfr: number;
  make: string;
  model: string;
  modelId: number;

  // Specs
  aircraftType: string;
  category: string;
  engineMake: string | null;
  engineModel: string | null;
  engineCount: number | null;
  maxPassengers: number | null;
  maxRange: number | null;       // nm
  maxSpeed: number | null;       // ktas
  mtow: number | null;           // lb
  cabinHeight: number | null;    // ft
  cabinWidth: number | null;     // ft
  cabinLength: number | null;    // ft
  baggageCapacity: number | null; // cu ft
  airframeTotalHours: number | null;
  airframeTotalLandings: number | null;
  engineTotalHours: number | null;

  // Location & Status
  country: string | null;
  state: string | null;
  city: string | null;
  basedAirport: string | null;
  lifecycle: string | null;

  // Market
  forSale: boolean;
  askingPrice: number | null;
  daysOnMarket: number | null;

  // Configuration
  avionics: string | null;
  interiorDate: string | null;
  exteriorDate: string | null;
  lastInspectionType: string | null;
  lastInspectionDate: string | null;

  // Ownership
  ownerCompanyName: string | null;
  ownerCompanyId: number | null;
  operatorCompanyName: string | null;
  operatorCompanyId: number | null;
  managerCompanyName: string | null;
  managerCompanyId: number | null;
}

function normalizeCondensedRecord(raw: any): CondensedAircraftProfile {
  return {
    aircraftId: raw.aircraftid,
    regNbr: raw.regnbr || '',
    serialNumber: raw.serialnumber || '',
    yearMfr: raw.yearmfr || 0,
    make: raw.make || '',
    model: raw.model || '',
    modelId: raw.modelid || 0,

    aircraftType: raw.aircrafttype || '',
    category: raw.category || '',
    engineMake: raw.enginemake || null,
    engineModel: raw.enginemodel || null,
    engineCount: raw.enginecount || null,
    maxPassengers: raw.maxpassengers || null,
    maxRange: raw.maxrange || null,
    maxSpeed: raw.maxspeed || null,
    mtow: raw.mtow || null,
    cabinHeight: raw.cabinheight || null,
    cabinWidth: raw.cabinwidth || null,
    cabinLength: raw.cabinlength || null,
    baggageCapacity: raw.baggagecapacity || null,
    airframeTotalHours: raw.airframetotalhours || null,
    airframeTotalLandings: raw.airframetotallandings || null,
    engineTotalHours: raw.enginetotalhours || null,

    country: raw.country || null,
    state: raw.state || null,
    city: raw.city || null,
    basedAirport: raw.basedairport || null,
    lifecycle: raw.lifecycle || null,

    forSale: raw.forsale === 'true',
    askingPrice: raw.askingprice || null,
    daysOnMarket: raw.daysonmarket || null,

    avionics: raw.avionics || null,
    interiorDate: raw.interiordate || null,
    exteriorDate: raw.exteriordate || null,
    lastInspectionType: raw.lastinspectiontype || null,
    lastInspectionDate: raw.lastinspectiondate || null,

    ownerCompanyName: raw.ownercompanyname || null,
    ownerCompanyId: raw.ownercompanyid || null,
    operatorCompanyName: raw.operatorcompanyname || null,
    operatorCompanyId: raw.operatorcompanyid || null,
    managerCompanyName: raw.managercompanyname || null,
    managerCompanyId: raw.managercompanyid || null,
  };
}
```

### Important Notes

1. **`forsale` is a string boolean.** `"true"` / `"false"`, not JSON booleans. Parse accordingly.
2. **Paged endpoint.** Even for a single ACID, use the paged variant. Use pagesize 10, page 1.
3. **Response key is `aircraftowneroperators`** — not `aircraft`, not `condensed`.
4. **Multiple records possible.** If an aircraft has multiple owner/operator relationships, you may get multiple rows with the same aircraft but different company fields. Dedupe by `aircraftid` and merge company data.
5. **Numeric fields may be 0 or null for unknowns.** Treat 0 the same as null for display purposes (0 passengers doesn't mean zero — it means unknown).

---

## 8. Loading Design System

Every loading state in this app should feel intentional, informative, and beautiful. No spinners. No "Loading..." text. No blank white screens.

### 8.1 Design Principles

1. **Show the shape of what's coming.** Skeleton screens tell the user what to expect.
2. **Animate with purpose.** Every transition communicates progress.
3. **Content reveals, never pops.** New data fades and slides in — never jump-cuts.
4. **State labels are human.** Instead of "Loading," say what's happening: "Finding aircraft..." or "Resolving contacts..."

### 8.2 Skeleton Components

#### Skeleton Text Line

A rounded rectangle with a subtle shimmer animation. Matches the height and approximate width of the text it replaces.

```typescript
// components/skeletons/SkeletonLine.tsx

interface SkeletonLineProps {
  width: number | string;    // e.g., 180, '60%'
  height?: number;           // default 14
  borderRadius?: number;     // default 6
}
```

**Shimmer animation:**
```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #E8E8ED 25%,
    #F2F2F7 50%,
    #E8E8ED 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}
```

Colors use the iOS system palette:
- Light mode shimmer: `#E8E8ED` → `#F2F2F7` → `#E8E8ED`
- Dark mode shimmer: `#2C2C2E` → `#3A3A3C` → `#2C2C2E`

#### Skeleton Card

A full card-shaped skeleton with multiple text lines inside, matching the layout of the content it will replace.

```
┌─────────────────────────────────────┐
│  ███████████  ·  ██████             │  ← Label + value
│  ████████████████  ·  ███████       │  ← Label + value
│  ██████████  ·  ████████████        │  ← Label + value
│  ███████████████  ·  ██████         │  ← Label + value
└─────────────────────────────────────┘
```

#### Skeleton Photo

A large rounded rectangle (matching photo aspect ratio) with the shimmer and a subtle camera icon in the center (20% opacity).

#### Skeleton Section

A titled card where the title is real text and the content is skeleton lines:

```
┌─ AIRCRAFT SPECIFICATIONS ───────────┐
│                                     │
│  ████████  ·  ██████████            │
│  ████████████  ·  ████              │
│  ██████  ·  ██████████████          │
│  ████████████  ·  ██████            │
│  ████████  ·  ████████████          │
│                                     │
└─────────────────────────────────────┘
```

The section title is visible immediately — only the values shimmer. This tells the user "specs are loading" rather than showing a generic blob.

### 8.3 Content Reveal Animation

When data arrives and replaces a skeleton, use this transition:

```typescript
// components/transitions/ContentReveal.tsx

// Fade in from 0 → 1 opacity
// Slide up from 8px → 0px translateY
// Duration: 350ms
// Easing: cubic-bezier(0.25, 0.46, 0.45, 0.94) — Apple ease-out

const revealAnimation = {
  from: { opacity: 0, transform: [{ translateY: 8 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
  duration: 350,
  easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
};
```

### 8.4 Staggered Section Reveals

When multiple sections resolve at the same time (e.g., Specs and Market from getCondensed), stagger them:

```typescript
const STAGGER_DELAY = 120; // ms between each section

// Section 1: 0ms delay
// Section 2: 120ms delay
// Section 3: 240ms delay
// Section 4: 360ms delay
```

### 8.5 Tab Badge Indicators

Each tab shows a small dot indicator for its loading state:

```
┌───────────┬───────────────┬──────────────────┐
│ Overview ● │  Specs & Intel ◌ │  Summary  ○     │
└───────────┴───────────────┴──────────────────┘
```

| Symbol | Meaning | Color |
|--------|---------|-------|
| ● (filled) | Data loaded | System Green (#34C759) |
| ◌ (pulse) | Loading | Animated pulse, System Blue (#007AFF) |
| ○ (empty) | Not yet started | System Gray (#8E8E93) |

The loading dot uses a gentle pulse animation:

```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}
/* 1.2s duration, ease-in-out */
```

### 8.6 State-Specific Messages

Replace generic loading text with contextual messages:

| State | Message |
|-------|---------|
| getRegNumber in flight | "Finding {regNbr}..." |
| getRegNumber failed (not found) | "No aircraft found for {regNbr}" |
| getCondensed loading | "Loading specifications..." |
| getRelationships loading | "Resolving contacts..." |
| getFlightData loading | "Analyzing 12 months of flight activity..." |
| AI generating | "Analyzing as a [Broker]..." |
| AI complete | (no message — content reveals) |
| No data for a section | "Not available for this aircraft" (muted, small) |

### 8.7 Pull to Refresh

On any tab, pull-to-refresh triggers a fresh fetch of all data for that tab. The pull indicator uses a custom aircraft icon that rotates as you pull:

```
Pull distance 0-40px:   Small aircraft icon tips upward
Pull distance 40-80px:  Aircraft icon fully rotated, release indicator
Release:                Aircraft icon animates into a subtle spin
Complete:               Aircraft icon fades out, content refreshes
```

### 8.8 Error States

When an API call fails, don't show a red error box. Show a calm, recoverable state:

```
┌─────────────────────────────────────┐
│                                     │
│  ┌──────────────────────────────┐   │
│  │                              │   │
│  │  Couldn't load contacts      │   │
│  │  for this aircraft.          │   │
│  │                              │   │
│  │  [Try Again]                 │   │
│  │                              │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

- No red. No exclamation marks. No "Error!"
- Muted text. Single retry button.
- Other sections that succeeded remain visible.

---

## 9. Design System

### 9.1 Typography

Use SF Pro (system font on iOS) for everything. Jony Ive's Apple design language is built on the system font used with extreme precision in weight and size hierarchy.

| Element | Weight | Size | Tracking | Color |
|---------|--------|------|----------|-------|
| Tail number (hero) | Bold | 34pt | -0.4 | Primary (#000 / #FFF) |
| Model name | Regular | 20pt | -0.2 | Primary |
| Serial number | Regular | 15pt | 0 | Secondary (#8E8E93) |
| Section title | Semibold | 13pt | 0.8 (uppercase) | Tertiary (#AEAEB2) |
| Label | Medium | 13pt | 0 | Tertiary (#AEAEB2) |
| Value | Regular | 17pt | -0.2 | Primary |
| Large value (flights, score) | Light | 44pt | -0.4 | Primary |
| Body text (summaries) | Regular | 15pt | -0.1 | Primary |
| Caption / disclaimer | Regular | 12pt | 0 | Quaternary (#C7C7CC) |

### 9.2 Color Palette

Follow Apple's semantic color system. No custom colors except for the persona accent.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| Primary Label | #000000 | #FFFFFF | Tail numbers, values, headings |
| Secondary Label | #3C3C43 (60%) | #EBEBF5 (60%) | Model names, descriptions |
| Tertiary Label | #3C3C43 (30%) | #EBEBF5 (30%) | Section labels, captions |
| Separator | #3C3C43 (12%) | #545458 (60%) | Dividers between sections |
| System Background | #F2F2F7 | #000000 | Screen background |
| Secondary Background | #FFFFFF | #1C1C1E | Cards |
| Tertiary Background | #F2F2F7 | #2C2C2E | Nested cards |
| System Blue | #007AFF | #0A84FF | Interactive elements, links |
| System Green | #34C759 | #30D158 | Success, loaded indicators |
| System Orange | #FF9500 | #FF9F0A | Warning, medium confidence |
| System Red | #FF3B30 | #FF453A | For-sale badge, high-priority flags |

### Persona Accent Colors

Each persona gets a subtle accent color used for the tab underline, section headers, and CTA buttons:

| Persona | Accent (Light) | Accent (Dark) |
|---------|---------------|--------------|
| Dealer/Broker | #007AFF (Blue) | #0A84FF |
| FBO | #5856D6 (Indigo) | #5E5CE6 |
| MRO | #FF9500 (Orange) | #FF9F0A |
| Charter | #34C759 (Green) | #30D158 |
| Fleet Mgmt | #AF52DE (Purple) | #BF5AF2 |
| Finance | #000000 (Black) | #FFFFFF |
| Catering | #FF2D55 (Pink) | #FF375F |
| Ground Transport | #5AC8FA (Teal) | #64D2FF |
| Detailing | #FFCC00 (Yellow) | #FFD60A |

### 9.3 Spacing

Use an 8pt grid. Every margin, padding, and gap is a multiple of 8.

| Token | Value |
|-------|-------|
| Screen padding | 16px |
| Card padding | 16px |
| Section gap | 24px |
| Inter-card gap | 16px |
| Label-to-value gap | 4px |
| Inline item gap | 8px |

### 9.4 Corner Radius

| Element | Radius |
|---------|--------|
| Cards | 16px |
| Buttons | 12px |
| Badges | 8px |
| Skeleton lines | 6px |
| Photos | 16px |
| Tab indicator | 2px |

### 9.5 Shadows

Minimal. Cards float slightly above the background.

```css
/* Card shadow — Light mode */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04),
            0 1px 2px rgba(0, 0, 0, 0.06);

/* Elevated card (active tab content, modals) */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.04);

/* Dark mode: no shadows, use border instead */
border: 1px solid rgba(255, 255, 255, 0.06);
```

### 9.6 Motion Principles

1. **Duration:** 200-350ms for transitions. Never over 500ms.
2. **Easing:** Apple's standard ease-out: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
3. **Tab switch:** Content crossfade, 200ms
4. **Content reveal:** Fade + slide up, 350ms
5. **Skeleton shimmer:** Continuous, 1.8s loop
6. **Loading dot pulse:** Continuous, 1.2s loop
7. **No bouncing, no spring physics for data transitions.** This is an intelligence tool, not a toy.

---

## 10. Component Specifications

### 10.1 Tab Bar

```
┌──────────────────────────────────────────────┐
│  Overview ●     Specs & Intel ◌     Summary ○ │
│  ═══════════                                  │
└──────────────────────────────────────────────┘
```

- Horizontal scroll disabled (3 tabs fit on all screen sizes)
- Active tab: Persona accent color text + 2px underline
- Inactive tab: Tertiary Label color
- Loading dot: 6px circle, right of label, 4px gap
- Underline slides to active tab on switch (200ms ease-out)
- Tab content area: full-bleed, edge-to-edge

### 10.2 Spec Row (for Aircraft Specifications)

```
┌─────────────────────────────────────┐
│  Range                    1,803 nm  │
└─────────────────────────────────────┘
```

- Label: left-aligned, Tertiary color, 13pt Medium
- Value: right-aligned, Primary color, 17pt Regular
- Separator: 1px hairline below, Separator color
- If value is null: Show "—" in Quaternary color
- Row height: 44px (iOS standard tap target)

### 10.3 Spec Section Card

```
┌─ PERFORMANCE ───────────────────────┐
│  Range                    1,803 nm  │
│  ─────────────────────────────────  │
│  Max Speed                  290 kt  │
│  ─────────────────────────────────  │
│  MTOW                   10,450 lb   │
│  ─────────────────────────────────  │
│  Passengers                     9   │
└─────────────────────────────────────┘
```

- Section title: 13pt Semibold, uppercase, 0.8 tracking, Tertiary color
- Cards have 16px radius, Secondary Background fill
- 16px internal padding
- If ALL values in a section are null, hide the entire section (don't show an empty card)

### 10.4 Stat Block (for large numbers)

```
┌──────────────┐
│  TOTAL       │
│  FLIGHTS     │
│              │
│  500         │
│              │
│  Last 12 mo  │
└──────────────┘
```

- Label: 11pt Semibold, uppercase, 0.6 tracking, Tertiary
- Value: 44pt Light, Primary
- Subtitle: 12pt Regular, Tertiary
- Use in pairs or triplets side-by-side

### 10.5 Horizontal Bar (for top routes/airports)

```
  KHPN → KPBI    ████████████████  12
  KHPN → KTEB    ██████████        8
  KPBI → KHPN    ████████          7
```

- Route label: 13pt Mono (SF Mono), Primary
- Bar: 4px height, 4px radius, Persona accent color
- Bar width: proportional to max count (top route = 100%)
- Count: 13pt Regular, Secondary, right-aligned
- Bar animates from 0 to full width on reveal (350ms, ease-out)

### 10.6 Contact Card

Already specified in PREREQUISITE_CONTACT_ENRICHMENT.md. Rendered in Tab 2, "Who's Involved" section.

### 10.7 Outreach Draft Card (Tab 3)

```
┌─────────────────────────────────────────┐
│  EMAIL                                  │
│  To: jsmith@alphaflying.com             │
│  Subject: Quick question on N413AF      │
│  ───────────────────────────────────    │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  Hi John — I am reaching out    │    │
│  │  about N413AF (PC-12 NGX).      │    │
│  │  Do you have 5 minutes this     │    │
│  │  week for a quick question?     │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌────────────┐  ┌─────────────────┐    │
│  │ 📧 Send    │  │  📋 Copy        │    │
│  └────────────┘  └─────────────────┘    │
└─────────────────────────────────────────┘
```

- Email body in a nested card (Tertiary Background)
- Body text: 15pt Regular, monospace feel without actual mono font
- "Send" button opens `mailto:` — Primary button style (Persona accent, white text)
- "Copy" button copies body to clipboard — Secondary button style (outline)

### 10.8 Confidence Meter

```
┌───────────────────────────────────────┐
│  DATA CONFIDENCE                      │
│                                       │
│  ┌───────────────────────────────┐    │
│  │ ████████████████░░░░░ │  72   │    │
│  └───────────────────────────────┘    │
│                                       │
│  ✓  Contact data available            │
│  ✓  Flight data (12 months)           │
│  ⚠  Transaction history missing       │
│  ⚠  Market trends not available       │
└───────────────────────────────────────┘
```

- Bar: 8px height, 8px radius
- Filled portion: gradient from Persona accent to a lighter variant
- Empty portion: Tertiary Background
- Score: 20pt Semibold, right of bar
- Checkmarks: System Green
- Warnings: System Orange
- List items: 14pt Regular

---

## 11. Persona-Aware Rendering

Each tab renders slightly different content depending on the active persona. The components are shared but the content emphasis and ordering changes.

### Tab 2 Section Order by Persona

| Persona | Section 1 | Section 2 | Section 3 | Section 4 |
|---------|-----------|-----------|-----------|-----------|
| Dealer/Broker | Ownership Chain | Specs | Market Context | Flight Activity |
| FBO | Aircraft Type Profile | Flight Patterns | Crew Contacts | Service Notes |
| MRO | Technical Specs | Utilization | Maintenance Contacts | Fleet Context |
| Charter | Utilization Analysis | Route Map | Operator ID | Market Context |
| Fleet Mgmt | Ownership Verification | Utilization Benchmark | Ops Contacts | Asset Value |
| Finance | Collateral Profile | Ownership Chain | Transaction History | KYC Flights |
| Catering | Cabin Profile | Arrival Patterns | Provisioning Contacts | — |
| Ground Transport | Destination Analysis | Arrival Timing | Passenger Contacts | — |
| Detailing | Aircraft Size | Home Base | Flight Frequency | Service Contacts |

### Tab 3 Section Visibility by Persona

| Section | Broker | FBO | MRO | Charter | Fleet | Finance | Catering | Ground | Detail |
|---------|--------|-----|-----|---------|-------|---------|----------|--------|--------|
| Executive Summary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Persona Takeaways | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contact First | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Outreach Drafts | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| Compliance Flags | — | — | — | — | — | ✓ | — | — | — |
| Next Actions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Confidence | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 12. Implementation Checklist

### Backend

- [ ] Create `GET /api/aircraft/lookup/:regNbr` (Phase 1 — already partially exists)
- [ ] Create `GET /api/aircraft/enrich/:acid` (Phase 2 — getCondensed + getRelationships + getPictures)
- [ ] Create `GET /api/aircraft/flights/:acid` (Phase 3 — getFlightDataPaged with 12-month window)
- [ ] Create `POST /api/aircraft/summary` (Phase 4 — AI agent dispatch)
- [ ] Implement `getCondensedOwnerOperators` call with normalization
- [ ] Implement `getRelationships` call with contact normalization (per PREREQUISITE doc)
- [ ] Implement 12-month flight data window (per FLIGHT_DATA doc)
- [ ] Add 1s delay for flight data call in orchestrator

### Frontend — Tab Infrastructure

- [ ] Replace single-scroll layout with 3-tab component
- [ ] Implement tab bar with persona accent underline
- [ ] Implement loading dot indicators (●, ◌, ○)
- [ ] Implement tab switch animation (crossfade, 200ms)
- [ ] Wire `useAircraftProfile` hook with phased loading

### Frontend — Tab 1: Overview

- [ ] Aircraft photo with skeleton → crossfade transition
- [ ] Type silhouette placeholder when no photo
- [ ] Hero tail number, model, year, serial
- [ ] Basic operator card (from getRegNumber)
- [ ] Category, make, status, for-sale badges
- [ ] Open in Evolution link

### Frontend — Tab 2: Specs & Intel

- [ ] Aircraft Specifications card with all spec rows
- [ ] Registration & Status card
- [ ] Configuration card
- [ ] Contacts section (from getRelationships — per PREREQUISITE doc)
- [ ] Flight Activity section with stat blocks + horizontal bars
- [ ] Market Context card (persona-conditional)
- [ ] Independent skeleton → content reveal per section
- [ ] Staggered reveal animation (120ms between sections)
- [ ] Hide sections where ALL values are null

### Frontend — Tab 3: Summary & Outreach

- [ ] Pre-generation state with CTA and data readiness indicator
- [ ] Generating state with animated orb + checklist
- [ ] Generated state with staggered section reveals
- [ ] Executive Summary card
- [ ] Persona Takeaways card
- [ ] Contact First recommendation card
- [ ] Outreach Draft cards (email + SMS) with Send and Copy buttons
- [ ] Next Actions ordered list
- [ ] Data Confidence meter
- [ ] Compliance Flags (Finance persona only)

### Frontend — Loading System

- [ ] SkeletonLine component with shimmer animation
- [ ] SkeletonCard component
- [ ] SkeletonPhoto component
- [ ] SkeletonSection component (real title + skeleton values)
- [ ] ContentReveal wrapper (fade + slide, 350ms)
- [ ] Pull-to-refresh with aircraft icon animation
- [ ] Error state cards (calm, recoverable)
- [ ] Contextual loading messages (not generic "Loading...")

### Design System

- [ ] Define all color tokens as CSS variables / RN StyleSheet
- [ ] Define typography scale (per spec table)
- [ ] Define spacing tokens (8pt grid)
- [ ] Define persona accent colors
- [ ] Dark mode support for all tokens
- [ ] Implement shimmer animation (light + dark variants)
- [ ] Implement content reveal animation
- [ ] Implement loading dot pulse animation

### Testing

- [ ] Test tab switching with data at different load phases
- [ ] Test skeleton → content transitions for each section
- [ ] Test with aircraft that has all data (full experience)
- [ ] Test with aircraft that has minimal data (graceful empty states)
- [ ] Test with aircraft not found (clean error state)
- [ ] Test all 9 personas render correct tab content order
- [ ] Test dark mode for all components
- [ ] Test pull-to-refresh on each tab
- [ ] Test AI generation flow (pre → generating → complete)
- [ ] Performance: Tab 1 renders in < 500ms from search
- [ ] Performance: Tab 2 fully loaded in < 3s
- [ ] Performance: No layout jumps when data arrives

---

*End of Tabbed Experience + getCondensed + Loading Design System Spec*
