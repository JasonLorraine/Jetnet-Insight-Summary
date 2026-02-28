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
6. **Contact Actions**: Tap-to-call, tap-to-text, tap-to-email on contact rows; uses native `tel:`, `sms:`, `mailto:` schemes with `Linking.canOpenURL` guards; pre-fills email subject and SMS body with aircraft registration
7. **AI Broker Summaries**: BYO OpenAI or Anthropic API key, stored securely on-device; two summary modes: (a) Insight Summary — ownership, market, transactions; (b) Flight Intelligence — 12-month behavioral analysis with flight analyzer metrics (trend slope, charter detection, pre-sale signals, downtime, route repetition, base airport, international ratio)
8. **Evolution Deep Links**: Direct links to JETNET Evolution for each aircraft and company
9. **MCP Server**: Streamable HTTP transport at `/mcp` with 5 tools and 3 prompts for Siri/AI assistant integration

## Project Structure

```
app/                          # Expo Router screens
  _layout.tsx                 # Root layout with providers
  index.tsx                   # Welcome/onboarding screen
  login.tsx                   # JETNET login modal
  setup-llm.tsx               # AI provider configuration modal
  search.tsx                  # Main search screen (after auth)
  settings.tsx                # Settings modal
  aircraft/[registration].tsx # Aircraft profile detail
  summary/[registration].tsx  # AI summary generation

components/                   # Reusable UI components
  AircraftCard.tsx            # Aircraft header card with Hot/Not pill
  ScoreGauge.tsx              # Circular score gauge and pill badge
  FactorBar.tsx               # Horizontal bar for scoring factors
  OwnerCard.tsx               # Owner intelligence panel
  CompanyCard.tsx             # Operating entity card (company profile + Evolution link)
  ContactRow.tsx              # Contact row with role signal badge
  FleetItem.tsx               # Fleet list row item (supports horizontal scroll)
  SpecsSection.tsx            # Aircraft specs display (collapsible groups)
  SkeletonLoader.tsx          # Loading skeleton shimmer
  SummaryCard.tsx             # AI summary display
  ErrorBoundary.tsx           # Error boundary component

contexts/
  AuthContext.tsx              # Auth state, JETNET session, LLM config, recent searches

constants/
  colors.ts                   # Dark aviation theme with score colors

shared/
  types.ts                    # TypeScript interfaces shared between client and server

lib/
  query-client.ts             # React Query client with auth headers + automatic 401 re-login

server/
  index.ts                    # Express app setup, CORS, body parsing, logging
  routes.ts                   # API route registration + MCP mount
  jetnet/
    session.ts                # JETNET session management (login, refresh, request)
    api.ts                    # JETNET API wrapper functions
  services/
    profileBuilder.ts         # Orchestrates Golden Path parallel fetch
    scoring.ts                # Hot/Not scoring engine (9 factors, normalized weights)
    modelTrends.ts            # Model market trends fetcher (24hr cached)
    disposition.ts            # Owner disposition intelligence
    aiSummary.ts              # AI insight summary generation (OpenAI + Anthropic)
    flightAnalyzer.ts         # Flight behavioral analysis (trend, charter, pre-sale signals)
    flightSummary.ts          # AI flight intelligence prompt + generation
    evolutionLink.ts          # Evolution deep link builder
  mcp/
    server.ts                 # MCP server with tools and prompts
```

## Profile Screen Layout

Section order follows human-question headers (Apple-style):
1. **AircraftCard** — Hero (registration, make/model, Hot/Not pill)
2. **"Will it sell?"** — Hot/Not Score + scoring factors
3. **"Who owns this?"** — Owner/operator names (large, prominent), CompanyCard, fleet strip, key contacts
4. **"What is it?"** — SpecsSection (powerplant, performance, cabin, airframe, avionics)
5. **"Is it active?"** — Market signals + utilization combined
6. **"What's the market?"** — Model trends / market momentum
7. **Owner Intelligence** — Disposition deep-dive
8. **AI Summary** button

## API Endpoints

- `POST /api/auth/login` — JETNET authentication
- `POST /api/auth/logout` — Session cleanup
- `GET /api/auth/health` — Session health check
- `GET /api/aircraft/:registration/profile` — Full aircraft profile with scoring
- `POST /api/aircraft/:registration/ai-summary` — AI insight summary generation
- `POST /api/aircraft/:registration/flight-summary` — AI flight intelligence summary
- `POST /mcp` — MCP server (Streamable HTTP)
- `GET /mcp` — MCP server info

## Environment Variables

- `JETNET_EMAIL`, `JETNET_PASSWORD` — For MCP server (server-side JETNET auth)
- `EVOLUTION_BASE_URL` — Evolution deep link base (default: https://www.jetnetevolution.com)
- `SESSION_SECRET` — Express session secret

## Dependencies

Key packages: expo-secure-store, @tanstack/react-query, @expo/vector-icons, expo-haptics, @modelcontextprotocol/sdk, openai, @anthropic-ai/sdk, express-rate-limit
