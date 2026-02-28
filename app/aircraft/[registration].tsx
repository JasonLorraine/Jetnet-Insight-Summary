import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors, getScoreColor } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { AircraftCard } from "@/components/AircraftCard";
import { ScoreGauge } from "@/components/ScoreGauge";
import { FactorBar } from "@/components/FactorBar";
import { OwnerCard } from "@/components/OwnerCard";
import { CompanyCard } from "@/components/CompanyCard";
import { ContactRow } from "@/components/ContactRow";
import { FleetItem } from "@/components/FleetItem";
import { SpecsSection } from "@/components/SpecsSection";
import { ProfileSkeleton } from "@/components/SkeletonLoader";
import type { AircraftProfile, ModelTrendSignals } from "@/shared/types";

export default function AircraftProfileScreen() {
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLLMConfigured, addRecentSearch } = useAuth();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const {
    data: profile,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<AircraftProfile>({
    queryKey: ["/api/aircraft", registration, "profile"],
    enabled: !!registration,
  });

  React.useEffect(() => {
    if (registration) {
      addRecentSearch(registration);
    }
  }, [registration]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Lookup Failed</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {(error as Error)?.message || "Aircraft not found."}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = profile.hotNotScore;
  const owner = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );
  const operator = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "operator"
  );
  const hasOwnershipData =
    owner ||
    operator ||
    profile.companyProfile ||
    profile.contacts.length > 0 ||
    (profile.ownerIntelligence?.fleetAircraft &&
      profile.ownerIntelligence.fleetAircraft.length > 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingBottom: (insets.bottom || webBottomInset) + 20,
        paddingHorizontal: 16,
        paddingTop: 8,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            queryClient.invalidateQueries({
              queryKey: ["/api/aircraft", registration, "profile"],
            });
          }}
        />
      }
    >
      {/* 1. Hero — Aircraft Identity */}
      <AircraftCard profile={profile} />

      {/* 2. "Will it sell?" — Hot/Not Score */}
      {score ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame-outline" size={18} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Will it sell?
            </Text>
          </View>
          <ScoreGauge score={score.score} label={score.label} size="large" />
          <Text style={[styles.timeToSell, { color: colors.textSecondary }]}>
            Est. time to sell: {score.timeToSellEstimateDays} days
          </Text>
          <View style={styles.factorsContainer}>
            {score.factors.map((f, i) => (
              <FactorBar
                key={i}
                name={f.name}
                value={f.value}
                weight={f.weight}
                explanation={f.explanation}
              />
            ))}
          </View>
          {score.assumptions.length > 0 ? (
            <View style={[styles.assumptions, { borderTopColor: colors.border }]}>
              <Text style={[styles.assumptionsTitle, { color: colors.textSecondary }]}>
                Assumptions
              </Text>
              {score.assumptions.map((a, i) => (
                <Text key={i} style={[styles.assumptionText, { color: colors.textSecondary }]}>
                  {a}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 3. "Who owns this?" — Owner/Operator + Company + Contacts + Fleet */}
      {hasOwnershipData ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Who owns this?
            </Text>
          </View>

          <View style={styles.ownerOperatorBlock}>
            {owner ? (
              <View style={styles.ownerOperatorRow}>
                <Text style={[styles.ownerOperatorLabel, { color: colors.textSecondary }]}>
                  Owner
                </Text>
                <Text style={[styles.ownerOperatorName, { color: colors.text }]} numberOfLines={2}>
                  {owner.companyName}
                </Text>
                {owner.contactName ? (
                  <Text style={[styles.ownerOperatorContact, { color: colors.textSecondary }]}>
                    {owner.contactName}
                    {owner.contactTitle ? ` \u00B7 ${owner.contactTitle}` : ""}
                  </Text>
                ) : null}
                {(owner.city || owner.state || owner.country) ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {[owner.city, owner.state, owner.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {operator && operator.companyName !== owner?.companyName ? (
              <View style={[styles.ownerOperatorRow, owner ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12 } : undefined]}>
                <Text style={[styles.ownerOperatorLabel, { color: colors.textSecondary }]}>
                  Operator
                </Text>
                <Text style={[styles.ownerOperatorName, { color: colors.text }]} numberOfLines={2}>
                  {operator.companyName}
                </Text>
                {operator.contactName ? (
                  <Text style={[styles.ownerOperatorContact, { color: colors.textSecondary }]}>
                    {operator.contactName}
                    {operator.contactTitle ? ` \u00B7 ${operator.contactTitle}` : ""}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {profile.companyProfile ? (
            <CompanyCard company={profile.companyProfile} />
          ) : null}

          {profile.ownerIntelligence?.fleetAircraft && profile.ownerIntelligence.fleetAircraft.length > 0 ? (
            <View style={styles.fleetSection}>
              <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>
                Fleet ({profile.ownerIntelligence.fleetAircraft.length} aircraft)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fleetList}
              >
                {profile.ownerIntelligence.fleetAircraft.map((item) => (
                  <View key={item.aircraftId} style={styles.fleetCard}>
                    <FleetItem
                      aircraft={item}
                      onPress={() =>
                        router.push(
                          `/aircraft/${encodeURIComponent(item.registration)}`
                        )
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {profile.contacts.length > 0 ? (
            <View style={styles.contactsSection}>
              <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>
                Key Contacts ({profile.contacts.length})
              </Text>
              {profile.contacts.slice(0, 8).map((contact, i) => (
                <ContactRow key={i} contact={contact} aircraftRegistration={profile.registration} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4. "What is it?" — Aircraft Specs */}
      {profile.specs ? (
        <SpecsSection specs={profile.specs} estimatedAFTT={profile.estimatedAFTT} />
      ) : null}

      {/* 5. "Is it active?" — Utilization + Market Signals combined */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse-outline" size={18} color={colors.tint} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Is it active?
          </Text>
        </View>

        <View style={styles.utilGrid}>
          <UtilStat
            label="For Sale"
            value={profile.marketSignals.forSale ? "Yes" : "No"}
            colors={colors}
          />
          {profile.marketSignals.askingPrice ? (
            <UtilStat
              label="Asking Price"
              value={profile.marketSignals.askingPrice}
              colors={colors}
            />
          ) : null}
          {profile.marketSignals.daysOnMarket !== null ? (
            <UtilStat
              label="Days on Market"
              value={String(profile.marketSignals.daysOnMarket)}
              colors={colors}
            />
          ) : null}
        </View>

        {profile.utilizationSummary ? (
          <View style={[styles.utilizationBlock, { borderTopColor: colors.border }]}>
            <View style={styles.utilGrid}>
              <UtilStat
                label="Total Flights"
                value={String(profile.utilizationSummary.totalFlights)}
                colors={colors}
              />
              <UtilStat
                label="Avg/Month"
                value={profile.utilizationSummary.avgFlightsPerMonth.toFixed(1)}
                colors={colors}
              />
              <UtilStat
                label="Period"
                value={profile.utilizationSummary.dateRange}
                colors={colors}
              />
            </View>
          </View>
        ) : null}
      </View>

      {/* 6. "What's the market?" — Model Trends */}
      {profile.modelTrends ? (
        <ModelTrendsSection trends={profile.modelTrends} colors={colors} colorScheme={colorScheme} />
      ) : null}

      {/* 7. Owner Intelligence Deep-Dive */}
      {profile.ownerIntelligence ? (
        <OwnerCard intel={profile.ownerIntelligence} />
      ) : null}

      {/* 8. AI Summary */}
      {isLLMConfigured ? (
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push(`/summary/${encodeURIComponent(registration!)}`);
          }}
        >
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.aiButtonText}>Generate AI Summary</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.push("/setup-llm")}
        >
          <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.aiButtonText, { color: colors.textSecondary }]}>
            Configure AI for Summaries
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function ModelTrendsSection({
  trends,
  colors,
  colorScheme,
}: {
  trends: ModelTrendSignals;
  colors: ReturnType<typeof useThemeColors>;
  colorScheme: "light" | "dark" | null | undefined;
}) {
  const heatColor = getScoreColor(trends.marketHeatScore * 100, colorScheme);

  const trendArrow = (
    trend: string
  ): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
    const up = ["Increasing", "Improving", "Rising"];
    const down = ["Decreasing", "Worsening", "Falling", "Declining"];
    if (up.includes(trend)) return { icon: "arrow-up", color: colors.success };
    if (down.includes(trend)) return { icon: "arrow-down", color: colors.error };
    return { icon: "remove", color: colors.textSecondary };
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up-outline" size={18} color={colors.tint} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          What's the market?
        </Text>
      </View>

      <View style={styles.momentumHeader}>
        <View style={[styles.momentumBadge, { backgroundColor: heatColor + "22" }]}>
          <Text style={[styles.momentumLabel, { color: heatColor }]}>
            {trends.marketHeatLabel} Seller Market
          </Text>
          <Ionicons
            name={
              trends.marketHeatLabel === "Strong"
                ? "arrow-up"
                : trends.marketHeatLabel === "Weak"
                  ? "arrow-down"
                  : "remove"
            }
            size={14}
            color={heatColor}
          />
        </View>
        <Text style={[styles.heatScore, { color: heatColor }]}>
          {Math.round(trends.marketHeatScore * 100)}%
        </Text>
      </View>

      <View style={[styles.trendGrid, { borderTopColor: colors.border }]}>
        <TrendRow
          label="Inventory"
          value={trends.inventoryTrend}
          arrow={trendArrow(trends.inventoryTrend)}
          colors={colors}
        />
        <TrendRow
          label="Days on Market"
          value={trends.domTrend}
          arrow={trendArrow(trends.domTrend)}
          colors={colors}
        />
        <TrendRow
          label="Asking Prices"
          value={trends.askingPriceTrend}
          arrow={trendArrow(trends.askingPriceTrend)}
          colors={colors}
        />
        <TrendRow
          label="Transaction Velocity"
          value={trends.transactionVelocityTrend}
          arrow={trendArrow(trends.transactionVelocityTrend)}
          colors={colors}
        />
      </View>

      {trends.avgDaysOnMarket !== null ? (
        <View style={[styles.avgDomRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.utilLabel, { color: colors.textSecondary }]}>
            Avg Model DOM
          </Text>
          <Text style={[styles.utilValue, { color: colors.text }]}>
            {trends.avgDaysOnMarket} days
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TrendRow({
  label,
  value,
  arrow,
  colors,
}: {
  label: string;
  value: string;
  arrow: { icon: keyof typeof Ionicons.glyphMap; color: string };
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.trendRow}>
      <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.trendValueRow}>
        <Ionicons name={arrow.icon} size={12} color={arrow.color} />
        <Text style={[styles.trendValue, { color: arrow.color }]}>{value}</Text>
      </View>
    </View>
  );
}

function UtilStat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.utilStat}>
      <Text style={[styles.utilLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.utilValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 300,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  ownerOperatorBlock: {
    marginBottom: 12,
  },
  ownerOperatorRow: {
    marginBottom: 8,
  },
  ownerOperatorLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  ownerOperatorName: {
    fontSize: 20,
    fontWeight: "700" as const,
    lineHeight: 26,
  },
  ownerOperatorContact: {
    fontSize: 14,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
  },
  timeToSell: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  factorsContainer: {
    marginTop: 8,
  },
  assumptions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 8,
  },
  assumptionsTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  assumptionText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  utilizationBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  utilGrid: {
    gap: 12,
  },
  utilStat: {
    gap: 2,
  },
  utilLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  utilValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontVariant: ["tabular-nums" as const],
  },
  momentumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  momentumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  momentumLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  heatScore: {
    fontSize: 24,
    fontWeight: "700" as const,
    fontVariant: ["tabular-nums" as const],
  },
  trendGrid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 10,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendLabel: {
    fontSize: 13,
  },
  trendValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  avgDomRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
    gap: 2,
  },
  fleetSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  fleetList: {
    gap: 8,
  },
  fleetCard: {
    width: 220,
  },
  contactsSection: {
    marginTop: 4,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
});
