import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { login, ensureSession, JetnetError, type SessionState } from "./jetnet/session";
import { buildAircraftProfile } from "./services/profileBuilder";
import { generateAISummary } from "./services/aiSummary";
import { generateFlightSummary } from "./services/flightSummary";
import { normalizeFlights, analyzeFlights } from "./services/flightAnalyzer";
import { normalizeRelationships } from "./services/relationshipsService";
import { rankContacts } from "./services/brokerContactRanker";
import { getFlightDataPaged, lookupByRegistration, getRelationships } from "./jetnet/api";
import { mountMcpServer } from "./mcp/server";
import { randomUUID } from "crypto";
import type { IntelResponse } from "../shared/types";

const sessions = new Map<
  string,
  { jetnetSession: SessionState; expiresAt: Date }
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

      const jetnetSession = await login(jetnetEmail, jetnetPassword);
      const appToken = randomUUID();
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
      sessions.set(appToken, { jetnetSession, expiresAt });

      return res.json({
        appSessionToken: appToken,
        expiresAt: expiresAt.toISOString(),
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

  mountMcpServer(app);

  const httpServer = createServer(app);
  return httpServer;
}
