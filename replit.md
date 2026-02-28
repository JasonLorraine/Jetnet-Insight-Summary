# Hot or Not for Jets

Aircraft sales intelligence mobile app built with React Native (Expo) and Express backend.

## Architecture

- **Frontend**: Expo (React Native) with file-based routing via expo-router, running on port 8081
- **Backend**: Express.js with TypeScript, running on port 5000
- **Transport**: REST API between client and server; MCP server at `/mcp` for AI assistant integration

## Key Features

1. **JETNET Integration**: Session-managed authentication with auto-refresh, parallel data fetching (Golden Path), automatic re-login on 401 (stored credentials)
2. **Hot/Not Scoring**: Deterministic 0-100 score with 9 weighted factors (liquidity, model market momentum, DOM, age, transactions, utilization, ownership, completeness, contact accessibility)
3. **Owner Disposition Intelligence**: Sell probability (0-100) with archetype classification, brand loyalty, replacement cycle, fleet analysis, and contact accessibility scoring
4. **Ownership Surface**: Company profile (type, HQ, industry), key contacts with role signals (Decision Maker / Influencer / Operational), horizontal fleet strip with deep navigation, Evolution company links
5. **Aircraft Specs**: Full technical specifications via `getAircraft` endpoint — powerplant (engine model/count/program/APU), performance (range/speed/MTOW/fuel), cabin (seats/config/Wi-Fi/refurb), airframe (total time/landings/paint), avionics (suite/operation type); displayed in collapsible grouped layout
6. **Broker Contact Intelligence**: Relationships-first enrichment via `getRelationships` → normalized graph → broker ranking engine (0-100 score) → tiered contacts (Primary / Aviation Ops / Finance-Admin / Secondary / Historical). Role badges (Owner Rep, Operator, Management, DOM, Chief Pilot, Scheduler, Controller/CFO). Dedup by contactId across companies/roles. Contact actions: tap-to-call, tap-to-text, tap-to-email, add-to-contacts. Prefilled outreach templates. "Copy Contact Pack" for CRM paste. 24h in-memory caching by ACID.
7. **All Contacts Screen**: FlatList of all ranked broker contacts with filter chips (Primary, Aviation Ops, Finance/Admin, Secondary), search by name/company/title, sorted by score desc.
8. **AI Broker Summaries**: BYO OpenAI or Anthropic API key, stored securely on-device; two summary modes: (a) Insight Summary — ownership, market, transactions; (b) Flight Intelligence — 12-month behavioral analysis with flight analyzer metrics (trend slope, charter detection, pre-sale signals, downtime, route repetition, base airport, international ratio). Flight data pipeline: multi-page fetching (up to 5 pages), flexible JETNET response key detection (tries 10+ key variants + fallback to first array property), partial record tolerance (unparseable dates get fallback, missing airports still counted), graceful "no usable flights" 200 response with fallback to standard summary (no 404)
9. **Evolution Deep Links**: Direct links to JETNET Evolution for each aircraft and company
10. **MCP Server**: Streamable HTTP transport at `/mcp` with 5 tools and 3 prompts for Siri/AI assistant integration
11. **Persona Engine**: 9-persona system with per-persona AI agents, contact ranking, confidence scoring, and outreach templates (see Persona Engine section below)

## Persona Engine

The app supports 9 distinct business personas, each with its own AI agent, contact ranking weights, confidence scoring, and outreach templates.

### Personas
- **Dealer/Broker** (`dealer_broker`): Deal intel & acquisition/resale outreach
- **FBO** (`fbo`): Traffic patterns & crew/passenger service intel
- **MRO** (`mro`): Maintenance opportunity identification
- **Charter** (`charter`): Utilization analysis & operator identification
- **Fleet Management** (`fleet_management`): Ops health benchmarking (no outreach)
- **Finance** (`finance`): Valuation & KYC analysis (no outreach)
- **Catering** (`catering`): Arrival provisioning intel
- **Ground Transportation** (`ground_transportation`): Destination logistics
- **Detailing** (`detailing`): Home base & cleaning cycle intel

### Persona Flow
1. Login → if no persona set → `/select-persona` (3×3 grid)
2. Persona stored locally (SecureStore/localStorage key: `hotornot_persona_id`) and server-side on session
3. Change persona from Settings → "Active Persona" section → "Change Persona"
4. Changing persona clears cached AI data (`queryClient.removeQueries`)

