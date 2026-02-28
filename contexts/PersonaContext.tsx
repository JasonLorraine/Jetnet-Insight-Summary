import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { PersonaId, PersonaConfig } from "@/shared/types/persona";
import { PERSONAS } from "@/constants/personas";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "./AuthContext";

interface PersonaContextValue {
  personaId: PersonaId | null;
  personaConfig: PersonaConfig | null;
  isPersonaSelected: boolean;
  setPersona: (id: PersonaId) => Promise<void>;
  clearPersona: () => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

const PERSONA_STORAGE_KEY = "hotornot_persona_id";

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

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { sessionToken, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const stored = await secureGet(PERSONA_STORAGE_KEY);
        if (stored && stored in PERSONAS) {
          setPersonaId(stored as PersonaId);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPersonaId(null);
    }
  }, [isAuthenticated]);

  const setPersona = useCallback(async (id: PersonaId) => {
    await secureSet(PERSONA_STORAGE_KEY, id);
    setPersonaId(id);

    if (sessionToken) {
      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/persona", baseUrl);
        await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ personaId: id }),
        });
      } catch {}
    }

    queryClient.removeQueries({ queryKey: ["/api/aircraft"] });
  }, [sessionToken, queryClient]);

  const clearPersona = useCallback(async () => {
    await secureDelete(PERSONA_STORAGE_KEY);
    setPersonaId(null);
    queryClient.removeQueries({ queryKey: ["/api/aircraft"] });
  }, [queryClient]);

  const personaConfig = personaId ? PERSONAS[personaId] : null;

  if (!loaded) return null;

  return (
    <PersonaContext.Provider
      value={{
        personaId,
        personaConfig,
        isPersonaSelected: personaId !== null,
        setPersona,
        clearPersona,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within PersonaProvider");
  return ctx;
}
