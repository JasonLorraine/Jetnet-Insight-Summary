import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { SummaryCard } from "@/components/SummaryCard";
import type { AISummary } from "@/shared/types";

export default function SummaryScreen() {
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { llmProvider, getLLMApiKey, isLLMConfigured } = useAuth();

  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleGenerate = async () => {
    if (!isLLMConfigured || !llmProvider) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const apiKey = await getLLMApiKey();
      if (!apiKey) {
        setError("No API key found. Please configure in settings.");
        return;
      }

      const res = await apiRequest(
        "POST",
        `/api/aircraft/${encodeURIComponent(registration!)}/ai-summary`,
        { provider: llmProvider, apiKey }
      );

      const data: AISummary = await res.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: (insets.bottom || webBottomInset) + 20,
      }}
    >
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.tint} />
        <Text style={[styles.title, { color: colors.text }]}>
          AI Summary for {registration}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {llmProvider === "openai" ? "OpenAI GPT-4o-mini" : "Claude Sonnet"}
        </Text>
      </View>

      {!summary && !loading && !error ? (
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: colors.tint }]}
          onPress={handleGenerate}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.generateText}>Generate Summary</Text>
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing aircraft data...
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={handleGenerate}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {summary ? (
        <>
          <SummaryCard summary={summary} />
          <TouchableOpacity
            style={[styles.regenerateButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={handleGenerate}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={[styles.regenerateText, { color: colors.textSecondary }]}>
              Regenerate
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    gap: 4,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 16,
  },
  regenerateText: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
});