### Persona Architecture
- **Types**: `shared/types/persona.ts` — PersonaId union, PersonaConfig, PersonaIntelPayload, all 9 response interfaces
- **Constants**: `constants/personas.ts` — Full PERSONAS record; `constants/contact-weights.ts` — ContactSignal + CONTACT_WEIGHTS per persona + CONFIDENCE_PENALTY_MULTIPLIERS
- **Context**: `contexts/PersonaContext.tsx` — Active persona state, SecureStore persistence, server sync
- **Agent Dispatcher**: `server/agents/dispatcher.ts` — Loads skill file, builds system/user prompts, calls LLM (OpenAI/Anthropic), merges confidence into response
- **Confidence Scoring**: `server/agents/confidence.ts` — Base rubric (start 100, subtract penalties × persona multipliers), clamp 0–100
- **Contact Ranker**: `server/agents/contact-ranker.ts` — Persona-aware ranking using CONTACT_WEIGHTS, supersedes broker-only ranker for persona routes
- **Skill Files**: `.agents/skills/personas/*.md` — 9 markdown skill files loaded by dispatcher (Identity, Mission, Lens, Contact Ranking, Outreach, Tone, Constraints)

### Persona API
- `POST /api/auth/persona` — Set active persona on session
- `GET /api/auth/persona` — Get current persona from session
- `POST /api/aircraft/:registration/persona-intel` — Full persona-specific AI intelligence (body: `{ personaId?, provider, apiKey, maxTokens? }`)

## Project Structure

```
app/                          # Expo Router screens
  _layout.tsx                 # Root layout with providers
  index.tsx                   # Welcome/onboarding screen
  login.tsx                   # JETNET login modal
  setup-llm.tsx               # AI provider configuration modal
  search.tsx                  # Main search screen (after auth)
  settings.tsx                # Settings modal
  select-persona.tsx          # Persona selector (3×3 grid, modal)
  aircraft/[registration].tsx # Aircraft profile detail
  contacts/[registration].tsx # All Contacts screen (filtered, searchable)
  summary/[registration].tsx  # AI summary generation

components/                   # Reusable UI components
  AircraftCard.tsx            # Aircraft header card with Hot/Not pill
  ScoreGauge.tsx              # Circular score gauge and pill badge
  FactorBar.tsx               # Horizontal bar for scoring factors
  OwnerCard.tsx               # Owner intelligence panel
  CompanyCard.tsx             # Operating entity card (company profile + Evolution link)
  ContactRow.tsx              # ContactRow (legacy) + BrokerContactRow (ranked, with role badges + actions)
  FleetItem.tsx               # Fleet list row item (supports horizontal scroll)
  SpecsSection.tsx            # Aircraft specs display (collapsible groups)
  SkeletonLoader.tsx          # Loading skeleton shimmer
  SummaryCard.tsx             # AI summary display
  ErrorBoundary.tsx           # Error boundary component

contexts/
  AuthContext.tsx              # Auth state, JETNET session, LLM config, recent searches
  PersonaContext.tsx           # Active persona state, SecureStore persistence, server sync

constants/
  colors.ts                   # Dark aviation theme with score colors
  personas.ts                 # All 9 persona configs (id, label, icon, mission, contacts, widgets)
  contact-weights.ts          # Per-persona contact signal weights + confidence penalty multipliers

shared/
  types.ts                    # TypeScript interfaces shared between client and server (includes BrokerContact, RelationshipGraph, IntelResponse, etc.)
  types/
    persona.ts                # Persona types: PersonaId, PersonaConfig, PersonaIntelPayload, all 9 response interfaces

lib/
  query-client.ts             # React Query client with auth headers + automatic 401 re-login

server/
  index.ts                    # Express app setup, CORS, body parsing, logging
  routes.ts                   # API route registration + MCP mount + relationships intel route + persona intel route
  jetnet/
    session.ts                # JETNET session management (login, refresh, request)
    api.ts                    # JETNET API wrapper functions
  services/
    profileBuilder.ts         # Orchestrates Golden Path parallel fetch
    relationshipsService.ts   # Normalizes raw getRelationships into RelationshipGraph (dedup companies/contacts/edges)
    brokerContactRanker.ts    # Scores & ranks contacts (0-100), assigns tiers, role badges, preferred channels (legacy, used by /api/intel/relationships)
    scoring.ts                # Hot/Not scoring engine (9 factors, normalized weights)
    modelTrends.ts            # Model market trends fetcher (24hr cached)
    disposition.ts            # Owner disposition intelligence
    aiSummary.ts              # AI insight summary generation (OpenAI + Anthropic)
    flightAnalyzer.ts         # Flight behavioral analysis (trend, charter, pre-sale signals)
    flightSummary.ts          # AI flight intelligence prompt + generation
    evolutionLink.ts          # Evolution deep link builder
  agents/
    dispatcher.ts             # Persona agent dispatcher — loads skill file, builds prompts, calls LLM, validates response
    confidence.ts             # Confidence scoring — base rubric (start 100, subtract penalties × persona multipliers)
    contact-ranker.ts         # Persona-aware contact ranking using per-persona CONTACT_WEIGHTS
  mcp/
    server.ts                 # MCP server with tools and prompts

.agents/skills/personas/      # AI agent skill files (loaded by dispatcher at runtime)
  dealer_broker.md
  fbo.md
  mro.md
  charter.md
  fleet_management.md
  finance.md
  catering.md
  ground_transportation.md
  detailing.md
```

