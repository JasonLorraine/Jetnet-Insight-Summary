import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { setSessionToken as setGlobalToken, setReLoginHandler, getApiUrl } from "@/lib/query-client";

interface AuthState {
  sessionToken: string | null;
  sessionExpiresAt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  llmProvider: "openai" | "anthropic" | null;
  isLLMConfigured: boolean;
  recentSearches: string[];
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveLLMConfig: (provider: "openai" | "anthropic", apiKey: string) => Promise<void>;
  clearLLMConfig: () => Promise<void>;
  getLLMApiKey: () => Promise<string | null>;
  addRecentSearch: (reg: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  getSessionToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYS = {
  SESSION_TOKEN: "hotornot_session_token",
  SESSION_EXPIRES: "hotornot_session_expires",
  JETNET_EMAIL: "hotornot_jetnet_email",
  JETNET_PASSWORD: "hotornot_jetnet_password",
  LLM_PROVIDER: "hotornot_llm_provider",
  LLM_API_KEY: "hotornot_llm_api_key",
  RECENT_SEARCHES: "hotornot_recent_searches",
};

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

function registerReLoginHandler() {
  setReLoginHandler(async () => {
    try {
      const [email, password] = await Promise.all([
        secureGet(KEYS.JETNET_EMAIL),
        secureGet(KEYS.JETNET_PASSWORD),
      ]);
      if (!email || !password) return null;

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/login", baseUrl);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jetnetEmail: email, jetnetPassword: password }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const { appSessionToken, expiresAt } = data;

      setGlobalToken(appSessionToken);
      await Promise.all([
        secureSet(KEYS.SESSION_TOKEN, appSessionToken),
        secureSet(KEYS.SESSION_EXPIRES, expiresAt),
      ]);

      return appSessionToken;
    } catch {
      return null;
    }
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    sessionToken: null,
    sessionExpiresAt: null,
    isAuthenticated: false,
    isLoading: true,
    llmProvider: null,
    isLLMConfigured: false,
    recentSearches: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [token, expires, provider, apiKey, searchesJson] = await Promise.all([
          secureGet(KEYS.SESSION_TOKEN),
          secureGet(KEYS.SESSION_EXPIRES),
          secureGet(KEYS.LLM_PROVIDER),
          secureGet(KEYS.LLM_API_KEY),
          AsyncStorage.getItem(KEYS.RECENT_SEARCHES),
        ]);

        let isAuthenticated = false;
        if (token && expires) {
          const expiresDate = new Date(expires);
          if (expiresDate > new Date()) {
            isAuthenticated = true;
          } else {
            await secureDelete(KEYS.SESSION_TOKEN);
            await secureDelete(KEYS.SESSION_EXPIRES);
          }
        }

        const recentSearches = searchesJson ? JSON.parse(searchesJson) : [];

        if (isAuthenticated && token) {
          setGlobalToken(token);
        }

        registerReLoginHandler();

        setState({
          sessionToken: isAuthenticated ? token : null,
          sessionExpiresAt: isAuthenticated ? expires : null,
          isAuthenticated,
          isLoading: false,
          llmProvider: provider as "openai" | "anthropic" | null,
          isLLMConfigured: !!(provider && apiKey),
          recentSearches,
        });
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    })();

    return () => {
      setReLoginHandler(null);
    };
  }, []);

  const loginFn = useCallback(async (email: string, password: string) => {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/login", baseUrl);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jetnetEmail: email, jetnetPassword: password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message || "Login failed");
    }

    const data = await res.json();
    const { appSessionToken, expiresAt } = data;

    setGlobalToken(appSessionToken);

    await Promise.all([
      secureSet(KEYS.SESSION_TOKEN, appSessionToken),
      secureSet(KEYS.SESSION_EXPIRES, expiresAt),
      secureSet(KEYS.JETNET_EMAIL, email),
      secureSet(KEYS.JETNET_PASSWORD, password),
    ]);

    setState((prev) => ({
      ...prev,
      sessionToken: appSessionToken,
      sessionExpiresAt: expiresAt,
      isAuthenticated: true,
    }));
  }, []);

  const logoutFn = useCallback(async () => {
    if (state.sessionToken) {
      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/logout", baseUrl);
        await fetch(url.toString(), {
          method: "POST",
          headers: { Authorization: `Bearer ${state.sessionToken}` },
        });
      } catch {}
    }

    setGlobalToken(null);

    await Promise.all([
      secureDelete(KEYS.SESSION_TOKEN),
      secureDelete(KEYS.SESSION_EXPIRES),
      secureDelete(KEYS.JETNET_EMAIL),
      secureDelete(KEYS.JETNET_PASSWORD),
    ]);

    setState((prev) => ({
      ...prev,
      sessionToken: null,
      sessionExpiresAt: null,
      isAuthenticated: false,
    }));
  }, [state.sessionToken]);

  const saveLLMConfig = useCallback(
    async (provider: "openai" | "anthropic", apiKey: string) => {
      await Promise.all([
        secureSet(KEYS.LLM_PROVIDER, provider),
        secureSet(KEYS.LLM_API_KEY, apiKey),
      ]);
      setState((prev) => ({
        ...prev,
        llmProvider: provider,
        isLLMConfigured: true,
      }));
    },
    []
  );

  const clearLLMConfig = useCallback(async () => {
    await Promise.all([
      secureDelete(KEYS.LLM_PROVIDER),
      secureDelete(KEYS.LLM_API_KEY),
    ]);
    setState((prev) => ({
      ...prev,
      llmProvider: null,
      isLLMConfigured: false,
    }));
  }, []);

  const getLLMApiKey = useCallback(async () => {
    return secureGet(KEYS.LLM_API_KEY);
  }, []);

  const addRecentSearch = useCallback(
    async (reg: string) => {
      const upper = reg.toUpperCase().trim();
      const updated = [upper, ...state.recentSearches.filter((s) => s !== upper)].slice(0, 20);
      await AsyncStorage.setItem(KEYS.RECENT_SEARCHES, JSON.stringify(updated));
      setState((prev) => ({ ...prev, recentSearches: updated }));
    },
    [state.recentSearches]
  );

  const clearRecentSearches = useCallback(async () => {
    await AsyncStorage.removeItem(KEYS.RECENT_SEARCHES);
    setState((prev) => ({ ...prev, recentSearches: [] }));
  }, []);

  const getSessionToken = useCallback(() => {
    return state.sessionToken;
  }, [state.sessionToken]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login: loginFn,
        logout: logoutFn,
        saveLLMConfig,
        clearLLMConfig,
        getLLMApiKey,
        addRecentSearch,
        clearRecentSearches,
        getSessionToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
