import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { login, ensureSession, type SessionState } from "./jetnet/session";
import { buildAircraftProfile } from "./services/profileBuilder";
import { generateAISummary } from "./services/aiSummary";
import { mountMcpServer } from "./mcp/server";
import { randomUUID } from "crypto";

const sessions = new Map<
  string,
  { jetnetSession: SessionState; expiresAt: Date }
>();

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
        return res
          .status(500)
          .json({ message: err.message || "Failed to fetch profile." });
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
        return res
          .status(500)
          .json({ message: err.message || "Failed to generate summary." });
      }
    }
  );

  mountMcpServer(app);

  const httpServer = createServer(app);
  return httpServer;
}
