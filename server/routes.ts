import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { login, ensureSession, JetnetError, type SessionState } from "./jetnet/session";
import { buildAircraftProfile } from "./services/profileBuilder";
import { generateAISummary } from "./services/aiSummary";
import { generateFlightSummary } from "./services/flightSummary";
import { normalizeFlights, analyzeFlights } from "./services/flightAnalyzer";
import { normalizeRelationships } from "./services/relationshipsService";
import { rankContacts } from "./services/brokerContactRanker";
import { rankContactsForPersona } from "./agents/contact-ranker";
import { dispatchToAgent } from "./agents/dispatcher";
import { computeConfidence } from "./agents/confidence";
import { getFlightDataPaged, lookupByRegistration, getRelationships, getHistoryListPaged } from "./jetnet/api";
import { mountMcpServer } from "./mcp/server";
import { randomUUID } from "crypto";
import type { IntelResponse } from "../shared/types";
import type { PersonaId, PersonaIntelPayload } from "../shared/types/persona";

const sessions = new Map<
  string,
  { jetnetSession: SessionState; expiresAt: Date; personaId?: string }
>();

const relationshipsCache = new Map<
  string,
  { data: IntelResponse; expiresAt: number }
>();

const RELATIONSHIPS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getSession(req: Request): SessionState | null {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req.query as any).token;
  if (!token) return null;
  const entry = sessions.get(token);
  if (!entry) return null;
  if (new Date() > entry.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return entry.jetnetSession;
}

