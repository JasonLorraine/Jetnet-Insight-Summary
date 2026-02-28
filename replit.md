# Hot or Not for Jets

## Overview

"Hot or Not for Jets" is a mobile application designed to provide sales intelligence for aircraft. It aims to streamline the sales process by offering detailed insights into aircraft, owners, and brokers, facilitating more effective outreach and deal closures. The project integrates with JETNET for comprehensive aviation data, offering features like "Hot/Not" scoring for aircraft, owner disposition intelligence, and AI-powered broker summaries. The application supports various aviation business personas, each with tailored AI agents and outreach strategies, enhancing its utility across different market segments. The core vision is to empower aviation sales professionals with actionable intelligence and efficient tools.

## User Preferences

I want iterative development.
I prefer detailed explanations.
I want to be asked before making major changes.
I like clean, readable code with good comments.

## System Architecture

The application consists of a React Native (Expo) frontend and an Express.js (TypeScript) backend. Data transfer between the client and server occurs via a REST API, with an additional MCP server at `/mcp` for AI assistant integration.

### Frontend
- **Framework**: Expo (React Native) with `expo-router` for file-based routing.
- **UI/UX**: Features an Apple-style design system with semantic color tokens, persona-specific accent colors, and skeleton shimmer loading states. Content is progressively loaded with `ContentReveal` animations for a smooth user experience.
- **Aircraft Profile**: A 3-tab layout (`Overview`, `Specs & Intel`, `Summary & Outreach`) with phased data loading ensures a responsive interface.
    - **Data Loading**: Utilizes three phases via `hooks/useAircraftProfile.ts`:
        1. **Phase 1 (Instant)**: `/api/aircraft/:reg/profile` — Basic profile, photos, owner, scoring, flight data, model specs.
        2. **Phase 2 (Enrichment)**: `/api/aircraft/enrich/:acid` — Condensed owner/operator specs, relationships, additional pictures.
        3. **Phase 3 (Relationships)**: `/api/intel/relationships/:reg` — Ranked broker contacts.
    - **Spec Data Merging**: Phase 1 `profile.specs` provides model-level data (range, max speed, MTOW). Phase 2 condensed provides per-aircraft operational data (airframe hours, avionics, engine model, maintenance program). `getMergedSpecRows()` in `SpecsIntelTab.tsx` combines both sources for the richest display.
    - **Fallback Strategy**: When condensed data is unavailable, `getSpecRowsFromProfile()` uses Phase 1 specs. When both are available, merged rows show the best value from either source.
- **Persona Engine**: Supports 9 distinct business personas (e.g., Dealer/Broker, FBO, MRO). Users select an active persona which customizes AI responses, contact ranking, and outreach templates. Persona state is managed locally and synced with the server.
- **Photo Gallery**: `components/PhotoGallery.tsx` — Full-screen Apple-style gallery modal with FlatList pagination, swipe, dots indicator, counter badge, caption, animated fade.

### Backend
- **Framework**: Express.js with TypeScript.
- **JETNET Integration**: Manages session-based authentication, including automatic re-login, session refreshing, and parallel data fetching.
    - **getCondensedOwnerOperators**: Returns 209-field records per aircraft. Key JETNET field mappings:
        - `passgr` → `maxPassengers`, `engmodel` → `engineModel`, `aftt` → `airframeTotalHours`
        - `landings` → `airframeTotalLandings`, `eng1tt/eng2tt` → `engineTotalHours`
        - `comp1name` → `ownerCompanyName`, `comp2name` → `operatorCompanyName`
        - `chpilotcompname` → `managerCompanyName`, `mxprog` → `lastInspectionType`
        - `evalue` → `estimatedValue`, `avgevalue` → `avgEstimatedValue`
        - `baseiata/baseicao` → `basedAirport`, `intyr/extyr` → interior/exterior dates
        - Model-level specs (maxRange, maxSpeed, mtow, cabin dims) are NOT in condensed — they come from Phase 1 `profile.specs`.
    - **Normalization**: `server/services/condensedService.ts` applies `lowercaseKeys()` for case-insensitive field matching, `nullIfZero()` for numeric fields, string→boolean for `asking`/`forsale`.