## Profile Screen Layout

Section order follows human-question headers (Apple-style):
1. **AircraftCard** — Hero (registration, make/model, Hot/Not pill)
2. **"Will it sell?"** — Hot/Not Score + scoring factors
3. **"Who owns this?"** — Owner/operator names (large, prominent), CompanyCard, fleet strip, Top Contacts (ranked by broker score, with role badges + actions), View All Contacts link, Copy Contact Pack
4. **"What is it?"** — SpecsSection (powerplant, performance, cabin, airframe, avionics)
5. **"Is it active?"** — Market signals + utilization combined
6. **"What's the market?"** — Model trends / market momentum
7. **Owner Intelligence** — Disposition deep-dive
8. **AI Summary** button

## API Endpoints

- `POST /api/auth/login` — JETNET authentication
- `POST /api/auth/logout` — Session cleanup
- `GET /api/auth/health` — Session health check
- `POST /api/auth/persona` — Set active persona on session
- `GET /api/auth/persona` — Get current persona from session
- `GET /api/aircraft/:registration/profile` — Full aircraft profile with scoring
- `GET /api/intel/relationships/:regNbr` — Relationship graph + ranked broker contacts (24h cached, `?refresh=true` to bust)
- `POST /api/aircraft/:registration/ai-summary` — AI insight summary generation
- `POST /api/aircraft/:registration/flight-summary` — AI flight intelligence summary
- `POST /api/aircraft/:registration/persona-intel` — Persona-specific AI intelligence (persona-aware ranking, confidence, outreach)
- `POST /mcp` — MCP server (Streamable HTTP)
- `GET /mcp` — MCP server info

## Broker Contact Scoring

Contacts from `getRelationships` are scored 0-100:
- +30 for Owner/Operator/Manager relationship type
- +15 for aviation ops titles (Chief Pilot, Director of Aviation, DOM, Scheduler)
- +15 for finance titles (CFO, Controller, Finance)
- +20 if email available
- +10 if mobile phone available
- +10 if direct aircraft relationship edge

Tiers: Primary (>=40 + Owner/Operator/Manager), Aviation Ops (title match), Finance/Admin (title match), Secondary (score >= 20), Historical (remainder).

Persona-specific contact ranking (in `server/agents/contact-ranker.ts`) uses per-persona weights from `constants/contact-weights.ts` instead of the fixed broker weights. Each persona prioritizes different signals (e.g., MRO weights DOM at 35, FBO weights Scheduler at 30).

## Environment Variables

- `JETNET_EMAIL`, `JETNET_PASSWORD` — For MCP server (server-side JETNET auth)
- `EVOLUTION_BASE_URL` — Evolution deep link base (default: https://www.jetnetevolution.com)
- `SESSION_SECRET` — Express session secret

## Dependencies

Key packages: expo-secure-store, expo-clipboard, expo-image, @tanstack/react-query, @expo/vector-icons, expo-haptics, @modelcontextprotocol/sdk, openai, @anthropic-ai/sdk, express-rate-limit
