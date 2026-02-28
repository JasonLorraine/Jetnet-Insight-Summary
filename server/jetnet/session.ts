const DEFAULT_BASE_URL = "https://customer.jetnetconnect.com";

export interface SessionState {
  baseUrl: string;
  email: string;
  password: string;
  bearerToken: string;
  apiToken: string;
  createdAt: number;
  lastValidatedAt: number;
}

export class JetnetError extends Error {
  endpoint: string;
  status: string;

  constructor(endpoint: string, status: string, detail?: string) {
    super(
      `JETNET error [${endpoint}]: ${status}${detail ? " -- " + detail : ""}`
    );
    this.name = "JetnetError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

function nowSeconds(): number {
  return Date.now() / 1000;
}

function normalizeError(
  responseJson: Record<string, unknown>,
  endpoint = ""
): JetnetError | null {
  const rs = responseJson["responsestatus"];
  if (typeof rs === "string") {
    const upper = rs.toUpperCase();
    if (upper.startsWith("ERROR") || upper.startsWith("INVALID")) {
      return new JetnetError(endpoint, rs);
    }
  }

  if ("title" in responseJson && "status" in responseJson) {
    const title = String(responseJson["title"] ?? "");
    const detail = responseJson["detail"]
      ? String(responseJson["detail"])
      : undefined;
    return new JetnetError(endpoint, title, detail);
  }

  return null;
}

const TOKEN_TTL_SECONDS = 50 * 60;

export async function login(
  email?: string,
  password?: string,
  baseUrl?: string
): Promise<SessionState> {
  const resolvedBaseUrl =
    baseUrl ?? process.env["JETNET_BASE_URL"] ?? DEFAULT_BASE_URL;
  const resolvedEmail = email ?? process.env["JETNET_EMAIL"];
  const resolvedPassword = password ?? process.env["JETNET_PASSWORD"];

  if (!resolvedEmail || !resolvedPassword) {
    throw new Error("JETNET credentials missing.");
  }

  const url = `${resolvedBaseUrl}/api/Admin/APILogin`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailAddress: resolvedEmail,
      password: resolvedPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `JETNET login HTTP ${response.status}: ${await response.text()}`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const err = normalizeError(data, "APILogin");
  if (err) throw err;

  const bearerToken = String(data["bearerToken"] ?? "");
  const apiToken = String(data["apiToken"] ?? "");

  if (!bearerToken || !apiToken) {
    throw new Error("JETNET login returned no tokens. Check credentials.");
  }

  const now = nowSeconds();
  return {
    baseUrl: resolvedBaseUrl,
    email: resolvedEmail,
    password: resolvedPassword,
    bearerToken,
    apiToken,
    createdAt: now,
    lastValidatedAt: now,
  };
}

export async function ensureSession(
  session: SessionState
): Promise<SessionState> {
  const age = nowSeconds() - session.createdAt;

  if (age < TOKEN_TTL_SECONDS) {
    return session;
  }

  try {
    const url = `${session.baseUrl}/api/Admin/getAccountInfo/${session.apiToken}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${session.bearerToken}` },
    });

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      const err = normalizeError(data, "getAccountInfo");
      if (!err) {
        session.lastValidatedAt = nowSeconds();
        return session;
      }
    }
  } catch {
    // fall through to re-login
  }

  return login(session.email, session.password, session.baseUrl);
}

export async function jetnetRequest(
  method: "GET" | "POST",
  path: string,
  session: SessionState,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolvedPath = path.replace("{apiToken}", session.apiToken);
  const url = `${session.baseUrl}${resolvedPath}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.bearerToken}`,
    "Content-Type": "application/json",
  };

  const init: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} -- ${url}`);
  }

  let data = (await response.json()) as Record<string, unknown>;
  let err = normalizeError(data, path);

  if (
    err &&
    typeof err.status === "string" &&
    err.status.toUpperCase().startsWith("INVALID")
  ) {
    const fresh = await login(session.email, session.password, session.baseUrl);
    Object.assign(session, fresh);

    const retryPath = path.replace("{apiToken}", fresh.apiToken);
    const retryUrl = `${fresh.baseUrl}${retryPath}`;
    response = await fetch(retryUrl, {
      ...init,
      headers: { ...headers, Authorization: `Bearer ${fresh.bearerToken}` },
    });
    data = (await response.json()) as Record<string, unknown>;
    err = normalizeError(data, path);
  }

  if (err) throw err;
  return data;
}
