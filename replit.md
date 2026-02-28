# Hot or Not for Jets

Aircraft sales intelligence mobile app built with React Native (Expo) and Express backend.

## Architecture

- **Frontend**: Expo (React Native) with file-based routing via expo-router, running on port 8081
- **Backend**: Express.js with TypeScript, running on port 5000
- **Transport**: REST API between client and server; MCP server at `/mcp` for AI assistant integration

## Key Features

1. **JETNET Integration**: Session-managed authentication with auto-refresh, parallel data fetching (Golden Path)
2. **Hot/Not Scoring**: Deterministic 0-100 score with 8 weighted factors (liquidity, model market momentum, DOM, age, transactions, utilization, ownership, completeness)
3. **Owner Disposition Intelligence**: Sell probability (0-100) with archetype classification, brand loyalty, replacement cycle, and fleet analysis
4. **AI Broker Summaries**: BYO OpenAI or Anthropic API key, stored securely on-device
5. **Evolution Deep Links**: Direct links to JETNET Evolution for each aircraft
6. **MCP Server**: Streamable HTTP transport at `/mcp` with 5 tools and 3 prompts for Siri/AI assistant integration

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
  FleetItem.tsx               # Fleet list row item
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
  query-client.ts             # React Query client with auth headers

server/
  index.ts                    # Express app setup, CORS, body parsing, logging
  routes.ts                   # API route registration + MCP mount
  jetnet/
    session.ts                # JETNET session management (login, refresh, request)
    api.ts                    # JETNET API wrapper functions
  services/
    profileBuilder.ts         # Orchestrates Golden Path parallel fetch
    scoring.ts                # Hot/Not scoring engine (8 factors, normalized weights)
    modelTrends.ts            # Model market trends fetcher (24hr cached)
    disposition.ts            # Owner disposition intelligence
    aiSummary.ts              # AI summary generation (OpenAI + Anthropic)
    evolutionLink.ts          # Evolution deep link builder
  mcp/
    server.ts                 # MCP server with tools and prompts
```

## API Endpoints

- `POST /api/auth/login` — JETNET authentication
- `POST /api/auth/logout` — Session cleanup
- `GET /api/auth/health` — Session health check
- `GET /api/aircraft/:registration/profile` — Full aircraft profile with scoring
- `POST /api/aircraft/:registration/ai-summary` — AI summary generation
- `POST /mcp` — MCP server (Streamable HTTP)
- `GET /mcp` — MCP server info

## Environment Variables

- `JETNET_EMAIL`, `JETNET_PASSWORD` — For MCP server (server-side JETNET auth)
- `EVOLUTION_BASE_URL` — Evolution deep link base (default: https://evolution.jetnet.com)
- `SESSION_SECRET` — Express session secret

## Dependencies

Key packages: expo-secure-store, @tanstack/react-query, @expo/vector-icons, expo-haptics, @modelcontextprotocol/sdk, openai, @anthropic-ai/sdk, express-rate-limit
