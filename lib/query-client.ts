import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

let _sessionToken: string | null = null;
let _reLoginFn: (() => Promise<string | null>) | null = null;
let _reLoginPromise: Promise<string | null> | null = null;

export function setSessionToken(token: string | null) {
  _sessionToken = token;
}

export function setReLoginHandler(fn: (() => Promise<string | null>) | null) {
  _reLoginFn = fn;
}

async function attemptReLogin(): Promise<string | null> {
  if (!_reLoginFn) return null;
  if (_reLoginPromise) return _reLoginPromise;
  _reLoginPromise = _reLoginFn().finally(() => {
    _reLoginPromise = null;
  });
  return _reLoginPromise;
}

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (_sessionToken) {
    headers["Authorization"] = `Bearer ${_sessionToken}`;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  let res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401 && _reLoginFn) {
    const newToken = await attemptReLogin();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    let res = await fetch(url.toString(), {
      headers: authHeaders(),
      credentials: "include",
    });

    if (res.status === 401 && _reLoginFn) {
      const newToken = await attemptReLogin();
      if (newToken) {
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${newToken}` },
          credentials: "include",
        });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
