import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { login, ensureSession, type SessionState } from "../jetnet/session";
import { buildAircraftProfile } from "../services/profileBuilder";
import { generateAISummary } from "../services/aiSummary";

let mcpSession: SessionState | null = null;

async function getOrCreateSession(): Promise<SessionState> {
  if (mcpSession) {
    mcpSession = await ensureSession(mcpSession);
    return mcpSession;
  }

  const email = process.env.JETNET_EMAIL;
  const password = process.env.JETNET_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "JETNET_EMAIL and JETNET_PASSWORD environment variables required for MCP server."
    );
  }

  mcpSession = await login(email, password);
  return mcpSession;
}

const TOOLS = [
  {
    name: "jet_profile_by_registration",
    description:
      "Look up a business jet by tail number / registration. Returns full aircraft profile including make, model, year, serial, owner, operator, base location, pictures, market signals, utilization, and transaction history.",
    inputSchema: {
      type: "object" as const,
      properties: {
        registration: {
          type: "string",
          description: "Aircraft registration / tail number (e.g. N123AB)",
        },
      },
      required: ["registration"],
    },
  },
  {
    name: "hot_or_not_by_registration",
    description:
      "Get a deterministic Hot or Not score (0-100) for an aircraft. Factors include model liquidity, days on market, age, transaction patterns, utilization, ownership simplicity, and data completeness. Labels: HOT (80+), WARM (60-79), NEUTRAL (40-59), COLD (<40).",
    inputSchema: {
      type: "object" as const,
      properties: {
        registration: {
          type: "string",
          description: "Aircraft registration / tail number",
        },
      },
      required: ["registration"],
    },
  },
  {
    name: "predict_owner_disposition",
    description:
      "Predict the owner's likelihood to sell (0-100) with predicted sell window, owner archetype classification, brand loyalty analysis, and replacement cycle status. Uses ownership age, historical upgrade behavior, fleet trends, utilization, and market timing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        registration: {
          type: "string",
          description: "Aircraft registration / tail number",
        },
      },
      required: ["registration"],
    },
  },
  {
    name: "ai_summary_by_registration",
    description:
      "Generate an AI-powered broker summary for an aircraft using OpenAI or Anthropic. Includes executive summary, key insights, red flags, and suggested next questions. Requires an API key for the chosen provider.",
    inputSchema: {
      type: "object" as const,
      properties: {
        registration: {
          type: "string",
          description: "Aircraft registration / tail number",
        },
        provider: {
          type: "string",
          enum: ["openai", "anthropic"],
          description: "AI provider to use",
        },
        apiKey: {
          type: "string",
          description: "API key for the chosen provider",
        },
      },
      required: ["registration", "provider", "apiKey"],
    },
  },
  {
    name: "jetnet_golden_path",
    description:
      "Run the full Golden Path analysis: aircraft profile + Hot/Not score + owner disposition + all enrichments in a single call. Most comprehensive view of an aircraft.",
    inputSchema: {
      type: "object" as const,
      properties: {
        registration: {
          type: "string",
          description: "Aircraft registration / tail number",
        },
      },
      required: ["registration"],
    },
  },
];

const PROMPTS = [
  {
    name: "broker_one_pager",
    description:
      "Generate a concise broker one-pager for an aircraft. Uses Hot/Not score and owner intelligence to produce an actionable sell-side or buy-side briefing.",
    arguments: [
      {
        name: "registration",
        description: "Aircraft tail number",
        required: true,
      },
    ],
  },
  {
    name: "pre_buy_diligence",
    description:
      "Generate a pre-purchase due diligence checklist based on aircraft profile data — highlighting gaps in data, potential red flags, and recommended inspections.",
    arguments: [
      {
        name: "registration",
        description: "Aircraft tail number",
        required: true,
      },
    ],
  },
  {
    name: "disposition_summary",
    description:
      "Summarize owner disposition intelligence — ownership cycle, brand loyalty, upgrade patterns, and sell probability — in plain language for a broker call prep.",
    arguments: [
      {
        name: "registration",
        description: "Aircraft tail number",
        required: true,
      },
    ],
  },
];

