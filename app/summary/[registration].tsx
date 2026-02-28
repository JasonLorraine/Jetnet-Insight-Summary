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

type SummaryMode = "insight" | "flight";

interface LoadingStep {
  label: string;
  done: boolean;
}

export default function SummaryScreen() {
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { llmProvider, getLLMApiKey, isLLMConfigured } = useAuth();

  const [insightSummary, setInsightSummary] = useState<AISummary | null>(null);
  const [flightSummary, setFlightSummary] = useState<AISummary | null>(null);
  const [flightIntel, setFlightIntel] = useState<Record<string, unknown> | null>(null);
  const [activeMode, setActiveMode] = useState<SummaryMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noFlightData, setNoFlightData] = useState(false);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleGenerateInsight = async () => {
    if (!isLLMConfigured || !llmProvider) return;
    setActiveMode("insight");
    setLoading(true);
    setError(null);
    setInsightSummary(null);
    triggerHaptic();

    setLoadingSteps([
      { label: "Building aircraft profile", done: false },
      { label: "Analyzing market position", done: false },
      { label: "Generating intelligence", done: false },
    ]);

    try {
      const apiKey = await getLLMApiKey();
      if (!apiKey) {
        setError("No API key found. Please configure in settings.");
        return;
      }

      setLoadingSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, done: true } : s))
      );

      const res = await apiRequest(
        "POST",
        `/api/aircraft/${encodeURIComponent(registration!)}/ai-summary`,
        { provider: llmProvider, apiKey }
      );

      setLoadingSteps((prev) =>
        prev.map((s, i) => (i <= 1 ? { ...s, done: true } : s))
      );

      const data: AISummary = await res.json();
      setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));
      setInsightSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlight = async () => {
    if (!isLLMConfigured || !llmProvider) return;
    setActiveMode("flight");
    setLoading(true);
    setError(null);
    setNoFlightData(false);
    setFlightSummary(null);
    setFlightIntel(null);
    triggerHaptic();

    setLoadingSteps([
      { label: "Downloading flight activity", done: false },
      { label: "Analyzing operational patterns", done: false },
      { label: "Generating intelligence", done: false },
    ]);

    try {
      const apiKey = await getLLMApiKey();
      if (!apiKey) {
        setError("No API key found. Please configure in settings.");
        return;
      }

      setLoadingSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, done: true } : s))
      );

      const res = await apiRequest(
        "POST",
        `/api/aircraft/${encodeURIComponent(registration!)}/flight-summary`,
        { provider: llmProvider, apiKey }
      );

      setLoadingSteps((prev) =>
        prev.map((s, i) => (i <= 1 ? { ...s, done: true } : s))
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Flight data unavailable.");
      }

      const data = await res.json();

      if (data.message === "no-usable-flights" || data.fallbackTo === "standard-summary") {
        setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));
        setLoading(false);
        setNoFlightData(true);
        return;
      }

      setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));

      const { flightIntelligence, ...summary } = data;
      setFlightSummary(summary as AISummary);
      if (flightIntelligence) setFlightIntel(flightIntelligence);
    } catch (err: any) {
      setError(err.message || "Failed to generate flight summary.");
    } finally {
      setLoading(false);
    }
  };

  const currentSummary = activeMode === "flight" ? flightSummary : insightSummary;
  const hasBothSummaries = !!insightSummary && !!flightSummary;

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
          AI Intelligence for {registration}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {llmProvider === "openai" ? "OpenAI GPT-4o-mini" : "Claude Sonnet"}
        </Text>
      </View>

      {!loading && !currentSummary && !error ? (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.tint }]}
            onPress={handleGenerateInsight}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <View style={styles.buttonContent}>
              <Text style={styles.generateText}>Generate AI Summary</Text>
              <Text style={styles.buttonSubtext}>
                Ownership, market, transactions
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: "#0A84FF" }]}
            onPress={handleGenerateFlight}
          >
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
            <View style={styles.buttonContent}>
              <Text style={styles.generateText}>Flight Intelligence</Text>
              <Text style={styles.buttonSubtext}>
                12-month activity, patterns, signals
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          {loadingSteps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              {step.done ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : (
                <ActivityIndicator size="small" color={colors.tint} />
              )}
              <Text
                style={[
                  styles.stepLabel,
                  { color: step.done ? colors.success : colors.textSecondary },
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.tint }]}
              onPress={activeMode === "flight" ? handleGenerateFlight : handleGenerateInsight}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => {
                setError(null);
                setActiveMode(null);
              }}
            >
              <Text style={[styles.retryText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {noFlightData ? (
        <View style={[styles.noFlightBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="airplane-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.noFlightTitle, { color: colors.text }]}>
            No flight activity found
          </Text>
          <Text style={[styles.noFlightSubtext, { color: colors.textSecondary }]}>
            Flight tracking data is not available for this aircraft in the past 12 months. This can happen with privately operated aircraft or aircraft with limited ADS-B coverage.
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.tint, marginTop: 16 }]}
            onPress={() => {
              setNoFlightData(false);
              setActiveMode(null);
              handleGenerateInsight();
            }}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <View style={styles.buttonContent}>
              <Text style={styles.generateText}>Generate AI Summary Instead</Text>
              <Text style={styles.buttonSubtext}>Ownership, market, transactions</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.surfaceSecondary, marginTop: 8 }]}
            onPress={() => {
              setNoFlightData(false);
              setActiveMode(null);
            }}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Back to options</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {currentSummary ? (
        <>
          {activeMode === "flight" && flightIntel ? (
            <FlightIntelCard intel={flightIntel} colors={colors} />
          ) : null}

          <SummaryCard summary={currentSummary} />

          {hasBothSummaries ? (
            <View style={styles.switchRow}>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  activeMode === "insight"
                    ? { backgroundColor: colors.tint }
                    : { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => setActiveMode("insight")}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={activeMode === "insight" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.switchText,
                    {
                      color:
                        activeMode === "insight" ? "#FFFFFF" : colors.textSecondary,
                    },
                  ]}
                >
                  Insight
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.switchButton,
                  activeMode === "flight"
                    ? { backgroundColor: "#0A84FF" }
                    : { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => setActiveMode("flight")}
              >
                <Ionicons
                  name="navigate"
                  size={16}
                  color={activeMode === "flight" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.switchText,
                    {
                      color:
                        activeMode === "flight" ? "#FFFFFF" : colors.textSecondary,
                    },
                  ]}
                >
                  Flight
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.otherActions}>
            {!insightSummary && activeMode !== "insight" ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={handleGenerateInsight}
              >
                <Ionicons name="flash-outline" size={18} color={colors.tint} />
                <Text style={[styles.secondaryText, { color: colors.text }]}>
                  Also Generate AI Summary
                </Text>
              </TouchableOpacity>
            ) : null}

            {!flightSummary && activeMode !== "flight" ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={handleGenerateFlight}
              >
                <Ionicons name="navigate-outline" size={18} color="#0A84FF" />
                <Text style={[styles.secondaryText, { color: colors.text }]}>
                  Also Generate Flight Intelligence
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={activeMode === "flight" ? handleGenerateFlight : handleGenerateInsight}
            >
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
                Regenerate
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function FlightIntelCard({
  intel,
  colors,
}: {
  intel: Record<string, unknown>;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const fi = intel as {
    totalFlights: number;
    totalHours: number | null;
    avgFlightsPerMonth: number;
    uniqueAirports: number;
    primaryBaseAirport: string | null;
    activityTrendSlope: string;
    routeRepetitionScore: number;
    internationalRatio: number;
    charterLikelihood: string;
    preSaleSignals: string[];
    topRoutes: { route: string; count: number }[];
    downtimePeriods: { startDate: string; endDate: string; days: number }[];
  };

  const trendColor =
    fi.activityTrendSlope === "increasing"
      ? colors.success
      : fi.activityTrendSlope === "declining"
        ? colors.error
        : colors.textSecondary;

  const trendIcon: keyof typeof Ionicons.glyphMap =
    fi.activityTrendSlope === "increasing"
      ? "arrow-up"
      : fi.activityTrendSlope === "declining"
        ? "arrow-down"
        : "remove";

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.surface }]}>
      <View style={cardStyles.header}>
        <Ionicons name="navigate" size={18} color="#0A84FF" />
        <Text style={[cardStyles.headerTitle, { color: colors.text }]}>
          Flight Intelligence
        </Text>
      </View>

      <View style={cardStyles.statsGrid}>
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: colors.text }]}>
            {fi.totalFlights}
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.textSecondary }]}>
            Flights
          </Text>
        </View>
        {fi.totalHours ? (
          <View style={cardStyles.statItem}>
            <Text style={[cardStyles.statValue, { color: colors.text }]}>
              {fi.totalHours}
            </Text>
            <Text style={[cardStyles.statLabel, { color: colors.textSecondary }]}>
              Hours
            </Text>
          </View>
        ) : null}
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: colors.text }]}>
            {fi.avgFlightsPerMonth}
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.textSecondary }]}>
            Avg/Month
          </Text>
        </View>
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: colors.text }]}>
            {fi.uniqueAirports}
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.textSecondary }]}>
            Airports
          </Text>
        </View>
      </View>

      <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />

      <View style={cardStyles.detailRows}>
        {fi.primaryBaseAirport ? (
          <View style={cardStyles.detailRow}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={[cardStyles.detailLabel, { color: colors.textSecondary }]}>
              Primary Base
            </Text>
            <Text style={[cardStyles.detailValue, { color: colors.text }]}>
              {fi.primaryBaseAirport}
            </Text>
          </View>
        ) : null}
        <View style={cardStyles.detailRow}>
          <Ionicons name={trendIcon} size={14} color={trendColor} />
          <Text style={[cardStyles.detailLabel, { color: colors.textSecondary }]}>
            Activity Trend
          </Text>
          <Text style={[cardStyles.detailValue, { color: trendColor }]}>
            {fi.activityTrendSlope.charAt(0).toUpperCase() + fi.activityTrendSlope.slice(1)}
          </Text>
        </View>
        <View style={cardStyles.detailRow}>
          <Ionicons name="repeat" size={14} color={colors.textSecondary} />
          <Text style={[cardStyles.detailLabel, { color: colors.textSecondary }]}>
            Route Repetition
          </Text>
          <Text style={[cardStyles.detailValue, { color: colors.text }]}>
            {fi.routeRepetitionScore}%
          </Text>
        </View>
        <View style={cardStyles.detailRow}>
          <Ionicons name="globe" size={14} color={colors.textSecondary} />
          <Text style={[cardStyles.detailLabel, { color: colors.textSecondary }]}>
            International
          </Text>
          <Text style={[cardStyles.detailValue, { color: colors.text }]}>
            {Math.round(fi.internationalRatio * 100)}%
          </Text>
        </View>
        {fi.charterLikelihood !== "low" ? (
          <View style={cardStyles.detailRow}>
            <Ionicons name="warning" size={14} color="#FF9F0A" />
            <Text style={[cardStyles.detailLabel, { color: colors.textSecondary }]}>
              Charter Likelihood
            </Text>
            <Text style={[cardStyles.detailValue, { color: "#FF9F0A" }]}>
              {fi.charterLikelihood.charAt(0).toUpperCase() + fi.charterLikelihood.slice(1)}
            </Text>
          </View>
        ) : null}
      </View>

      {fi.topRoutes.length > 0 ? (
        <>
          <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[cardStyles.subHeader, { color: colors.textSecondary }]}>
            Top Routes
          </Text>
          {fi.topRoutes.slice(0, 3).map((r, i) => (
            <View key={i} style={cardStyles.routeRow}>
              <Text style={[cardStyles.routeText, { color: colors.text }]}>
                {r.route}
              </Text>
              <Text style={[cardStyles.routeCount, { color: colors.textSecondary }]}>
                {r.count}x
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {fi.preSaleSignals.length > 0 ? (
        <>
          <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[cardStyles.subHeader, { color: colors.error }]}>
            Pre-Sale Signals
          </Text>
          {fi.preSaleSignals.map((s, i) => (
            <View key={i} style={cardStyles.signalRow}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[cardStyles.signalText, { color: colors.text }]}>{s}</Text>
            </View>
          ))}
        </>
      ) : null}

      {fi.downtimePeriods.length > 0 ? (
        <>
          <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[cardStyles.subHeader, { color: colors.textSecondary }]}>
            Downtime Periods (30+ days)
          </Text>
          {fi.downtimePeriods.slice(0, 3).map((d, i) => (
            <View key={i} style={cardStyles.routeRow}>
              <Text style={[cardStyles.routeText, { color: colors.textSecondary }]}>
                {d.startDate} to {d.endDate}
              </Text>
              <Text style={[cardStyles.routeCount, { color: colors.error }]}>
                {d.days}d
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    fontVariant: ["tabular-nums" as const],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  detailRows: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  subHeader: {
    fontSize: 12,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    paddingLeft: 22,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums" as const],
  },
  routeCount: {
    fontSize: 13,
    fontVariant: ["tabular-nums" as const],
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 2,
  },
  signalText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});

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
  buttonGroup: {
    gap: 10,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  buttonContent: {
    flex: 1,
  },
  generateText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  buttonSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 1,
  },
  loadingContainer: {
    gap: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepLabel: {
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
  errorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  switchRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  switchButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  switchText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  otherActions: {
    gap: 8,
    marginTop: 12,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  noFlightBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center" as const,
    gap: 8,
  },
  noFlightTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    marginTop: 4,
  },
  noFlightSubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center" as const,
    maxWidth: 320,
  },
});
