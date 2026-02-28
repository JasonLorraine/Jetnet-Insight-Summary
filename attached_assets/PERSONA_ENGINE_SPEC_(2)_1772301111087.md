# Jetnet Insight Summary — Persona Engine Specification
### Engineering Handoff Document for Replit Build Team
**Version:** 1.0
**Date:** 2026-02-28
**Repo:** `https://github.com/JasonLorraine/Jetnet-Insight-Summary`
**Replit:** `https://replit.com/@jlorraine76/Insight-Summary`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Persona Definitions](#2-persona-definitions)
3. [Architecture Overview](#3-architecture-overview)
4. [Authentication and Persona Selection](#4-authentication-and-persona-selection)
5. [Persona-Specific AI Agents](#5-persona-specific-ai-agents)
6. [Shared Data Layer](#6-shared-data-layer)
7. [Persona Agent Specifications](#7-persona-agent-specifications)
   - 7.1 Dealer/Broker Agent
   - 7.2 FBO Agent
   - 7.3 MRO Agent
   - 7.4 Charter Agent
   - 7.5 Fleet Management Agent
   - 7.6 Finance Agent
   - 7.7 Catering Agent
   - 7.8 Ground Transportation Agent
   - 7.9 Detailing Agent
8. [AI Input/Output Schemas](#8-ai-inputoutput-schemas)
9. [Persona-Specific Dashboards](#9-persona-specific-dashboards)
10. [Outreach Engine](#10-outreach-engine)
11. [Confidence Scoring (Universal)](#11-confidence-scoring-universal)
12. [Deterministic Guardrails](#12-deterministic-guardrails)
13. [JETNET Endpoints by Persona](#13-jetnet-endpoints-by-persona)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [File Structure](#15-file-structure)
16. [Validation Checklist](#16-validation-checklist)

---

## 1. Executive Summary

The Jetnet Insight Summary app currently operates from a single Dealer/Broker lens. This spec upgrades the app to support **9 distinct personas**, each with its own AI agent, dashboard, report format, and value proposition. Every persona transforms the same JETNET data into role-specific intelligence and actionable outputs.

### The 9 Personas

| ID | Persona | Core Question |
|----|---------|---------------|
| 1 | Dealer/Broker | Who owns this aircraft, and how do I get a deal started? |
| 2 | FBO | What aircraft types visit my area, and who are the people on board? |
| 3 | MRO | What is the maintenance profile, and who is the decision maker for service? |
| 4 | Charter | What is the utilization pattern, and is this aircraft available or competitive? |
| 5 | Fleet Management | What is the operational health of this fleet, and what needs attention? |
| 6 | Finance | What is this aircraft worth, who owns it, and what are the KYC red flags? |
| 7 | Catering | When and where does this aircraft land, and who arranges services? |
| 8 | Ground Transportation | Where does this aircraft fly, when does it arrive, and who needs a car? |
| 9 | Detailing | Where is this aircraft based, how often does it fly, and who schedules service? |

### Design Principle

Every login, every search, every report, every AI output is shaped by the active persona. The user should feel like the entire app was built specifically for their job.

---

## 2. Persona Definitions

Each persona is defined by five attributes that the AI agent uses to shape all outputs.

### 2.1 Dealer/Broker

```yaml
id: dealer_broker
label: "Dealer / Broker"
icon: "handshake"
core_mission: "Identify ownership, assess market position, initiate acquisition or sale conversations"
value_per_search: "Ownership intelligence, contact routing, deal-ready outreach"
primary_contacts: ["Owner", "Operator", "Manager", "CFO", "Controller"]
secondary_contacts: ["Chief Pilot", "Director of Aviation", "DOM"]
data_priorities:
  - relationships (ownership chain)
  - transaction history
  - market trends (comparable sales, days on market)
  - flight activity (utilization signals)
report_tone: "Concise, direct, deal-oriented. No fluff."
outreach: true
dashboard_widgets:
  - aircraft_profile
  - ownership_chain
  - market_position
  - comparable_sales
  - top_contacts
  - outreach_actions
  - contact_pack
```

### 2.2 FBO (Fixed Base Operator)

```yaml
id: fbo
label: "FBO"
icon: "building-2"
core_mission: "Understand aircraft types and the people associated with them — pilots and passengers — to capture transient and based traffic"
value_per_search: "Aircraft type intelligence, crew and passenger contact paths, visit frequency"
primary_contacts: ["Chief Pilot", "Scheduler", "Dispatch", "DOM"]
secondary_contacts: ["Owner", "Operator", "Manager", "Executive Assistant"]
data_priorities:
  - aircraft type and category (jet class, cabin size, fuel type)
  - flight activity (routes, frequency, home base indicators)
  - relationships (who flies it, who manages it)
  - contacts (crew-facing roles)
report_tone: "Operational, hospitality-aware. Focus on aircraft needs and people."
outreach: true
dashboard_widgets:
  - aircraft_profile_fbo (type emphasis: category, range, cabin class, fuel type)
  - flight_pattern_map
  - visit_frequency
  - crew_contacts
  - passenger_pathway (owner/operator → executive contacts)
  - service_opportunity_notes
```

### 2.3 MRO (Maintenance, Repair, Overhaul)

```yaml
id: mro
label: "MRO"
icon: "wrench"
core_mission: "Assess maintenance opportunity based on aircraft age, type, utilization, and decision-maker access"
value_per_search: "Maintenance window signals, fleet size context, who authorizes service"
primary_contacts: ["DOM", "Chief Pilot", "Director of Maintenance", "Director of Aviation"]
secondary_contacts: ["Operator", "Manager", "Scheduler"]
data_priorities:
  - aircraft profile (year, serial, model, engine type)
  - flight activity (utilization rate → maintenance cycle estimation)
  - relationships (operator/manager = service decision chain)
  - transaction history (last sale = potential new-owner inspection)
  - fleet context (operator fleet size from relationships)
report_tone: "Technical, practical. Reference model-specific maintenance considerations."
outreach: true
dashboard_widgets:
  - aircraft_technical_profile (year, serial, hours if available, engine)
  - utilization_estimate
  - maintenance_window_signals
  - operator_fleet_size
  - maintenance_decision_makers
  - outreach_actions
```

### 2.4 Charter

```yaml
id: charter
label: "Charter"
icon: "plane"
core_mission: "Assess aircraft availability, utilization patterns, and competitive positioning in the charter market"
value_per_search: "Utilization intelligence, operator identification, route patterns for market analysis"
primary_contacts: ["Operator", "Manager", "Scheduler", "Dispatch"]
secondary_contacts: ["Chief Pilot", "Owner"]
data_priorities:
  - flight activity (utilization rate, route density, dead legs)
  - relationships (operator and manager = charter certificate holder)
  - aircraft profile (range, passenger capacity, category)
  - market trends (for-sale status may indicate charter exit)
report_tone: "Market-aware, operational. Focus on availability and utilization."
outreach: true
dashboard_widgets:
  - aircraft_charter_profile (range, pax, category, for-sale status)
  - utilization_analysis
  - route_heatmap
  - dead_leg_indicators
  - operator_identification
  - charter_market_context
  - outreach_actions
```

### 2.5 Fleet Management

```yaml
id: fleet_management
label: "Fleet Management"
icon: "layout-grid"
core_mission: "Monitor operational health, ownership structure, and utilization across managed or tracked aircraft"
value_per_search: "Operational status, ownership verification, utilization benchmarking, anomaly detection"
primary_contacts: ["Owner", "Operator", "Manager", "Chief Pilot", "DOM"]
secondary_contacts: ["CFO", "Controller", "Scheduler"]
data_priorities:
  - relationships (full ownership/operator/manager chain)
  - flight activity (utilization benchmarking against fleet and model averages)
  - transaction history (ownership changes, liens)
  - aircraft profile (age, serial, specs)
  - market trends (fleet asset valuation context)
report_tone: "Analytical, operations-focused. Benchmark-oriented."
outreach: false
dashboard_widgets:
  - aircraft_operational_profile
  - ownership_chain_verification
  - utilization_benchmark
  - flight_pattern_analysis
  - fleet_context_panel
  - operational_alerts
  - asset_valuation_context
```

### 2.6 Finance

```yaml
id: finance
label: "Finance"
icon: "landmark"
core_mission: "Fleet valuation, KYC due diligence on aircraft ownership, and flight pattern analysis for compliance"
value_per_search: "Valuation context, ownership chain transparency, flight pattern KYC, transaction history"
primary_contacts: ["Owner", "Manager", "CFO", "Controller"]
secondary_contacts: ["Operator", "Director of Aviation"]
data_priorities:
  - transaction history (sale prices, transaction dates, frequency of transfer)
  - market trends (model valuation, days on market, ask vs sale spread)
  - relationships (full beneficial ownership chain, layered entities)
  - flight activity (pattern analysis for KYC — unusual routes, frequency anomalies)
  - aircraft profile (year, model, serial for collateral identification)
report_tone: "Analytical, compliance-aware. Flag unknowns explicitly. No speculation."
outreach: false
dashboard_widgets:
  - aircraft_collateral_profile (serial, year, model, for-sale status)
  - ownership_chain_deep (all relationship layers)
  - valuation_context (model market trends, comparable transactions)
  - transaction_timeline
  - kyc_flight_analysis (route patterns, jurisdictions, frequency)
  - compliance_flags
  - data_confidence_panel
```

### 2.7 Catering

```yaml
id: catering
label: "Catering"
icon: "utensils"
core_mission: "Identify inbound aircraft to target airports and connect with the people who arrange provisioning"
value_per_search: "Arrival patterns, aircraft cabin class (pax count drives order size), scheduler/crew contacts"
primary_contacts: ["Scheduler", "Dispatch", "Executive Assistant", "Chief Pilot"]
secondary_contacts: ["Operator", "Manager", "FBO contact"]
data_priorities:
  - flight activity (destination airports, arrival frequency, time-of-day patterns)
  - aircraft profile (cabin class, passenger capacity = order size signal)
  - relationships (operator/manager = who books services)
  - contacts (scheduler and dispatch roles)
report_tone: "Service-oriented, practical. Focus on timing and logistics."
outreach: true
dashboard_widgets:
  - aircraft_cabin_profile (pax capacity, cabin class, category)
  - arrival_pattern_analysis (target airport frequency)
  - service_window_estimate
  - provisioning_contacts
  - outreach_actions
```

### 2.8 Ground Transportation

```yaml
id: ground_transportation
label: "Ground Transportation"
icon: "car"
core_mission: "Identify where aircraft land, when they arrive, and who needs ground transport — typically the passengers or their assistants"
value_per_search: "Destination airports, arrival timing patterns, passenger-side contact paths"
primary_contacts: ["Executive Assistant", "Scheduler", "Manager"]
secondary_contacts: ["Operator", "Chief Pilot", "Dispatch"]
data_priorities:
  - flight activity (destination airports, arrival frequency, time patterns)
  - relationships (owner/operator → passenger pathway)
  - contacts (EA, scheduler, management company)
  - aircraft profile (category = passenger profile signal)
report_tone: "Service-oriented, logistics-focused. Lead with where and when."
outreach: true
dashboard_widgets:
  - destination_analysis (top airports with frequency)
  - arrival_timing_patterns
  - passenger_pathway_contacts
  - aircraft_category_context
  - outreach_actions
```

### 2.9 Detailing

```yaml
id: detailing
label: "Detailing"
icon: "sparkles"
core_mission: "Identify where aircraft are based, how often they fly (= cleaning frequency need), and who schedules ground services"
value_per_search: "Home base identification, utilization rate (flight frequency), service scheduling contacts"
primary_contacts: ["Scheduler", "DOM", "Chief Pilot", "Dispatch"]
secondary_contacts: ["Operator", "Manager", "FBO contact"]
data_priorities:
  - flight activity (home base inference, flight frequency = detailing cycle)
  - aircraft profile (type, size = job scope and pricing)
  - relationships (operator/manager = who authorizes recurring services)
  - contacts (operations roles that schedule ground services)
report_tone: "Practical, service-oriented. Focus on location, frequency, and access."
outreach: true
dashboard_widgets:
  - aircraft_size_profile (type, category, dimensions context)
  - home_base_analysis
  - flight_frequency (detailing cycle signal)
  - service_scheduling_contacts
  - outreach_actions
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Expo/RN)                     │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Login   │→ │ Persona      │→ │ Persona Dashboard │  │
│  │  Screen  │  │ Selector     │  │ (role-specific)   │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│                                          │              │
│                                    Tail Search          │
│                                          │              │
│                              ┌───────────▼────────┐     │
│                              │  Persona-Filtered  │     │
│                              │  Results View      │     │
│                              └────────────────────┘     │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls with persona context
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Express/TS)                    │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Auth +      │  │ JETNET       │  │ Persona        │  │
│  │ Session     │  │ Proxy Layer  │  │ Router         │  │
│  │ (persona    │  │ (shared)     │  │                │  │
│  │  stored)    │  │              │  │ Routes request │  │
│  └─────────────┘  └──────────────┘  │ to correct     │  │
│                                     │ AI agent       │  │
│                                     └───────┬────────┘  │
│                                             │           │
│  ┌──────────────────────────────────────────▼────────┐  │
│  │              AI AGENT DISPATCHER                   │  │
│  │                                                   │  │
│  │  Loads persona-specific:                          │  │
│  │  • System prompt (from skill file)                │  │
│  │  • Output schema                                  │  │
│  │  • Contact ranking weights                        │  │
│  │  • Dashboard widget config                        │  │
│  │  • Outreach templates                             │  │
│  │                                                   │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │  │
│  │  │Brkr │ │ FBO │ │ MRO │ │Chrt │ │Fleet│  ...    │  │
│  │  │Agent│ │Agent│ │Agent│ │Agent│ │Agent│        │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Shared JETNET proxy layer.** All personas call the same JETNET endpoints. The data fetch is identical. The AI agent transforms the interpretation.
2. **Persona stored server-side on the session/user record.** Client sends `personaId` at login. Server tags all subsequent requests.
3. **AI agents are skill files.** Each persona has a dedicated skill file (system prompt + schema + examples) loaded by the agent dispatcher.
4. **Flight data always fetched when available.** Every persona benefits from flight intelligence. The agent decides what to emphasize.

---

## 4. Authentication and Persona Selection

### 4.1 Login Flow

```
User opens app
  → Login screen (JETNET email + password)
  → Persona selector screen (9 options, grid or list)
  → User taps persona
  → POST /api/auth/login { email, password, personaId }
  → Server authenticates with JETNET
  → Server stores personaId on user session
  → Client receives { bearerToken, apiToken, personaId, personaConfig }
  → Client renders persona-specific dashboard
```

### 4.2 Persona Selector UI

Display as a grid of cards. Each card shows:
- Icon (from persona definition)
- Label
- One-line description of what the persona does

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🤝          │  │  🏢          │  │  🔧          │
│  Dealer /    │  │  FBO         │  │  MRO         │
│  Broker      │  │              │  │              │
│  Deal intel  │  │  Traffic &   │  │  Maintenance │
│  & outreach  │  │  crew intel  │  │  opportunity │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ✈️          │  │  📊          │  │  🏛          │
│  Charter     │  │  Fleet Mgmt  │  │  Finance     │
│              │  │              │  │              │
│  Utilization │  │  Ops health  │  │  Valuation   │
│  & market    │  │  & benchmark │  │  & KYC       │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🍽          │  │  🚗          │  │  ✨          │
│  Catering    │  │  Ground      │  │  Detailing   │
│              │  │  Transport   │  │              │
│  Arrival     │  │  Destination │  │  Home base   │
│  provisioning│  │  logistics   │  │  & frequency │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 4.3 Changing Persona

- Settings screen includes "Change Persona" option
- Changing persona:
  1. Updates session server-side
  2. Clears any cached AI reports client-side
  3. Reloads dashboard with new persona widgets
  4. Does NOT require re-authentication with JETNET

### 4.4 Data Model

Add to the existing user/session schema:

```typescript
// shared/types/persona.ts

export type PersonaId =
  | 'dealer_broker'
  | 'fbo'
  | 'mro'
  | 'charter'
  | 'fleet_management'
  | 'finance'
  | 'catering'
  | 'ground_transportation'
  | 'detailing';

export interface PersonaConfig {
  id: PersonaId;
  label: string;
  icon: string;
  coreMission: string;
  primaryContacts: string[];
  secondaryContacts: string[];
  dataPriorities: string[];
  reportTone: string;
  outreachEnabled: boolean;
  dashboardWidgets: string[];
}

// Server session extends with:
export interface UserSession {
  bearerToken: string;
  apiToken: string;
  personaId: PersonaId;
  personaConfig: PersonaConfig;
}
```

---

## 5. Persona-Specific AI Agents

### 5.1 Agent Dispatcher Pattern

The server maintains a registry of persona agents. When a search request comes in, the dispatcher:

1. Reads `personaId` from the session
2. Loads the corresponding skill file from `.agents/skills/personas/{personaId}.md`
3. Constructs the system prompt from the skill file
4. Builds the `PersonaIntelPayload` (shared data + persona context)
5. Calls Claude with the persona-specific system prompt
6. Validates the response against the persona-specific output schema
7. Returns to client

```typescript
// server/agents/dispatcher.ts

import { PersonaId } from '../../shared/types/persona';

const AGENT_REGISTRY: Record<PersonaId, AgentConfig> = {
  dealer_broker: {
    skillPath: '.agents/skills/personas/dealer_broker.md',
    outputSchema: DealerBrokerResponseSchema,
    contactWeights: DEALER_BROKER_WEIGHTS,
  },
  fbo: {
    skillPath: '.agents/skills/personas/fbo.md',
    outputSchema: FBOResponseSchema,
    contactWeights: FBO_WEIGHTS,
  },
  // ... all 9 personas
};

async function dispatchToAgent(
  personaId: PersonaId,
  payload: PersonaIntelPayload
): Promise<PersonaIntelResponse> {
  const agent = AGENT_REGISTRY[personaId];
  const systemPrompt = loadSkillFile(agent.skillPath);
  const response = await callClaude(systemPrompt, payload);
  validateResponse(response, agent.outputSchema);
  return response;
}
```

### 5.2 Skill File Structure

Each persona skill file lives at `.agents/skills/personas/{personaId}.md` and contains:

```markdown
# {Persona Name} Agent Skill

## Identity
You are an AI agent embedded in a {persona}-focused aviation intelligence app.

## Mission
{coreMission from persona definition}

## What You Receive
A JSON payload containing aircraft, companies, contacts, relationships, and optional
flight/transaction intelligence.

## What You Produce
Valid JSON matching the {Persona}IntelResponse schema.

## Lens
When analyzing data, you think like a {persona}. Specifically:
{persona-specific analytical framework — detailed below per agent}

## Contact Ranking
Prioritize contacts in this order:
{persona-specific contact ranking}

## Tone
{reportTone}

## Constraints
- Only use information present in the payload
- If information is missing, say it is unknown
- Never invent facts
- Return ONLY valid JSON
```

---

## 6. Shared Data Layer

All personas share the same JETNET data fetch pipeline. The server fetches everything available, and the AI agent filters and emphasizes based on persona.

### 6.1 Universal Fetch Pipeline

For every tail number search, regardless of persona:

```
1. getRegNumber/{reg}/{apiToken}           → aircraft profile + ACID
2. getPictures/{acid}/{apiToken}           → aircraft images
3. getRelationships/{apiToken}             → companies, contacts, relationship types
   body: { "aclist": [acid] }
4. getFlightDataPaged/{apiToken}/100/1     → flight activity (when available)
   body: { "aclist": [acid], ... }
5. getHistoryListPaged/{apiToken}/100/1    → transaction history
   body: { "aclist": [acid], "transtype": ["None"], ... }
6. getModelMarketTrends                    → model-level market data (if persona needs it)
   body: { "modlist": [modelId] }
```

Steps 3, 4, and 5 run in parallel. Step 6 runs only for personas that need market context (dealer_broker, charter, fleet_management, finance).

### 6.2 PersonaIntelPayload (Universal Input)

This is what gets sent to every AI agent. The agent uses what it needs.

```typescript
interface PersonaIntelPayload {
  request: {
    personaId: PersonaId;
    mode: 'all';
    tone: string;  // from persona config
    maxOutreachLength: {
      emailWords: number;   // 140
      smsChars: number;     // 240
    };
  };
  aircraft: {
    regNbr: string;
    acid: number;
    model: string;
    year: number;
    serialNumber: string;
    make: string;
    category: string;
    engineType?: string;
    passengerCapacity?: number;
    range?: string;
    forSale?: boolean;
    // ... all available profile fields
  };
  companies: Array<{
    companyId: number;
    companyName: string;
    relationshipRole: string;  // Owner, Operator, Manager, etc.
  }>;
  contacts: Array<{
    contactId: number;
    companyId: number;
    fullName: string;
    firstName: string;
    lastName: string;
    title: string;
    relationshipType: string;
    emails: string[];
    phones: {
      mobile?: string;
      work?: string;
    };
  }>;
  recommendations: Array<{
    contactId: number;
    companyId: number;
    relationshipType: string;
    tier: string;
    score: number;
    reasons: string[];
    preferredChannels: string[];
  }>;
  flightIntel: {
    available: boolean;
    totalFlights?: number;
    windowDays?: number;
    topRoutes?: Array<{ from: string; to: string; count: number }>;
    topAirports?: Array<{ code: string; count: number; role: string }>;
    estimatedHomeBase?: string;
    avgFlightsPerMonth?: number;
    notes?: string[];
  } | null;
  transactionsIntel: {
    available: boolean;
    transactions?: Array<{
      date: string;
      type: string;
      buyer?: string;
      seller?: string;
      price?: number;
    }>;
    lastSaleDate?: string;
    totalTransactions?: number;
  } | null;
  marketIntel: {
    available: boolean;
    modelForSaleCount?: number;
    avgAskingPrice?: number;
    avgDaysOnMarket?: number;
    recentComparables?: Array<{
      regNbr: string;
      saleDate: string;
      price: number;
    }>;
  } | null;
}
```

---

## 7. Persona Agent Specifications

Each section below defines what the AI agent does differently for that persona.

---

### 7.1 Dealer/Broker Agent

**File:** `.agents/skills/personas/dealer_broker.md`

**Analytical Framework:**
- Who is in the ownership chain? (Owner → Operator → Manager hierarchy)
- Is this aircraft for sale? If yes, how does it compare to market?
- If not for sale, what signals suggest the owner might sell? (age, utilization drop, fleet changes)
- Who is the decision maker for a transaction?
- What is the fastest path to a conversation?

**Executive Summary Bullets (4–7):**
1. Aircraft identity and status (model, year, for-sale status)
2. Ownership structure (who owns, who operates, who manages)
3. Market context (if available: comparable pricing, days on market)
4. Utilization signals (if flight data: active, dormant, seasonal)
5. Transaction history highlights (if available: last sale, frequency)
6. Contact availability and quality
7. Data gaps and confidence

**Broker Takeaways (3):**
1. Best path to a deal conversation
2. Key risk or opportunity based on data
3. Recommended immediate action

**Outreach Drafts:**
- `emailPrimary`: To owner/operator decision maker. Subject references tail number. Body asks about availability or interest.
- `smsPrimary`: Short, direct. Name + tail number + one question.
- `emailOps`: To chief pilot or DOM if different from primary. Frames as operational inquiry.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Owner relationship | 30 |
| Operator relationship | 25 |
| Manager relationship | 20 |
| Title: C-suite, Director, VP | 15 |
| Email available | 5 |
| Mobile available | 5 |

---

### 7.2 FBO Agent

**File:** `.agents/skills/personas/fbo.md`

**Analytical Framework:**
- What type of aircraft is this? (Category, cabin class, fuel type, size)
- What does this aircraft type need when it arrives? (Fuel volume, hangar size, GPU, lavatory, catering access)
- Who are the people? Two tracks:
  - **Crew track:** Chief Pilot, DOM, Scheduler, Dispatch → direct service relationship
  - **Passenger track:** Owner, Executive → high-value hospitality opportunity
- Where does this aircraft go? (If flight data: frequent destinations = potential customer airports)
- How often does it move? (Visit frequency potential)

**Executive Summary Bullets (4–7):**
1. Aircraft type and operational profile (category, range, fuel type, pax capacity)
2. Who operates/manages this aircraft (service relationship chain)
3. Crew contacts identified (or not)
4. Flight patterns relevant to FBO operations (if available)
5. Estimated visit potential to target region
6. Passenger-side contacts (owner/executive pathway)
7. Service opportunity notes (aircraft type needs)

**FBO Takeaways (3):**
1. Aircraft type service requirements (fuel, hangar, ground handling)
2. Best crew-side contact for establishing service relationship
3. Passenger-side opportunity (if owner/executive contacts exist)

**Outreach Drafts:**
- `emailCrew`: To scheduler or chief pilot. Frames as FBO introduction, references aircraft type. Professional, service-oriented.
- `smsCrew`: Short text to pilot or scheduler. Identifies FBO, offers services.
- `emailPassenger`: To management company or owner's office. Frames as VIP services introduction.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Chief Pilot / Scheduler / Dispatch | 30 |
| DOM / Director of Operations | 20 |
| Operator relationship | 20 |
| Manager relationship | 15 |
| Owner (passenger pathway) | 10 |
| Mobile available | 5 |

---

### 7.3 MRO Agent

**File:** `.agents/skills/personas/mro.md`

**Analytical Framework:**
- What is the aircraft's maintenance profile? (Model, year, serial → approximate maintenance cycle position)
- How heavily is it utilized? (Flight frequency → time between overhauls)
- Who makes maintenance decisions? (DOM, Chief Pilot, Director of Aviation, Operator)
- Was it recently sold? (New owner = inspection opportunity)
- How large is the operator's fleet? (Multiple aircraft = volume opportunity)
- What is the aircraft's age and model generation? (Older = more maintenance, specific AD/SB applicability)

**Executive Summary Bullets (4–7):**
1. Aircraft technical identity (model, year, serial, engine type if available)
2. Utilization estimate (from flight data: flights/month, active vs dormant)
3. Maintenance decision chain (DOM, Chief Pilot, Operator)
4. Recent transaction signals (new owner = inspection need)
5. Operator fleet context (fleet size = service volume potential)
6. Age-based maintenance considerations (model-specific)
7. Data gaps affecting maintenance assessment

**MRO Takeaways (3):**
1. Estimated maintenance position signal (high utilization, aging, or recent sale)
2. Primary maintenance decision maker and contact path
3. Volume opportunity assessment (fleet size)

**Outreach Drafts:**
- `emailMaintenance`: To DOM or Chief Pilot. References aircraft by tail and model. Professional inquiry about upcoming maintenance events.
- `smsMaintenance`: Short, identifies MRO capability relevant to aircraft type.
- `emailOperator`: To operator/management company. Fleet-level service introduction.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| DOM / Director of Maintenance | 35 |
| Chief Pilot | 25 |
| Operator relationship | 20 |
| Manager relationship | 10 |
| Email available | 5 |
| Mobile available | 5 |

---

### 7.4 Charter Agent

**File:** `.agents/skills/personas/charter.md`

**Analytical Framework:**
- How utilized is this aircraft? (Flights per month, percentage of days with activity)
- What routes does it fly? (Route patterns = market demand signals)
- Are there dead legs or repositioning patterns? (Charter availability opportunities)
- Who is the operator? (Certificate holder = entity that can charter)
- Who is the manager? (Management company may broker charter)
- Is the aircraft for sale? (May signal charter exit or reduced charter commitment)
- What is the passenger capacity and range? (Market positioning)

**Executive Summary Bullets (4–7):**
1. Aircraft charter profile (model, range, pax capacity, category)
2. Utilization analysis (flights/month, activity rate)
3. Route patterns and market analysis
4. Operator and manager identification (charter certificate chain)
5. For-sale status and market implications
6. Dead leg or repositioning indicators (if detectable)
7. Competitive positioning notes

**Charter Takeaways (3):**
1. Utilization assessment (underutilized = charter opportunity, heavily utilized = competitive intel)
2. Operator/manager identity and charter capability
3. Route pattern value (overlap with demand, dead leg opportunities)

**Outreach Drafts:**
- `emailOperator`: To operator or manager. Inquiry about charter availability or partnership.
- `smsScheduler`: To scheduler. Quick availability check for specific route.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Operator relationship | 30 |
| Manager relationship | 25 |
| Scheduler / Dispatch | 25 |
| Chief Pilot | 10 |
| Owner | 5 |
| Email available | 5 |

---

### 7.5 Fleet Management Agent

**File:** `.agents/skills/personas/fleet_management.md`

**Analytical Framework:**
- What is the complete relationship structure? (All ownership, operator, and management layers)
- Is the ownership structure clean and verifiable? (Or are there gaps, layered entities, unclear chains?)
- How does this aircraft's utilization compare to model norms?
- Are there operational anomalies? (Sudden utilization changes, route pattern shifts)
- What is the asset's value context? (Age, market trends for the model)
- Are there any transaction history signals? (Recent sale, multiple transfers)

**Executive Summary Bullets (5–8):**
1. Aircraft identity and operational status
2. Complete relationship chain (owner → operator → manager with entity names)
3. Utilization benchmarking (this aircraft vs model average if estimable)
4. Operational pattern analysis (route consistency, schedule regularity)
5. Transaction history and ownership stability
6. Asset value context (market position of this model)
7. Operational team contacts (pilot, maintenance, scheduling)
8. Data completeness assessment

**Fleet Management Takeaways (3–5):**
1. Ownership chain status (clean, gaps, or concerns)
2. Utilization assessment vs expected norms
3. Operational anomalies or attention items
4. Asset valuation context
5. Contact roster completeness

**Outreach Drafts:** None (outreach disabled for this persona).

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Owner relationship | 25 |
| Operator relationship | 25 |
| Manager relationship | 20 |
| Chief Pilot / DOM | 15 |
| CFO / Controller | 10 |
| Scheduler | 5 |

---

### 7.6 Finance Agent

**File:** `.agents/skills/personas/finance.md`

**Analytical Framework:**
- **Valuation:** What is this aircraft worth? (Year, model, market trends, comparable transactions, for-sale status, days on market)
- **KYC — Ownership:** Who is the beneficial owner? Are there layered entities? Is the ownership chain transparent or opaque?
- **KYC — Flight Patterns:** Are there unusual flight patterns? (Jurisdictional flags, irregular frequency, routes to sanctioned regions)
- **Transaction History:** How often has this aircraft changed hands? Are there rapid flips? (Fraud signal)
- **Collateral Assessment:** Serial number, registration jurisdiction, lien indicators (if available from transaction data)

**Executive Summary Bullets (5–8):**
1. Aircraft collateral identity (serial, year, model, registration)
2. Ownership chain analysis (transparency level, entity layers)
3. Valuation context (model market trends, comparable sales, ask prices)
4. Transaction history analysis (frequency, buyers/sellers if available)
5. Flight pattern KYC analysis (jurisdictions visited, pattern regularity)
6. For-sale status and market days
7. Risk flags or unknowns
8. Data confidence and gaps

**Finance Takeaways (3–5):**
1. Valuation range estimate context (based on model market data)
2. Ownership transparency assessment (clean, layered, or opaque)
3. KYC flight pattern assessment (normal, flagged, or insufficient data)
4. Transaction velocity assessment (stable ownership or frequent transfers)
5. Data gaps that affect due diligence

**Compliance Flags:**
The Finance agent MUST include a `complianceFlags` array in its output:

```json
"complianceFlags": [
  {
    "category": "ownership_transparency",
    "severity": "medium",
    "detail": "Ownership chain includes 2 management entities between registered owner and operator"
  },
  {
    "category": "flight_pattern",
    "severity": "low",
    "detail": "All detected routes are domestic US corridors with regular patterns"
  }
]
```

Categories: `ownership_transparency`, `flight_pattern`, `transaction_velocity`, `data_gap`, `jurisdictional`
Severity: `low`, `medium`, `high`, `insufficient_data`

**Outreach Drafts:** None (outreach disabled for this persona).

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Owner relationship | 30 |
| Manager relationship | 25 |
| CFO / Controller | 25 |
| Operator relationship | 10 |
| Director of Aviation | 5 |
| Email available | 5 |

---

### 7.7 Catering Agent

**File:** `.agents/skills/personas/catering.md`

**Analytical Framework:**
- Where does this aircraft fly? (Destination airports = potential service locations)
- How often does it arrive at my target airports? (Frequency = recurring revenue potential)
- What is the cabin class and passenger capacity? (Order size estimation: 4-pax light jet vs 16-pax Globals = very different catering)
- When does it typically arrive? (Time-of-day patterns = meal type: breakfast, lunch, dinner, snacks)
- Who arranges provisioning? (Scheduler, Dispatch, Executive Assistant, Chief Pilot)
- Who is the management company? (Some management companies centralize catering procurement)

**Executive Summary Bullets (4–6):**
1. Aircraft cabin profile (pax capacity, category, cabin class)
2. Destination airport patterns (top airports, frequency)
3. Arrival timing analysis (meal window estimation)
4. Service procurement chain (who books catering for this aircraft)
5. Management company identification (centralized procurement signal)
6. Estimated provisioning volume (frequency × pax capacity)

**Catering Takeaways (3):**
1. Target airport opportunity (does this aircraft visit your service area?)
2. Order size and meal type estimation
3. Best contact for establishing catering relationship

**Outreach Drafts:**
- `emailScheduler`: To scheduler or dispatch. Introduces catering service, references aircraft by tail, mentions service area airports.
- `smsScheduler`: Quick intro text. Identifies catering provider, target airport, asks about upcoming trips.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Scheduler / Dispatch | 35 |
| Executive Assistant | 20 |
| Chief Pilot | 20 |
| Operator / Manager | 15 |
| Email available | 5 |
| Mobile available | 5 |

---

### 7.8 Ground Transportation Agent

**File:** `.agents/skills/personas/ground_transportation.md`

**Analytical Framework:**
- Where does this aircraft land? (Top destination airports = service locations)
- When does it arrive? (Time patterns = scheduling ground transport)
- How often? (Frequency = recurring account potential)
- Who are the passengers? (Owner/executive pathway → who actually rides in the car)
- Who schedules ground transport? (EA, Scheduler, Management company)
- What is the aircraft category? (Ultra-long-range = likely high-net-worth passengers = premium transport)

**Executive Summary Bullets (4–6):**
1. Top destination airports with frequency
2. Arrival timing patterns
3. Passenger profile estimation (based on aircraft category and owner type)
4. Transport scheduling contacts (EA, scheduler, management company)
5. Recurring account potential (frequency × routes)
6. Premium service indicators (aircraft type, owner profile)

**Ground Transportation Takeaways (3):**
1. Target market match (does this aircraft visit your service area?)
2. Passenger profile and service tier estimation
3. Best contact for ground transport scheduling

**Outreach Drafts:**
- `emailEA`: To executive assistant or management company. Professional introduction of ground transport services.
- `smsScheduler`: Quick outreach to scheduler about transport availability at target airport.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| Executive Assistant | 30 |
| Scheduler | 25 |
| Manager relationship | 20 |
| Operator relationship | 15 |
| Owner (passenger) | 5 |
| Mobile available | 5 |

---

### 7.9 Detailing Agent

**File:** `.agents/skills/personas/detailing.md`

**Analytical Framework:**
- Where is this aircraft based? (Home base = primary service location)
- How often does it fly? (Flight frequency = cleaning cycle. High-frequency aircraft need weekly detailing. Low-frequency may need pre-flight detailing.)
- What type and size is it? (Category and model = job scope, crew needed, pricing)
- Who schedules ground services? (DOM, Scheduler, Chief Pilot, Dispatch)
- Who is the operator/management company? (May centralize detailing procurement)
- Is it based at an FBO? (FBO relationship = referral pathway)

**Executive Summary Bullets (4–6):**
1. Aircraft type and size profile (model, category, approximate dimensions context)
2. Home base analysis (most frequent origin airport)
3. Flight frequency (detailing cycle estimation)
4. Service scheduling contacts
5. Operator/management company (procurement pathway)
6. FBO relationship indicator (if available)

**Detailing Takeaways (3):**
1. Home base match (is this aircraft based in your service area?)
2. Estimated detailing frequency need (based on utilization)
3. Best contact for establishing detailing relationship

**Outreach Drafts:**
- `emailOps`: To DOM, scheduler, or chief pilot. Introduces detailing service, references aircraft type, mentions service area.
- `smsOps`: Quick outreach to operations contact. Identifies detailing service, asks about current provider.

**Contact Ranking Weights:**
| Signal | Weight |
|--------|--------|
| DOM / Director of Maintenance | 30 |
| Scheduler / Dispatch | 25 |
| Chief Pilot | 20 |
| Operator / Manager | 15 |
| Email available | 5 |
| Mobile available | 5 |

---

## 8. AI Input/Output Schemas

### 8.1 Universal Output Schema (Base)

Every persona response includes these base fields:

```typescript
interface PersonaIntelResponseBase {
  meta: {
    regNbr: string;
    personaId: PersonaId;
    mode: string;
    generatedAt: string; // ISO 8601 UTC
  };
  executiveSummary: string[];           // 4–8 bullets
  personaTakeaways: string[];           // 3–5 persona-specific insights
  dataConfidence: {
    score: number;                      // 0–100
    explanation: string[];
    missingData: string[];
  };
  whoToContactFirst: Array<{
    contactId: number;
    companyId: number;
    recommendedChannel: string;
    reason: string;
  }>;
  recommendedNextActions: string[];     // ordered
  complianceNotes: string[];
}
```

### 8.2 Persona-Specific Extensions

**Dealer/Broker adds:**
```typescript
interface DealerBrokerResponse extends PersonaIntelResponseBase {
  brokerTakeaways: string[];            // alias for personaTakeaways
  marketContext?: {
    forSale: boolean;
    modelAvgAskingPrice?: number;
    modelAvgDaysOnMarket?: number;
    comparableCount?: number;
  };
  outreachDrafts: {
    emailPrimary: OutreachEmail;
    smsPrimary: OutreachSMS;
    emailOps: OutreachEmail;
  };
}
```

**FBO adds:**
```typescript
interface FBOResponse extends PersonaIntelResponseBase {
  aircraftServiceProfile: {
    category: string;
    fuelType?: string;
    estimatedFuelCapacity?: string;
    cabinClass?: string;
    passengerCapacity?: number;
    hangarRequirements?: string;        // "Large cabin", "Mid-size", etc.
  };
  visitPotential?: {
    topDestinations: Array<{ airport: string; frequency: number }>;
    estimatedVisitsPerQuarter?: number;
  };
  outreachDrafts: {
    emailCrew: OutreachEmail;
    smsCrew: OutreachSMS;
    emailPassenger: OutreachEmail;
  };
}
```

**MRO adds:**
```typescript
interface MROResponse extends PersonaIntelResponseBase {
  maintenanceProfile: {
    aircraftAge: number;
    estimatedUtilization?: string;      // "High", "Moderate", "Low", "Unknown"
    maintenanceWindowSignals: string[];
    recentSaleFlag: boolean;
    operatorFleetSize?: number;
  };
  outreachDrafts: {
    emailMaintenance: OutreachEmail;
    smsMaintenance: OutreachSMS;
    emailOperator: OutreachEmail;
  };
}
```

**Charter adds:**
```typescript
interface CharterResponse extends PersonaIntelResponseBase {
  utilizationAnalysis: {
    flightsPerMonth?: number;
    activityRate?: string;              // "High", "Moderate", "Low", "Unknown"
    routeConcentration?: string;
    deadLegIndicators?: string[];
  };
  charterMarketContext?: {
    forSale: boolean;
    operatorIdentified: boolean;
    managerIdentified: boolean;
  };
  outreachDrafts: {
    emailOperator: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}
```

**Fleet Management adds:**
```typescript
interface FleetManagementResponse extends PersonaIntelResponseBase {
  ownershipChainAnalysis: {
    layers: number;
    entities: string[];
    transparencyLevel: 'clear' | 'moderate' | 'opaque';
    gaps: string[];
  };
  utilizationBenchmark?: {
    thisAircraft: string;
    modelAverage?: string;
    assessment: string;
  };
  operationalAlerts: string[];
  assetValuationContext?: {
    modelMarketPosition: string;
    recentTransactionSignal?: string;
  };
  // No outreach drafts
}
```

**Finance adds:**
```typescript
interface FinanceResponse extends PersonaIntelResponseBase {
  valuationContext: {
    modelForSaleCount?: number;
    avgAskingPrice?: number;
    avgDaysOnMarket?: number;
    comparableTransactions?: Array<{
      date: string;
      price?: number;
      regNbr?: string;
    }>;
    valuationAssessment: string;
  };
  kycAnalysis: {
    ownershipTransparency: 'clear' | 'moderate' | 'opaque' | 'insufficient_data';
    ownershipLayers: number;
    flightPatternAssessment: string;
    jurisdictionalNotes: string[];
    transactionVelocity: string;
  };
  complianceFlags: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'insufficient_data';
    detail: string;
  }>;
  // No outreach drafts
}
```

**Catering adds:**
```typescript
interface CateringResponse extends PersonaIntelResponseBase {
  provisioningProfile: {
    passengerCapacity?: number;
    cabinClass?: string;
    estimatedOrderSize: string;         // "Light (2-4 pax)", "Medium (6-9 pax)", "Heavy (10+)"
  };
  arrivalAnalysis?: {
    topAirports: Array<{ code: string; frequency: number }>;
    timeOfDayPattern?: string;
    mealWindowEstimate?: string;
  };
  outreachDrafts: {
    emailScheduler: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}
```

**Ground Transportation adds:**
```typescript
interface GroundTransportResponse extends PersonaIntelResponseBase {
  destinationAnalysis?: {
    topAirports: Array<{ code: string; frequency: number }>;
    arrivalTimingPattern?: string;
  };
  passengerProfile: {
    aircraftCategory: string;
    estimatedServiceTier: string;       // "Premium", "Standard", "VIP"
    recurringAccountPotential: string;
  };
  outreachDrafts: {
    emailEA: OutreachEmail;
    smsScheduler: OutreachSMS;
  };
}
```

**Detailing adds:**
```typescript
interface DetailingResponse extends PersonaIntelResponseBase {
  serviceProfile: {
    aircraftCategory: string;
    modelSize: string;                  // "Light", "Midsize", "Super-Mid", "Large", "Ultra-Long-Range"
    estimatedJobScope: string;
  };
  homeBaseAnalysis?: {
    estimatedBase: string;
    confidence: string;
    basedOnFlights: number;
  };
  detailingCycleEstimate?: {
    flightFrequency: string;
    recommendedFrequency: string;       // "Weekly", "Bi-weekly", "Monthly", "Pre-flight"
  };
  outreachDrafts: {
    emailOps: OutreachEmail;
    smsOps: OutreachSMS;
  };
}
```

### 8.3 Shared Types

```typescript
interface OutreachEmail {
  to: string[];
  subject: string;
  body: string;
}

interface OutreachSMS {
  to: string[];
  body: string;
}
```

---

## 9. Persona-Specific Dashboards

Each persona gets a tailored home screen and search results layout.

### 9.1 Dashboard Home Screen (Before Search)

| Persona | Home Screen Widgets |
|---------|-------------------|
| Dealer/Broker | "Search a tail number" + Recent searches + Market snapshot |
| FBO | "Search a tail number" + "What's flying into [your airport]?" prompt + Recent lookups |
| MRO | "Search a tail number" + Recent lookups + Maintenance tip of the day |
| Charter | "Search a tail number" + "Check availability on a tail" + Recent lookups |
| Fleet Management | "Search a tail number" + Fleet watchlist (future) + Recent lookups |
| Finance | "Search a tail number" + "Run KYC on a tail" + Recent lookups |
| Catering | "Search a tail number" + "Who's flying into [airport]?" + Recent lookups |
| Ground Transport | "Search a tail number" + "Where does [tail] land?" + Recent lookups |
| Detailing | "Search a tail number" + "Where is [tail] based?" + Recent lookups |

### 9.2 Search Results Layout

After a tail number search, the results page is organized by persona widgets (from persona config `dashboardWidgets`). The layout follows a consistent pattern but with different widget stacks:

```
┌─────────────────────────────────────────┐
│  Aircraft Header (universal)            │
│  {regNbr} — {model} — {year}           │
│  [Photo if available]                   │
├─────────────────────────────────────────┤
│  AI Executive Summary (persona-shaped)  │
│  • Bullet 1                             │
│  • Bullet 2                             │
│  • ...                                  │
├─────────────────────────────────────────┤
│  Persona Takeaways (highlighted box)    │
│  Key insight 1                          │
│  Key insight 2                          │
│  Key insight 3                          │
├─────────────────────────────────────────┤
│  [PERSONA-SPECIFIC WIDGET STACK]        │
│  (varies by persona — see config)       │
├─────────────────────────────────────────┤
│  Top Contacts (persona-ranked)          │
│  Contact cards with role-relevant       │
│  actions (call, text, email)            │
├─────────────────────────────────────────┤
│  Data Confidence Meter                  │
│  Score: 72/100                          │
│  Missing: transaction history, ...      │
├─────────────────────────────────────────┤
│  Recommended Next Actions               │
│  1. Action 1                            │
│  2. Action 2                            │
├─────────────────────────────────────────┤
│  [Copy Contact Pack]  [Add to Contacts] │
└─────────────────────────────────────────┘
```

---

## 10. Outreach Engine

### 10.1 Which Personas Get Outreach

| Persona | Outreach Enabled | Rationale |
|---------|-----------------|-----------|
| Dealer/Broker | Yes | Cold outreach is the core workflow |
| FBO | Yes | Service introduction to crew and passengers |
| MRO | Yes | Maintenance service introduction |
| Charter | Yes | Availability inquiries and partnerships |
| Fleet Management | No | Internal operations, not outbound sales |
| Finance | No | Due diligence, not outbound sales |
| Catering | Yes | Service introduction to schedulers |
| Ground Transport | Yes | Service introduction to EAs and schedulers |
| Detailing | Yes | Service introduction to operations contacts |

### 10.2 Outreach Template Rules

All outreach drafts must:
- Reference the tail number in the subject or opening
- Use first name of recipient
- Stay within word/character limits (`emailWords: 140`, `smsChars: 240`)
- Open in native composer (mailto:, sms:, tel:) — never auto-send
- Only use email addresses and phone numbers present in the input payload
- Match the persona's professional context (a caterer does not sound like a broker)

### 10.3 Subject Line Templates by Persona

| Persona | Subject Options |
|---------|----------------|
| Dealer/Broker | "Quick question on {regNbr}" / "{regNbr} availability" / "Interest in your {model}" |
| FBO | "FBO services for {regNbr}" / "Hangar and fuel services — {model}" |
| MRO | "Maintenance inquiry — {regNbr}" / "{model} service availability" |
| Charter | "Charter availability — {regNbr}" / "{model} positioning" |
| Catering | "Catering services for {regNbr} flights" / "In-flight catering — {model}" |
| Ground Transport | "Ground transport for {regNbr} arrivals" / "VIP transport services" |
| Detailing | "Aircraft detailing — {regNbr}" / "{model} exterior and interior detailing" |

---

## 11. Confidence Scoring (Universal)

All personas use the same base confidence rubric, with persona-specific penalty weighting.

### 11.1 Base Rubric

Start at 100. Subtract:

| Missing Data | Base Penalty |
|-------------|-------------|
| `recommendations` empty | -40 |
| `contacts` empty | -25 |
| `companies` empty | -20 |
| `flightIntel.available` is false/missing | -25 |
| `transactionsIntel.available` is false/missing | -25 |
| `marketIntel.available` is false/missing | -15 |

Clamp 0–100.

### 11.2 Persona-Specific Penalty Adjustments

Some data matters more to some personas. Apply a multiplier to the base penalty:

| Missing Data | Broker | FBO | MRO | Charter | Fleet | Finance | Catering | Ground | Detailing |
|-------------|--------|-----|-----|---------|-------|---------|----------|--------|-----------|
| recommendations | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| contacts | 1.0 | 1.0 | 1.0 | 0.8 | 0.6 | 0.6 | 1.0 | 1.0 | 1.0 |
| companies | 1.0 | 0.8 | 1.0 | 1.0 | 1.0 | 1.0 | 0.6 | 0.6 | 0.6 |
| flightIntel | 0.6 | 1.2 | 0.8 | 1.2 | 1.0 | 1.0 | 1.2 | 1.2 | 1.0 |
| transactionsIntel | 1.0 | 0.4 | 0.6 | 0.4 | 0.8 | 1.2 | 0.2 | 0.2 | 0.2 |
| marketIntel | 1.0 | 0.2 | 0.2 | 0.6 | 0.8 | 1.2 | 0.0 | 0.0 | 0.0 |

Example: FBO persona, flight intel missing → base penalty 25 × multiplier 1.2 = 30 point deduction.

---

## 12. Deterministic Guardrails

These rules apply to ALL persona agents. Include in every skill file.

### 12.1 No Hallucination

Claude can ONLY reference:
- Aircraft fields present in `aircraft`
- Relationship facts present in `companies` / `contacts` / `recommendations`
- Flight facts present in `flightIntel`
- Transaction facts present in `transactionsIntel`
- Market facts present in `marketIntel`

If something is not in the payload, it is unknown. Say so. Do not invent.

### 12.2 No Sensitive Inference

Claude must NOT:
- Identify aircraft as belonging to celebrities, politicians, or specific public figures unless the payload explicitly names them
- Infer tax strategies, legal disputes, or regulatory violations
- Speculate about the purpose of specific flights
- Claim flight activity exists when `flightIntel` is missing or `available: false`

### 12.3 Output Validation Rules

- `generatedAt` must be ISO 8601 UTC
- All `to` arrays in outreach must be subsets of emails/phones in the input
- Email body must be within `request.maxOutreachLength.emailWords`
- SMS body must be within `request.maxOutreachLength.smsChars`
- Response must be valid JSON with no markdown, no backticks, no commentary
- All required keys must be present

### 12.4 Graceful Degradation

When data is missing, the agent must:
1. Still return a complete response structure (no missing keys)
2. Populate summaries with what IS known
3. Explicitly note what is missing in `dataConfidence.explanation` and `missingData`
4. Empty outreach `to` arrays when no eligible recipients exist
5. Never error — degrade gracefully

---

## 13. JETNET Endpoints by Persona

Which JETNET endpoints each persona needs (all go through the shared proxy).

| Endpoint | Broker | FBO | MRO | Charter | Fleet | Finance | Catering | Ground | Detailing |
|----------|--------|-----|-----|---------|-------|---------|----------|--------|-----------|
| getRegNumber | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| getPictures | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | ○ | ○ | ✓ |
| getRelationships | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| getFlightDataPaged | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| getHistoryListPaged | ✓ | ○ | ✓ | ○ | ✓ | ✓ | ○ | ○ | ○ |
| getModelMarketTrends | ✓ | ○ | ○ | ✓ | ✓ | ✓ | ○ | ○ | ○ |
| getModelPerformanceSpecs | ○ | ✓ | ✓ | ✓ | ✓ | ○ | ✓ | ○ | ✓ |
| getCondensedOwnerOperators | ○ | ○ | ○ | ○ | ✓ | ✓ | ○ | ○ | ○ |

✓ = Always fetch | ○ = Fetch if available, not critical

### Optimization

Fetch in 3 tiers:
1. **Critical (blocking):** getRegNumber → ACID
2. **Primary (parallel):** getRelationships + getFlightDataPaged + getPictures
3. **Secondary (parallel, persona-conditional):** getHistoryListPaged + getModelMarketTrends + getModelPerformanceSpecs

Only fetch Tier 3 endpoints that are marked ✓ for the active persona.

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Week 1–2)

- [ ] Add `PersonaId` type and `PersonaConfig` definitions to `shared/types/`
- [ ] Create persona selector screen in Expo app
- [ ] Update auth flow to include `personaId` on login
- [ ] Store `personaId` on server session
- [ ] Add "Change Persona" to Settings screen
- [ ] Create all 9 persona skill files in `.agents/skills/personas/`
- [ ] Build agent dispatcher (`server/agents/dispatcher.ts`)

### Phase 2: AI Integration (Week 2–3)

- [ ] Define all 9 output schemas in `shared/types/persona-responses.ts`
- [ ] Implement persona-specific system prompts in skill files
- [ ] Implement confidence scoring with persona-weighted penalties
- [ ] Implement contact ranking with persona-specific weights
- [ ] Wire agent dispatcher to Claude API
- [ ] Add response validation layer

### Phase 3: Persona Dashboards (Week 3–4)

- [ ] Create persona-specific home screen widgets
- [ ] Create persona-specific search result layouts
- [ ] Implement widget components for each persona's unique panels
- [ ] Wire persona takeaways and executive summary to UI
- [ ] Implement data confidence meter component

### Phase 4: Outreach Engine (Week 4)

- [ ] Implement outreach draft rendering per persona
- [ ] Wire mailto:, sms:, tel: links to native composers
- [ ] Implement Contact Pack copy (persona-formatted)
- [ ] Implement Add to Contacts (persona-relevant fields)
- [ ] Disable outreach UI for Fleet Management and Finance personas

### Phase 5: Polish and Testing (Week 5)

- [ ] Test all 9 personas with real tail numbers
- [ ] Validate AI outputs against schemas
- [ ] Test graceful degradation (missing flight data, empty contacts, etc.)
- [ ] Test persona switching without re-auth
- [ ] Performance optimization (Tier 3 endpoint skipping)
- [ ] UI polish and persona icon/color theming

---

## 15. File Structure

```
Jetnet-Insight-Summary/
├── .agents/
│   └── skills/
│       └── personas/
│           ├── dealer_broker.md
│           ├── fbo.md
│           ├── mro.md
│           ├── charter.md
│           ├── fleet_management.md
│           ├── finance.md
│           ├── catering.md
│           ├── ground_transportation.md
│           └── detailing.md
├── shared/
│   └── types/
│       ├── persona.ts                    # PersonaId, PersonaConfig
│       ├── persona-responses.ts          # All 9 response schemas
│       ├── persona-intel-payload.ts      # Universal input schema
│       └── outreach.ts                   # OutreachEmail, OutreachSMS
├── server/
│   ├── agents/
│   │   ├── dispatcher.ts                 # Agent routing logic
│   │   ├── confidence.ts                 # Confidence scoring engine
│   │   ├── contact-ranker.ts             # Persona-weighted contact ranking
│   │   └── validators/
│   │       ├── base-validator.ts         # Universal output validation
│   │       └── persona-validators.ts     # Per-persona schema validation
│   ├── routes/
│   │   └── persona.ts                    # POST /api/persona/set, GET /api/persona/current
│   └── jetnet/
│       └── fetch-pipeline.ts             # Tiered JETNET data fetch
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── persona-select.tsx            # Persona selection screen
│   ├── (tabs)/
│   │   └── index.tsx                     # Persona-aware dashboard home
│   ├── search/
│   │   └── [regNbr].tsx                  # Persona-aware search results
│   └── settings/
│       └── persona.tsx                   # Change persona screen
├── components/
│   ├── persona/
│   │   ├── PersonaSelector.tsx
│   │   ├── PersonaBadge.tsx
│   │   └── PersonaHeader.tsx
│   ├── widgets/
│   │   ├── AircraftProfile.tsx           # Universal
│   │   ├── ExecutiveSummary.tsx           # Universal (persona-shaped content)
│   │   ├── DataConfidenceMeter.tsx        # Universal
│   │   ├── ContactList.tsx               # Universal (persona-ranked)
│   │   ├── OutreachActions.tsx           # Personas with outreach
│   │   ├── MarketContext.tsx             # Broker, Charter, Fleet, Finance
│   │   ├── FlightPatternMap.tsx          # FBO, Charter, Catering, Ground, Detailing
│   │   ├── UtilizationAnalysis.tsx       # MRO, Charter, Fleet, Detailing
│   │   ├── OwnershipChain.tsx            # Broker, Fleet, Finance
│   │   ├── KYCAnalysis.tsx               # Finance
│   │   ├── ComplianceFlags.tsx           # Finance
│   │   ├── MaintenanceProfile.tsx        # MRO
│   │   ├── ArrivalAnalysis.tsx           # Catering, Ground
│   │   └── HomeBaseAnalysis.tsx          # Detailing
│   └── contact-pack/
│       └── ContactPack.tsx               # Persona-formatted copy
├── constants/
│   ├── personas.ts                       # All 9 PersonaConfig objects
│   └── contact-weights.ts               # Per-persona ranking weights
└── contexts/
    └── PersonaContext.tsx                 # React context for active persona
```

---

## 16. Validation Checklist

Before shipping each persona:

### AI Output Validation
- [ ] Response parses as valid JSON
- [ ] All required keys present per persona schema
- [ ] `meta.personaId` matches the active persona
- [ ] `generatedAt` is valid ISO 8601 UTC
- [ ] `to` arrays in outreach are subsets of input payload contacts
- [ ] Email body word count ≤ `maxOutreachLength.emailWords`
- [ ] SMS body character count ≤ `maxOutreachLength.smsChars`
- [ ] No markdown or backticks in response
- [ ] `dataConfidence.score` is 0–100 and matches rubric
- [ ] `complianceFlags` present for Finance persona

### UI Validation
- [ ] Persona selector renders all 9 personas
- [ ] Selected persona persists across app restart
- [ ] Dashboard renders correct widgets for persona
- [ ] Search results show persona-specific takeaways
- [ ] Outreach actions hidden for Fleet Management and Finance
- [ ] Contact ranking reflects persona weights
- [ ] Contact Pack copy is persona-formatted
- [ ] Data Confidence meter renders correctly
- [ ] Graceful UI when data is missing (no blank screens, no errors)

### Integration Validation
- [ ] Persona ID flows from login → session → AI agent → response → UI
- [ ] Persona change in Settings refreshes dashboard
- [ ] JETNET endpoint tier skipping works (secondary endpoints only fetched when persona needs them)
- [ ] All 9 personas tested with a real tail number
- [ ] All 9 personas tested with minimal data (empty contacts, no flights)

---

## Appendix A: Persona Config Constants

```typescript
// constants/personas.ts

import { PersonaConfig, PersonaId } from '../shared/types/persona';

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  dealer_broker: {
    id: 'dealer_broker',
    label: 'Dealer / Broker',
    icon: 'handshake',
    coreMission: 'Identify ownership, assess market position, initiate acquisition or sale conversations',
    primaryContacts: ['Owner', 'Operator', 'Manager', 'CFO', 'Controller'],
    secondaryContacts: ['Chief Pilot', 'Director of Aviation', 'DOM'],
    dataPriorities: ['relationships', 'transactionsIntel', 'marketIntel', 'flightIntel'],
    reportTone: 'Concise, direct, deal-oriented. No fluff.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_profile', 'ownership_chain', 'market_position',
      'comparable_sales', 'top_contacts', 'outreach_actions', 'contact_pack'
    ],
  },
  fbo: {
    id: 'fbo',
    label: 'FBO',
    icon: 'building-2',
    coreMission: 'Understand aircraft types and the people associated with them to capture transient and based traffic',
    primaryContacts: ['Chief Pilot', 'Scheduler', 'Dispatch', 'DOM'],
    secondaryContacts: ['Owner', 'Operator', 'Manager', 'Executive Assistant'],
    dataPriorities: ['aircraft_type', 'flightIntel', 'relationships', 'contacts'],
    reportTone: 'Operational, hospitality-aware. Focus on aircraft needs and people.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_profile_fbo', 'flight_pattern_map', 'visit_frequency',
      'crew_contacts', 'passenger_pathway', 'service_opportunity_notes'
    ],
  },
  mro: {
    id: 'mro',
    label: 'MRO',
    icon: 'wrench',
    coreMission: 'Assess maintenance opportunity based on aircraft age, type, utilization, and decision-maker access',
    primaryContacts: ['DOM', 'Chief Pilot', 'Director of Maintenance', 'Director of Aviation'],
    secondaryContacts: ['Operator', 'Manager', 'Scheduler'],
    dataPriorities: ['aircraft_profile', 'flightIntel', 'relationships', 'transactionsIntel'],
    reportTone: 'Technical, practical. Reference model-specific maintenance considerations.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_technical_profile', 'utilization_estimate', 'maintenance_window_signals',
      'operator_fleet_size', 'maintenance_decision_makers', 'outreach_actions'
    ],
  },
  charter: {
    id: 'charter',
    label: 'Charter',
    icon: 'plane',
    coreMission: 'Assess aircraft availability, utilization patterns, and competitive positioning in the charter market',
    primaryContacts: ['Operator', 'Manager', 'Scheduler', 'Dispatch'],
    secondaryContacts: ['Chief Pilot', 'Owner'],
    dataPriorities: ['flightIntel', 'relationships', 'aircraft_profile', 'marketIntel'],
    reportTone: 'Market-aware, operational. Focus on availability and utilization.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_charter_profile', 'utilization_analysis', 'route_heatmap',
      'dead_leg_indicators', 'operator_identification', 'charter_market_context', 'outreach_actions'
    ],
  },
  fleet_management: {
    id: 'fleet_management',
    label: 'Fleet Management',
    icon: 'layout-grid',
    coreMission: 'Monitor operational health, ownership structure, and utilization across managed or tracked aircraft',
    primaryContacts: ['Owner', 'Operator', 'Manager', 'Chief Pilot', 'DOM'],
    secondaryContacts: ['CFO', 'Controller', 'Scheduler'],
    dataPriorities: ['relationships', 'flightIntel', 'transactionsIntel', 'aircraft_profile', 'marketIntel'],
    reportTone: 'Analytical, operations-focused. Benchmark-oriented.',
    outreachEnabled: false,
    dashboardWidgets: [
      'aircraft_operational_profile', 'ownership_chain_verification', 'utilization_benchmark',
      'flight_pattern_analysis', 'fleet_context_panel', 'operational_alerts', 'asset_valuation_context'
    ],
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    icon: 'landmark',
    coreMission: 'Fleet valuation, KYC due diligence on aircraft ownership, and flight pattern analysis for compliance',
    primaryContacts: ['Owner', 'Manager', 'CFO', 'Controller'],
    secondaryContacts: ['Operator', 'Director of Aviation'],
    dataPriorities: ['transactionsIntel', 'marketIntel', 'relationships', 'flightIntel', 'aircraft_profile'],
    reportTone: 'Analytical, compliance-aware. Flag unknowns explicitly. No speculation.',
    outreachEnabled: false,
    dashboardWidgets: [
      'aircraft_collateral_profile', 'ownership_chain_deep', 'valuation_context',
      'transaction_timeline', 'kyc_flight_analysis', 'compliance_flags', 'data_confidence_panel'
    ],
  },
  catering: {
    id: 'catering',
    label: 'Catering',
    icon: 'utensils',
    coreMission: 'Identify inbound aircraft to target airports and connect with the people who arrange provisioning',
    primaryContacts: ['Scheduler', 'Dispatch', 'Executive Assistant', 'Chief Pilot'],
    secondaryContacts: ['Operator', 'Manager'],
    dataPriorities: ['flightIntel', 'aircraft_profile', 'relationships', 'contacts'],
    reportTone: 'Service-oriented, practical. Focus on timing and logistics.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_cabin_profile', 'arrival_pattern_analysis', 'service_window_estimate',
      'provisioning_contacts', 'outreach_actions'
    ],
  },
  ground_transportation: {
    id: 'ground_transportation',
    label: 'Ground Transportation',
    icon: 'car',
    coreMission: 'Identify where aircraft land, when they arrive, and who needs ground transport',
    primaryContacts: ['Executive Assistant', 'Scheduler', 'Manager'],
    secondaryContacts: ['Operator', 'Chief Pilot', 'Dispatch'],
    dataPriorities: ['flightIntel', 'relationships', 'contacts', 'aircraft_profile'],
    reportTone: 'Service-oriented, logistics-focused. Lead with where and when.',
    outreachEnabled: true,
    dashboardWidgets: [
      'destination_analysis', 'arrival_timing_patterns', 'passenger_pathway_contacts',
      'aircraft_category_context', 'outreach_actions'
    ],
  },
  detailing: {
    id: 'detailing',
    label: 'Detailing',
    icon: 'sparkles',
    coreMission: 'Identify where aircraft are based, how often they fly, and who schedules ground services',
    primaryContacts: ['Scheduler', 'DOM', 'Chief Pilot', 'Dispatch'],
    secondaryContacts: ['Operator', 'Manager'],
    dataPriorities: ['flightIntel', 'aircraft_profile', 'relationships', 'contacts'],
    reportTone: 'Practical, service-oriented. Focus on location, frequency, and access.',
    outreachEnabled: true,
    dashboardWidgets: [
      'aircraft_size_profile', 'home_base_analysis', 'flight_frequency',
      'service_scheduling_contacts', 'outreach_actions'
    ],
  },
};
```

---

## Appendix B: Contact Ranking Weight Constants

```typescript
// constants/contact-weights.ts

import { PersonaId } from '../shared/types/persona';

export type ContactSignal =
  | 'owner' | 'operator' | 'manager'
  | 'chief_pilot' | 'dom' | 'scheduler' | 'dispatch'
  | 'cfo' | 'controller' | 'director_aviation'
  | 'executive_assistant'
  | 'email_available' | 'mobile_available';

export const CONTACT_WEIGHTS: Record<PersonaId, Record<ContactSignal, number>> = {
  dealer_broker:        { owner: 30, operator: 25, manager: 20, chief_pilot: 5,  dom: 0,  scheduler: 0,  dispatch: 0,  cfo: 15, controller: 10, director_aviation: 10, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  fbo:                  { owner: 10, operator: 20, manager: 15, chief_pilot: 20, dom: 10, scheduler: 30, dispatch: 20, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 10, email_available: 5, mobile_available: 5 },
  mro:                  { owner: 0,  operator: 20, manager: 10, chief_pilot: 25, dom: 35, scheduler: 5,  dispatch: 5,  cfo: 0,  controller: 0,  director_aviation: 15, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  charter:              { owner: 5,  operator: 30, manager: 25, chief_pilot: 10, dom: 0,  scheduler: 25, dispatch: 20, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  fleet_management:     { owner: 25, operator: 25, manager: 20, chief_pilot: 15, dom: 10, scheduler: 5,  dispatch: 5,  cfo: 10, controller: 5,  director_aviation: 10, executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  finance:              { owner: 30, operator: 10, manager: 25, chief_pilot: 0,  dom: 0,  scheduler: 0,  dispatch: 0,  cfo: 25, controller: 20, director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
  catering:             { owner: 0,  operator: 15, manager: 10, chief_pilot: 20, dom: 5,  scheduler: 35, dispatch: 25, cfo: 0,  controller: 0,  director_aviation: 0,  executive_assistant: 20, email_available: 5, mobile_available: 5 },
  ground_transportation:{ owner: 5,  operator: 15, manager: 20, chief_pilot: 10, dom: 0,  scheduler: 25, dispatch: 15, cfo: 0,  controller: 0,  director_aviation: 0,  executive_assistant: 30, email_available: 5, mobile_available: 5 },
  detailing:            { owner: 0,  operator: 15, manager: 10, chief_pilot: 20, dom: 30, scheduler: 25, dispatch: 15, cfo: 0,  controller: 0,  director_aviation: 5,  executive_assistant: 0,  email_available: 5, mobile_available: 5 },
};
```

---

## Appendix C: Prompt Template (Universal)

### System Prompt Structure (loaded from skill file)

```
You are an AI agent embedded in a {persona.label}-focused aviation intelligence app.

Your mission: {persona.coreMission}

You will receive a JSON payload containing aircraft data, company relationships, contacts,
and optional flight, transaction, and market intelligence.

You MUST return ONLY valid JSON matching the {PersonaId}IntelResponse schema.

Your analytical lens:
{persona-specific analytical framework from Section 7}

Contact priority order:
Primary: {persona.primaryContacts}
Secondary: {persona.secondaryContacts}

Tone: {persona.reportTone}

CONSTRAINTS — THESE ARE ABSOLUTE:
- Only use information present in the payload
- If information is missing, say it is unknown
- Never invent owners, operators, contacts, companies, titles, emails, phones, airports, or flights
- Never claim flight activity exists unless flightIntel.available is true and contains flights
- Never infer private details without explicit evidence in the payload
- Return ONLY valid JSON — no markdown, no backticks, no commentary
```

### User Prompt

```
Persona: {personaId}
Operation: all
Return JSON only.

Payload:
{PersonaIntelPayload JSON}
```

---

*End of Persona Engine Specification*