async function refreshSession(token: string): Promise<SessionState | null> {
  const entry = sessions.get(token);
  if (!entry) return null;
  try {
    const fresh = await ensureSession(entry.jetnetSession);
    entry.jetnetSession = fresh;
    return fresh;
  } catch {
    sessions.delete(token);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { jetnetEmail, jetnetPassword } = req.body;
      if (!jetnetEmail || !jetnetPassword) {
        return res
          .status(400)
          .json({ message: "Email and password required." });
      }

      const { personaId } = req.body;
      const jetnetSession = await login(jetnetEmail, jetnetPassword);
      const appToken = randomUUID();
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
      sessions.set(appToken, { jetnetSession, expiresAt, personaId: personaId || undefined });

      return res.json({
        appSessionToken: appToken,
        expiresAt: expiresAt.toISOString(),
        personaId: personaId || null,
      });
    } catch (err: any) {
      return res
        .status(401)
        .json({ message: err.message || "Authentication failed." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    return res.json({ message: "Logged out." });
  });

  app.get("/api/auth/health", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ message: "No session token." });
      }
      const session = await refreshSession(token);
      if (!session) {
        return res.status(401).json({ message: "Session expired." });
      }
      return res.json({ status: "connected", validatedAt: new Date().toISOString() });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Health check failed." });
    }
  });

  app.get("/api/auth/persona", (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No session token." });
    const entry = sessions.get(token);
    if (!entry) return res.status(401).json({ message: "Session expired." });
    return res.json({ personaId: entry.personaId || null });
  });

  app.post("/api/auth/persona", (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No session token." });
    const entry = sessions.get(token);
    if (!entry) return res.status(401).json({ message: "Session expired." });
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ message: "personaId required." });
    entry.personaId = personaId;
    return res.json({ personaId });
  });

  app.get(
    "/api/aircraft/:registration/profile",
    async (req: Request, res: Response) => {
      try {
        const session = getSession(req);
        if (!session) {
          return res.status(401).json({ message: "Not authenticated." });
        }

        const fresh = await ensureSession(session);
        const token = req.headers.authorization?.replace("Bearer ", "") || "";
        const entry = sessions.get(token);
        if (entry) entry.jetnetSession = fresh;

        const profile = await buildAircraftProfile(
          req.params.registration,
          fresh
        );
        return res.json(profile);
      } catch (err: any) {
        const status = err instanceof JetnetError ? 502 : 500;
        return res
          .status(status)
          .json({
            message: err.message || "Failed to fetch profile.",
            source: err instanceof JetnetError ? "jetnet" : "internal",
          });
      }
    }
  );

  app.post(
    "/api/aircraft/:registration/ai-summary",
    async (req: Request, res: Response) => {
      try {
        const session = getSession(req);
        if (!session) {
          return res.status(401).json({ message: "Not authenticated." });
        }

        const { provider, apiKey, maxTokens } = req.body;
        if (!provider || !apiKey) {
          return res
            .status(400)
            .json({ message: "Provider and API key required." });
        }

        const fresh = await ensureSession(session);
        const token = req.headers.authorization?.replace("Bearer ", "") || "";
        const entry = sessions.get(token);
        if (entry) entry.jetnetSession = fresh;

        const profile = await buildAircraftProfile(
          req.params.registration,
          fresh
        );
        const summary = await generateAISummary(
          profile,
          provider,
          apiKey,
          maxTokens || 1000
        );
        return res.json(summary);
      } catch (err: any) {
        const status = err instanceof JetnetError ? 502 : 500;
        return res
          .status(status)
          .json({
            message: err.message || "Failed to generate summary.",
            source: err instanceof JetnetError ? "jetnet" : "internal",
          });
      }
    }
  );

  app.post(
    "/api/aircraft/:registration/flight-summary",
    async (req: Request, res: Response) => {
      try {
        const session = getSession(req);
        if (!session) {
          return res.status(401).json({ message: "Not authenticated." });
        }

        const { provider, apiKey, maxTokens } = req.body;
        if (!provider || !apiKey) {
          return res
            .status(400)
            .json({ message: "Provider and API key required." });
        }

        const fresh = await ensureSession(session);
        const token = req.headers.authorization?.replace("Bearer ", "") || "";
        const entry = sessions.get(token);
        if (entry) entry.jetnetSession = fresh;

        const profile = await buildAircraftProfile(
          req.params.registration,
          fresh
        );

        const flightRaw = await getFlightDataPaged(profile.aircraftId, fresh);

        const rawKeys = typeof flightRaw === "object" && flightRaw ? Object.keys(flightRaw) : [];
        const firstArrayKey = rawKeys.find((k) => Array.isArray((flightRaw as any)[k]));
        const rawArrayLen = firstArrayKey ? (flightRaw as any)[firstArrayKey]?.length : (Array.isArray(flightRaw) ? (flightRaw as any[]).length : 0);
        if (rawArrayLen > 0 && firstArrayKey) {
          console.log(`[flight-debug] sample:`, JSON.stringify((flightRaw as any)[firstArrayKey]?.slice(0, 2)).substring(0, 500));
        }

        const flights = normalizeFlights(flightRaw);
        console.log(`[flight-debug] normalizedLen=${flights.length} sample:`, flights.length > 0 ? JSON.stringify(flights.slice(0, 2)) : "[]");

        const intel = analyzeFlights(flights);
        console.log(`[flight-debug] totalFlights=${intel.totalFlights} totalHours=${intel.totalHours}`);

        if (intel.totalFlights === 0) {
          return res.json({
            ok: true,
            mode: "flight-ai",
            flightsFound: rawArrayLen,
            flightsUsable: flights.length,
            message: "no-usable-flights",
            fallbackTo: "standard-summary",
          });
        }

        const summary = await generateFlightSummary(
          profile,
          intel,
          provider,
          apiKey,
          maxTokens || 1000
        );
        return res.json({ ...summary, flightIntelligence: intel });
      } catch (err: any) {
        const status = err instanceof JetnetError ? 502 : 500;
        return res.status(status).json({
          message: err.message || "Failed to generate flight summary.",
          source: err instanceof JetnetError ? "jetnet" : "internal",
        });
      }
    }
  );

  app.get(
    "/api/intel/relationships/:regNbr",
    async (req: Request, res: Response) => {
      try {
        const session = getSession(req);
        if (!session) {
          return res.status(401).json({ message: "Not authenticated." });
        }

        const fresh = await ensureSession(session);
        const token = req.headers.authorization?.replace("Bearer ", "") || "";
        const entry = sessions.get(token);
        if (entry) entry.jetnetSession = fresh;

        const regNbr = req.params.regNbr;
        const forceRefresh = req.query.refresh === "true";

        const regData = await lookupByRegistration(regNbr, fresh);
        const ac = (regData as any).aircraftresult || regData;
        const acid: number = ac.aircraftid || ac.aircraftId;
        if (!acid) {
          return res.json({
            regNbr,
            acid: 0,
            relationships: { companies: [], contacts: [], edges: [] },
            recommendations: [],
            cachedAt: null,
          } as IntelResponse);
        }

        const cacheKey = `relationships:${acid}`;
        if (!forceRefresh) {
          const cached = relationshipsCache.get(cacheKey);
          if (cached && Date.now() < cached.expiresAt) {
            return res.json(cached.data);
          }
        }

        const rawRelationships = await getRelationships(acid, fresh);
        const graph = normalizeRelationships(rawRelationships);
        const recommendations = rankContacts(graph);

        const model = ac.model || ac.modelname || "";
        for (const rec of recommendations) {
          rec.regNbr = regNbr;
          rec.model = model;
        }

        const response: IntelResponse = {
          regNbr,
          acid,
          relationships: graph,
          recommendations,
          cachedAt: new Date().toISOString(),
        };

        relationshipsCache.set(cacheKey, {
          data: response,
          expiresAt: Date.now() + RELATIONSHIPS_CACHE_TTL_MS,
        });

        return res.json(response);
      } catch (err: any) {
        const status = err instanceof JetnetError ? 502 : 500;
        return res.status(status).json({
          message: err.message || "Failed to fetch relationships.",
          source: err instanceof JetnetError ? "jetnet" : "internal",
        });
      }
    }
  );

  app.post(
    "/api/aircraft/:registration/persona-intel",
    async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization?.replace("Bearer ", "") || "";
        const session = getSession(req);
        if (!session) {
          return res.status(401).json({ message: "Not authenticated." });
        }

        const entry = sessions.get(token);
        const sessionPersonaId = entry?.personaId as PersonaId | undefined;
        const bodyPersonaId = req.body.personaId as PersonaId | undefined;
        const personaId = bodyPersonaId || sessionPersonaId || "dealer_broker";

        const { provider, apiKey, maxTokens } = req.body;
        if (!provider || !apiKey) {
          return res.status(400).json({ message: "Provider and API key required." });
        }

        const fresh = await ensureSession(session);
        if (entry) entry.jetnetSession = fresh;

        const profile = await buildAircraftProfile(req.params.registration, fresh);
        const acid = profile.aircraftId;

        const rawRelationships = await getRelationships(acid, fresh);
        const graph = normalizeRelationships(rawRelationships);
        const rankedContacts = rankContactsForPersona(personaId, graph);

        let flightIntelData: PersonaIntelPayload["flightIntel"] = null;
        try {
          const flightRaw = await getFlightDataPaged(acid, fresh);
          const flights = normalizeFlights(flightRaw);
          if (flights.length > 0) {
            const intel = analyzeFlights(flights);
            flightIntelData = {
              available: true,
              totalFlights: intel.totalFlights,
              totalHours: intel.totalHours ?? undefined,
              avgFlightsPerMonth: intel.avgFlightsPerMonth,
              topRoutes: intel.topRoutes.slice(0, 5).map((r) => ({
                from: r.route.split("→")[0]?.trim() || "",
                to: r.route.split("→")[1]?.trim() || "",
                count: r.count,
              })),
              topAirports: intel.topAirports.slice(0, 5).map((a) => ({
                code: a.airport,
                count: a.count,
                role: a.airport === intel.primaryBase ? "base" : "destination",
              })),
              estimatedHomeBase: intel.primaryBase || undefined,
            };
          }
        } catch (e) {
          console.warn("[persona-intel] Flight data fetch failed:", (e as Error).message);
        }

        let transactionsIntelData: PersonaIntelPayload["transactionsIntel"] = null;
        try {
          const historyRaw = await getHistoryListPaged(acid, fresh);
          const histArr = (historyRaw as any)?.historyresult || (historyRaw as any)?.HistoryResult || [];
          if (Array.isArray(histArr) && histArr.length > 0) {
            transactionsIntelData = {
              available: true,
              totalTransactions: histArr.length,
              transactions: histArr.slice(0, 10).map((t: any) => ({
                date: t.transactiondate || t.TransactionDate || "",
                type: t.transactiontype || t.TransactionType || "",
                buyer: t.buyer || t.Buyer || undefined,
                seller: t.seller || t.Seller || undefined,
                price: t.price ? Number(t.price) : undefined,
              })),
              lastSaleDate: histArr[0]?.transactiondate || histArr[0]?.TransactionDate || undefined,
            };
          }
        } catch (e) {
          console.warn("[persona-intel] Transaction history fetch failed:", (e as Error).message);
        }

        let marketIntelData: PersonaIntelPayload["marketIntel"] = null;
        if (profile.modelTrends) {
          marketIntelData = {
            available: true,
            avgDaysOnMarket: profile.modelTrends.avgDaysOnMarket ?? undefined,
            modelForSaleCount: profile.modelTrends.forSaleCount ?? undefined,
          };
        }

        const payload: PersonaIntelPayload = {
          request: {
            personaId,
            mode: "all",
            tone: "",
            maxOutreachLength: { emailWords: 140, smsChars: 240 },
          },
          aircraft: {
            regNbr: profile.registration,
            acid,
            model: profile.model,
            year: profile.yearMfr,
            serialNumber: profile.serialNumber,
            make: profile.make,
            category: profile.categorySize,
            weightClass: profile.weightClass,
            lifecycleStatus: profile.lifecycleStatus,
            forSale: profile.marketSignals.forSale,
            baseCity: profile.baseLocation.city || undefined,
            baseCountry: profile.baseLocation.country || undefined,
            askingPrice: profile.marketSignals.askingPrice || undefined,
            daysOnMarket: profile.marketSignals.daysOnMarket || undefined,
          },
          companies: graph.companies.map((c) => ({
            companyId: c.companyId,
            companyName: c.companyName,
            relationshipRole: graph.edges.find((e) => e.companyId === c.companyId)?.relationshipType || "",
          })),
          contacts: rankedContacts.map((c) => ({
            contactId: c.contactId ?? 0,
            companyId: c.companyId ?? 0,
            fullName: `${c.firstName} ${c.lastName}`.trim(),
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title || "",
            relationshipType: c.relationshipType,
            emails: c.emails,
            phones: { mobile: c.phones.mobile || undefined, work: c.phones.work || undefined },
          })),
          recommendations: rankedContacts.map((c) => ({
            contactId: c.contactId ?? 0,
            companyId: c.companyId ?? 0,
            relationshipType: c.relationshipType,
            tier: c.tier,
            score: c.score,
            reasons: c.reasons,
            preferredChannels: c.preferredChannels,
          })),
          flightIntel: flightIntelData,
          transactionsIntel: transactionsIntelData,
          marketIntel: marketIntelData,
        };

        const confidence = computeConfidence(personaId, payload);

        const { response: aiResponse } = await dispatchToAgent(
          personaId,
          payload,
          provider,
          apiKey,
          maxTokens || 2000
        );

        aiResponse.dataConfidence = confidence;

        return res.json({
          personaId,
          aiResponse,
          contacts: rankedContacts,
          payload: {
            aircraft: payload.aircraft,
            flightIntel: payload.flightIntel,
            transactionsIntel: payload.transactionsIntel,
            marketIntel: payload.marketIntel,
          },
        });
      } catch (err: any) {
        const status = err instanceof JetnetError ? 502 : 500;
        return res.status(status).json({
          message: err.message || "Failed to generate persona intelligence.",
          source: err instanceof JetnetError ? "jetnet" : "internal",
        });
      }
    }
  );

  mountMcpServer(app);

  const httpServer = createServer(app);
  return httpServer;
}