async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const session = await getOrCreateSession();
  const reg = args.registration as string;

  switch (name) {
    case "jet_profile_by_registration": {
      const profile = await buildAircraftProfile(reg, session);
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      };
    }
    case "hot_or_not_by_registration": {
      const profile = await buildAircraftProfile(reg, session);
      return {
        content: [
          { type: "text", text: JSON.stringify(profile.hotNotScore, null, 2) },
        ],
      };
    }
    case "predict_owner_disposition": {
      const profile = await buildAircraftProfile(reg, session);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(profile.ownerIntelligence, null, 2),
          },
        ],
      };
    }
    case "ai_summary_by_registration": {
      const profile = await buildAircraftProfile(reg, session);
      const summary = await generateAISummary(
        profile,
        args.provider as "openai" | "anthropic",
        args.apiKey as string
      );
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
    case "jetnet_golden_path": {
      const profile = await buildAircraftProfile(reg, session);
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      };
    }
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
  }
}

function buildPromptMessages(
  name: string,
  args: Record<string, string>
): Array<{ role: string; content: { type: string; text: string } }> {
  const reg = args.registration || "N/A";

  switch (name) {
    case "broker_one_pager":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the jetnet_golden_path tool to look up aircraft ${reg}, then write a concise one-pager briefing for an aircraft broker. Include: aircraft summary, Hot/Not score with explanation, owner disposition intelligence, key selling points, red flags, and recommended next steps. Format for quick reading with headers and bullets.`,
          },
        },
      ];
    case "pre_buy_diligence":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the jet_profile_by_registration tool to look up aircraft ${reg}, then create a pre-purchase due diligence checklist. Identify: data gaps that need verification, potential red flags from transaction history or utilization patterns, recommended physical inspections based on age and usage, and ownership/title concerns. Format as an actionable checklist.`,
          },
        },
      ];
    case "disposition_summary":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the predict_owner_disposition tool for aircraft ${reg}, then summarize the owner's disposition in plain language suitable for broker call prep. Cover: how long they've owned the aircraft, where they are in the replacement cycle, their brand loyalty and upgrade history, fleet context, and estimated sell probability with timeline. Keep it conversational but data-backed.`,
          },
        },
      ];
    default:
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Unknown prompt: ${name}`,
          },
        },
      ];
  }
}

export function mountMcpServer(app: Express): void {
  const sessions = new Map<
    string,
    { initialized: boolean; capabilities: Record<string, unknown> }
  >();

  const mcpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { jsonrpc: "2.0", error: { code: -32000, message: "Rate limit exceeded" } },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/mcp", mcpLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const method = body.method;
      const id = body.id;
      const sessionId =
        (req.headers["mcp-session-id"] as string) ||
        Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { initialized: false, capabilities: {} });
      }

      const session = sessions.get(sessionId)!;
      res.setHeader("mcp-session-id", sessionId);
      res.setHeader("Content-Type", "application/json");

      switch (method) {
        case "initialize": {
          session.initialized = true;
          session.capabilities = body.params?.capabilities || {};
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2025-03-26",
              capabilities: {
                tools: { listChanged: false },
                prompts: { listChanged: false },
              },
              serverInfo: {
                name: "hot-or-not-jets",
                version: "1.0.0",
              },
            },
          });
        }

        case "notifications/initialized": {
          return res.json({ jsonrpc: "2.0", id, result: {} });
        }

        case "tools/list": {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: { tools: TOOLS },
          });
        }

        case "tools/call": {
          const { name, arguments: args } = body.params;
          try {
            const result = await handleToolCall(name, args || {});
            return res.json({
              jsonrpc: "2.0",
              id,
              result,
            });
          } catch (err: any) {
            return res.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: `Error: ${err.message || "Tool execution failed"}`,
                  },
                ],
                isError: true,
              },
            });
          }
        }

        case "prompts/list": {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: { prompts: PROMPTS },
          });
        }

        case "prompts/get": {
          const { name, arguments: promptArgs } = body.params;
          const messages = buildPromptMessages(name, promptArgs || {});
          return res.json({
            jsonrpc: "2.0",
            id,
            result: { messages },
          });
        }

        default: {
          return res.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          });
        }
      }
    } catch (err: any) {
      return res.status(500).json({
        jsonrpc: "2.0",
        id: req.body?.id,
        error: {
          code: -32603,
          message: err.message || "Internal error",
        },
      });
    }
  });

  app.get("/mcp", (_req: Request, res: Response) => {
    res.json({
      name: "hot-or-not-jets",
      version: "1.0.0",
      description:
        "Aircraft sales intelligence MCP server. Look up jets by tail number, get Hot/Not scores, owner disposition predictions, and AI broker summaries.",
      transport: "streamable-http",
      endpoint: "/mcp",
    });
  });
}
