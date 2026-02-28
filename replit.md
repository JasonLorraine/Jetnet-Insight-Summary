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
    - **Data Loading**: Utilizes three phases:
        1. **Phase 1 (Instant)**: Basic profile, photos, owner, and scoring.
        2. **Phase 2 (Enrichment)**: Condensed specifications, relationships, and additional pictures.
        3. **Phase 3 (Relationships)**: Ranked broker contacts.
- **Persona Engine**: Supports 9 distinct business personas (e.g., Dealer/Broker, FBO, MRO). Users select an active persona which customizes AI responses, contact ranking, and outreach templates. Persona state is managed locally and synced with the server.

### Backend
- **Framework**: Express.js with TypeScript.
- **JETNET Integration**: Manages session-based authentication, including automatic re-login, session refreshing, and parallel data fetching.
- **Scoring and Intelligence**:
    - **Hot/Not Scoring**: A deterministic 0-100 score based on 9 weighted factors (e.g., liquidity, market momentum, age).
    - **Owner Disposition Intelligence**: Calculates sell probability and classifies owner archetypes.
- **Broker Contact Intelligence**: Enriches contacts via JETNET, normalizes relationships into a graph, and ranks brokers based on a scoring engine, assigning tiers and roles. Persona-specific contact ranking further refines this based on the active persona's priorities.
- **AI Services**: Integrates with OpenAI or Anthropic for AI broker summaries. This includes insight summaries, flight intelligence (12-month behavioral analysis, charter detection, pre-sale signals), and persona-specific intelligence.
- **MCP Server**: Provides a streamable HTTP transport for AI assistant integration with 5 tools and 3 prompts.

### Core Features
- **Ownership Surface**: Detailed company profiles, key contacts with role signals (Decision Maker, Influencer), and fleet analysis.
- **Aircraft Specs**: Comprehensive technical specifications (powerplant, performance, cabin, airframe, avionics).
- **AI Broker Summaries**: User-provided API keys for secure, on-device AI summary generation, including behavioral analysis from flight data.
- **Evolution Deep Links**: Direct links to JETNET Evolution for aircraft and companies.

## External Dependencies

- **JETNET**: Primary data source for aircraft, owner, and broker information.
- **OpenAI / Anthropic**: Large Language Model providers for AI-powered summaries and intelligence.
- **Expo SecureStore**: For secure, on-device storage of sensitive user data (e.g., API keys, persona ID).
- **@tanstack/react-query**: For efficient data fetching, caching, and state management on the client.
- **@modelcontextprotocol/sdk**: For MCP server integration.
- **expo-clipboard, expo-image, @expo/vector-icons, expo-haptics**: Expo-specific libraries for device functionalities and UI elements.
- **express-rate-limit**: For API rate limiting on the backend.