- **Scoring and Intelligence**:
    - **Hot/Not Scoring**: A deterministic 0-100 score based on 9 weighted factors (e.g., liquidity, market momentum, age).
    - **Owner Disposition Intelligence**: Calculates sell probability and classifies owner archetypes.
- **Broker Contact Intelligence**: Enriches contacts via JETNET, normalizes relationships into a graph, and ranks brokers based on a scoring engine, assigning tiers and roles. Persona-specific contact ranking further refines this based on the active persona's priorities.
- **AI Services**: Integrates with OpenAI or Anthropic for AI broker summaries. This includes insight summaries, flight intelligence (12-month behavioral analysis, charter detection, pre-sale signals), and persona-specific intelligence.
- **MCP Server**: Provides a streamable HTTP transport for AI assistant integration with 5 tools and 3 prompts.

### API Routes
- `POST /api/auth/login` — JETNET login, returns session token
- `GET /api/aircraft/:reg/profile` — Phase 1 aircraft profile (specs, scoring, flights, owner)
- `GET /api/aircraft/enrich/:acid` — Phase 2 enrichment (condensed + relationships + pictures)
- `GET /api/intel/relationships/:reg` — Phase 3 ranked contacts
- `POST /api/aircraft/:reg/persona-intel` — AI-powered persona intelligence
- `POST /api/aircraft/:reg/ai-summary` — AI broker summary

### Core Features
- **Ownership Surface**: Detailed company profiles, key contacts with role signals (Decision Maker, Influencer), and fleet analysis.
- **Aircraft Specs**: Merged display combining model-level specs (from profile) and per-aircraft operational data (from condensed).
- **Market Context**: For-sale status, asking price, estimated value, model avg value, lifecycle status, days on market. Visible for dealer_broker, charter, fleet_management, finance personas.
- **AI Broker Summaries**: User-provided API keys for secure, on-device AI summary generation, including behavioral analysis from flight data.
- **Evolution Deep Links**: Direct links to JETNET Evolution for aircraft and companies.

### Design System
- **Colors**: `constants/colors.ts` — Apple semantic tokens (primaryLabel, secondaryLabel, tertiaryLabel, separator, backgrounds), persona accent colors (light+dark), skeleton shimmer colors.
- **Skeletons**: `components/skeletons/` — SkeletonLine, SkeletonCard, SkeletonSection with animated shimmer.
- **ContentReveal**: `components/ContentReveal.tsx` — Fade+slide-up animation wrapper (350ms, Apple ease-out).
- **ProfileTabs**: `components/ProfileTabs.tsx` — 3-tab bar with persona accent underline and loading dot indicators.

## Key Files

### Frontend
- `app/aircraft/[registration].tsx` — Aircraft profile screen (3-tab layout)
- `hooks/useAircraftProfile.ts` — Phased data loading hook
- `components/tabs/OverviewTab.tsx` — Tab 1: photos, hero, operator card, fleet strip
- `components/tabs/SpecsIntelTab.tsx` — Tab 2: specs, contacts, flights, market
- `components/tabs/SummaryTab.tsx` — Tab 3: AI analysis, outreach drafts
- `components/PhotoGallery.tsx` — Full-screen photo gallery modal
- `components/ProfileTabs.tsx` — Tab bar component
- `lib/query-client.ts` — React Query configuration

### Backend
- `server/routes.ts` — All API routes
- `server/jetnet/api.ts` — JETNET API client
- `server/services/condensedService.ts` — Condensed record normalization
- `server/services/flightAnalyzer.ts` — Flight data analysis
- `server/services/personaIntelService.ts` — Persona intelligence engine
- `shared/types.ts` — Shared TypeScript interfaces

## External Dependencies

- **JETNET**: Primary data source for aircraft, owner, and broker information.
- **OpenAI / Anthropic**: Large Language Model providers for AI-powered summaries and intelligence.
- **Expo SecureStore**: For secure, on-device storage of sensitive user data (e.g., API keys, persona ID).
- **@tanstack/react-query**: For efficient data fetching, caching, and state management on the client.
- **@modelcontextprotocol/sdk**: For MCP server integration.
- **expo-clipboard, expo-image, @expo/vector-icons, expo-haptics**: Expo-specific libraries for device functionalities and UI elements.
- **express-rate-limit**: For API rate limiting on the backend.
