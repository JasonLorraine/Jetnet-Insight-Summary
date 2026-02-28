import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Animated,
} from "react-native";
import { useThemeColors, getPersonaAccent } from "@/constants/colors";
import { ContentReveal } from "@/components/ContentReveal";
import { SkeletonSection } from "@/components/skeletons/SkeletonSection";
import type {
  CondensedAircraftProfile,
  AircraftProfile,
} from "@/shared/types";
import type { PersonaId } from "@/shared/types/persona";

interface SpecsIntelTabProps {
  profile: AircraftProfile | undefined;
  condensed: CondensedAircraftProfile | undefined;
  personaId: PersonaId | null;
  isCondensedLoading: boolean;
}

type SectionKey = "specs" | "flights" | "market";

const MARKET_VISIBLE_PERSONAS: PersonaId[] = [
  "dealer_broker",
  "charter",
  "fleet_management",
  "finance",
];

const PERSONA_SECTION_ORDER: Record<string, SectionKey[]> = {
  dealer_broker: ["specs", "market", "flights"],
  fbo: ["specs", "flights", "market"],
  mro: ["specs", "flights", "market"],
  charter: ["flights", "specs", "market"],
  fleet_management: ["flights", "specs", "market"],
  finance: ["specs", "market", "flights"],
  catering: ["specs", "flights", "market"],
  ground_transportation: ["flights", "specs", "market"],
  detailing: ["specs", "flights", "market"],
};

const DEFAULT_ORDER: SectionKey[] = ["specs", "flights", "market"];

function getSectionOrder(personaId: PersonaId | null): SectionKey[] {
  if (!personaId) return DEFAULT_ORDER;
  return PERSONA_SECTION_ORDER[personaId] ?? DEFAULT_ORDER;
}

interface SpecRowData {
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
}

function getSpecRows(condensed: CondensedAircraftProfile): SpecRowData[] {
  return [
    { label: "Passengers", value: condensed.maxPassengers },
    {
      label: "Engines",
      value:
        condensed.engineModel
          ? `${condensed.engineCount ?? ""} x ${condensed.engineModel}`.trim()
          : condensed.engineCount,
    },
    { label: "Range", value: condensed.maxRange, suffix: " nm" },
    { label: "Max Speed", value: condensed.maxSpeed, suffix: " ktas" },
    { label: "MTOW", value: condensed.mtow, suffix: " lbs" },
    { label: "Cabin Height", value: condensed.cabinHeight, suffix: " in" },
    { label: "Cabin Width", value: condensed.cabinWidth, suffix: " in" },
    { label: "Cabin Length", value: condensed.cabinLength, suffix: " in" },
    { label: "Baggage", value: condensed.baggageCapacity, suffix: " cu ft" },
    { label: "Airframe Hours", value: condensed.airframeTotalHours },
    { label: "Airframe Landings", value: condensed.airframeTotalLandings },
    { label: "Engine Hours", value: condensed.engineTotalHours },
    { label: "Base Airport", value: condensed.basedAirport },
    { label: "Avionics", value: condensed.avionics },
    { label: "Maintenance Program", value: condensed.lastInspectionType },
    { label: "Interior Year", value: condensed.interiorDate },
    { label: "Exterior Year", value: condensed.exteriorDate },
  ];
}

function getSpecRowsFromProfile(profile: AircraftProfile): SpecRowData[] {
  const specs = profile.specs;
  if (!specs) return [];
  return [
    { label: "Passengers", value: specs.cabinSeats },
    {
      label: "Engines",
      value:
        specs.engineModel
          ? `${specs.engineCount ?? ""} x ${specs.engineModel}`.trim()
          : specs.engineCount,
    },
    { label: "Range", value: specs.rangeNm, suffix: " nm" },
    { label: "Max Speed", value: specs.maxSpeed, suffix: " ktas" },
    { label: "MTOW", value: specs.mtow, suffix: " lbs" },
    { label: "Landings", value: specs.totalLandings },
    { label: "Avionics", value: specs.avionicsSuite },
    { label: "WiFi", value: specs.wifiEquipped != null ? (specs.wifiEquipped ? "Yes" : "No") : null },
  ];
}

function getMergedSpecRows(
  condensed: CondensedAircraftProfile,
  profile: AircraftProfile | null
): SpecRowData[] {
  const specs = profile?.specs;
  return [
    { label: "Passengers", value: condensed.maxPassengers ?? specs?.cabinSeats },
    {
      label: "Engines",
      value:
        (condensed.engineModel ?? specs?.engineModel)
          ? `${condensed.engineCount ?? specs?.engineCount ?? ""} x ${condensed.engineModel ?? specs?.engineModel}`.trim()
          : condensed.engineCount ?? specs?.engineCount,
    },
    { label: "Range", value: condensed.maxRange ?? specs?.rangeNm, suffix: " nm" },
    { label: "Max Speed", value: condensed.maxSpeed ?? specs?.maxSpeed, suffix: " ktas" },
    { label: "MTOW", value: condensed.mtow ?? specs?.mtow, suffix: " lbs" },
    { label: "Cabin Height", value: condensed.cabinHeight, suffix: " in" },
    { label: "Cabin Width", value: condensed.cabinWidth, suffix: " in" },
    { label: "Cabin Length", value: condensed.cabinLength, suffix: " in" },
    { label: "Baggage", value: condensed.baggageCapacity, suffix: " cu ft" },
    { label: "Airframe Hours", value: condensed.airframeTotalHours },
    { label: "Airframe Landings", value: condensed.airframeTotalLandings ?? specs?.totalLandings },
    { label: "Engine Hours", value: condensed.engineTotalHours },
    { label: "Base Airport", value: condensed.basedAirport },
    { label: "Avionics", value: condensed.avionics ?? specs?.avionicsSuite },
    { label: "Maintenance Program", value: condensed.lastInspectionType },
    { label: "Interior Year", value: condensed.interiorDate },
    { label: "Exterior Year", value: condensed.exteriorDate },
    ...(specs?.wifiEquipped != null ? [{ label: "WiFi", value: specs.wifiEquipped ? "Yes" : "No" }] : []),
  ];
}

function hasAnySpecValue(condensed: CondensedAircraftProfile): boolean {
  const rows = getSpecRows(condensed);
  return rows.some((r) => r.value != null && r.value !== "" && r.value !== 0);
}

function hasAnySpecRowValue(rows: SpecRowData[]): boolean {
  return rows.some((r) => r.value != null && r.value !== "" && r.value !== 0);
}

function hasMarketData(condensed: CondensedAircraftProfile): boolean {
  return (
    condensed.forSale ||
    condensed.daysOnMarket != null ||
    condensed.askingPrice != null ||
    condensed.estimatedValue != null ||
    condensed.lifecycle != null
  );
}

function formatNumber(val: number): string {
  return val.toLocaleString("en-US");
}

function SpecsSection({
  condensed,
  profile,
  colors,
}: {
  condensed: CondensedAircraftProfile;
  profile?: AircraftProfile | null;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const rows = (profile ? getMergedSpecRows(condensed, profile) : getSpecRows(condensed)).filter(
    (r) => r.value != null && r.value !== "" && r.value !== 0
  );
  if (rows.length === 0) return null;

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
        AIRCRAFT SPECIFICATIONS
      </Text>
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: colors.secondaryBackground },
        ]}
      >
        {rows.map((row, i) => {
          const displayVal =
            typeof row.value === "number"
              ? `${formatNumber(row.value)}${row.suffix ?? ""}`
              : `${row.value}${row.suffix ?? ""}`;

          return (
            <View key={row.label}>
              <View style={sectionStyles.specRow}>
                <Text
                  style={[sectionStyles.specLabel, { color: colors.tertiaryLabel }]}
                >
                  {row.label}
                </Text>
                <Text
                  style={[sectionStyles.specValue, { color: colors.primaryLabel }]}
                >
                  {displayVal}
                </Text>
              </View>
              {i < rows.length - 1 ? (
                <View
                  style={[
                    sectionStyles.separator,
                    { backgroundColor: colors.separator },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FallbackSpecsSection({
  rows,
  colors,
}: {
  rows: SpecRowData[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  const filtered = rows.filter(
    (r) => r.value != null && r.value !== "" && r.value !== 0
  );
  if (filtered.length === 0) return null;

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
        AIRCRAFT SPECIFICATIONS
      </Text>
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: colors.secondaryBackground },
        ]}
      >
        {filtered.map((row, i) => {
          const displayVal =
            typeof row.value === "number"
              ? `${formatNumber(row.value)}${row.suffix ?? ""}`
              : `${row.value}${row.suffix ?? ""}`;

          return (
            <View key={row.label}>
              <View style={sectionStyles.specRow}>
                <Text
                  style={[sectionStyles.specLabel, { color: colors.tertiaryLabel }]}
                >
                  {row.label}
                </Text>
                <Text
                  style={[sectionStyles.specValue, { color: colors.primaryLabel }]}
                >
                  {displayVal}
                </Text>
              </View>
              {i < filtered.length - 1 ? (
                <View
                  style={[
                    sectionStyles.separator,
                    { backgroundColor: colors.separator },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedBar({
  ratio,
  accentColor,
  delay,
}: {
  ratio: number;
  accentColor: string;
  delay: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: ratio,
      duration: 600,
      delay,
      useNativeDriver: false,
    }).start();
  }, [ratio, delay, widthAnim]);

  const width = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={sectionStyles.barTrack}>
      <Animated.View
        style={[
          sectionStyles.barFill,
          { width: width as any, backgroundColor: accentColor },
        ]}
      />
    </View>
  );
}

function FlightActivitySection({
  profile,
  accentColor,
  colors,
}: {
  profile: AircraftProfile;
  accentColor: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const util = profile.utilizationSummary;
  if (!util) return null;

  const topRoutes = util.topRoutes ?? [];
  const topAirports = util.topAirports ?? [];

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
        FLIGHT ACTIVITY
      </Text>
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: colors.secondaryBackground },
        ]}
      >
        <View style={sectionStyles.flightStatsRow}>
          <View style={sectionStyles.flightStatBlock}>
            <Text
              style={[sectionStyles.flightStatNumber, { color: colors.primaryLabel }]}
            >
              {util.totalFlights}
            </Text>
            <Text
              style={[sectionStyles.flightStatLabel, { color: colors.tertiaryLabel }]}
            >
              Total Flights
            </Text>
          </View>
          <View style={sectionStyles.flightStatBlock}>
            <Text
              style={[sectionStyles.flightStatNumber, { color: colors.primaryLabel }]}
            >
              {util.avgFlightsPerMonth.toFixed(1)}
            </Text>
            <Text
              style={[sectionStyles.flightStatLabel, { color: colors.tertiaryLabel }]}
            >
              Avg/Month
            </Text>
          </View>
          {(util.homeBase || profile.baseLocation?.icao) ? (
            <View style={sectionStyles.flightStatBlock}>
              <Text
                style={[
                  sectionStyles.flightStatNumber,
                  { color: colors.primaryLabel, fontSize: 20 },
                ]}
              >
                {util.homeBase || profile.baseLocation?.icao}
              </Text>
              <Text
                style={[
                  sectionStyles.flightStatLabel,
                  { color: colors.tertiaryLabel },
                ]}
              >
                Home Base est.
              </Text>
            </View>
          ) : null}
        </View>

        {topRoutes.length > 0 ? (
          <View style={sectionStyles.barsSection}>
            <Text
              style={[
                sectionStyles.barsSubtitle,
                { color: colors.secondaryLabel },
              ]}
            >
              Top Routes
            </Text>
            {topRoutes.slice(0, 5).map((route, i) => {
              const maxCount = topRoutes[0].count;
              return (
                <View key={i} style={sectionStyles.barRow}>
                  <Text
                    style={[sectionStyles.barLabel, { color: colors.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {route.from} → {route.to}
                  </Text>
                  <View style={sectionStyles.barContainer}>
                    <AnimatedBar
                      ratio={route.count / maxCount}
                      accentColor={accentColor}
                      delay={i * 80}
                    />
                    <Text
                      style={[
                        sectionStyles.barCount,
                        { color: colors.tertiaryLabel },
                      ]}
                    >
                      {route.count}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {topAirports.length > 0 ? (
          <View style={sectionStyles.barsSection}>
            <Text
              style={[
                sectionStyles.barsSubtitle,
                { color: colors.secondaryLabel },
              ]}
            >
              Top Airports
            </Text>
            {topAirports.slice(0, 5).map((apt, i) => {
              const maxCount = topAirports[0].count;
              return (
                <View key={i} style={sectionStyles.barRow}>
                  <Text
                    style={[sectionStyles.barLabel, { color: colors.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {apt.code}
                  </Text>
                  <View style={sectionStyles.barContainer}>
                    <AnimatedBar
                      ratio={apt.count / maxCount}
                      accentColor={accentColor}
                      delay={i * 80}
                    />
                    <Text
                      style={[
                        sectionStyles.barCount,
                        { color: colors.tertiaryLabel },
                      ]}
                    >
                      {apt.count}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <Text style={[sectionStyles.periodLabel, { color: colors.tertiaryLabel }]}>
          {util.windowStart && util.windowEnd
            ? `Last 12 months (${util.windowStart} – ${util.windowEnd})`
            : util.dateRange || "Last 12 months"}
        </Text>
        {util.notes && util.notes.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            {util.notes.map((note, i) => (
              <Text
                key={i}
                style={[sectionStyles.noteText, { color: colors.tertiaryLabel }]}
              >
                {note}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MarketContextSection({
  condensed,
  colors,
}: {
  condensed: CondensedAircraftProfile;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (!hasMarketData(condensed)) return null;

  const items: Array<{ label: string; value: string }> = [];

  items.push({
    label: "For Sale",
    value: condensed.forSale ? "Yes" : "No",
  });

  if (condensed.askingPrice != null && condensed.askingPrice > 0) {
    items.push({
      label: "Asking Price",
      value: `$${formatNumber(condensed.askingPrice)}`,
    });
  }

  if (condensed.daysOnMarket != null && condensed.daysOnMarket > 0) {
    items.push({
      label: "Days on Market",
      value: String(condensed.daysOnMarket),
    });
  }

  if (condensed.estimatedValue != null) {
    items.push({
      label: "Estimated Value",
      value: `$${formatNumber(condensed.estimatedValue)}`,
    });
  }

  if (condensed.avgEstimatedValue != null) {
    items.push({
      label: "Model Avg Value",
      value: `$${formatNumber(condensed.avgEstimatedValue)}`,
    });
  }

  if (condensed.lifecycle) {
    items.push({
      label: "Lifecycle Status",
      value: condensed.lifecycle,
    });
  }

  if (condensed.weightClass) {
    items.push({
      label: "Weight Class",
      value: condensed.weightClass,
    });
  }

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
        MARKET CONTEXT
      </Text>
      <View
        style={[
          sectionStyles.card,
          { backgroundColor: colors.secondaryBackground },
        ]}
      >
        {items.map((item, i) => (
          <View key={item.label}>
            <View style={sectionStyles.specRow}>
              <Text
                style={[sectionStyles.specLabel, { color: colors.tertiaryLabel }]}
              >
                {item.label}
              </Text>
              <Text
                style={[sectionStyles.specValue, { color: colors.primaryLabel }]}
              >
                {item.value}
              </Text>
            </View>
            {i < items.length - 1 ? (
              <View
                style={[
                  sectionStyles.separator,
                  { backgroundColor: colors.separator },
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function SpecsIntelTab({
  profile,
  condensed,
  personaId,
  isCondensedLoading,
}: SpecsIntelTabProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const accentColor = getPersonaAccent(personaId ?? "", colorScheme);

  const sectionOrder = getSectionOrder(personaId);

  const showMarket =
    personaId != null && MARKET_VISIBLE_PERSONAS.includes(personaId);

  const profileSpecRows = profile ? getSpecRowsFromProfile(profile) : [];
  const hasProfileSpecs = hasAnySpecRowValue(profileSpecRows);
  const specsReady = !!condensed || hasProfileSpecs;
  const flightsReady = !!profile?.utilizationSummary;
  const marketReady = !!condensed && showMarket;

  const hasSpecs = condensed
    ? hasAnySpecRowValue(profile ? getMergedSpecRows(condensed, profile) : getSpecRows(condensed))
    : hasProfileSpecs;
  const hasFlights = !!profile?.utilizationSummary;
  const hasMarket = condensed ? hasMarketData(condensed) && showMarket : false;

  const renderSection = (key: SectionKey, staggerIndex: number) => {
    const delay = staggerIndex * 120;

    switch (key) {
      case "specs":
        if (!specsReady) {
          return isCondensedLoading ? (
            <SkeletonSection
              key={key}
              title="AIRCRAFT SPECIFICATIONS"
              rows={6}
              style={sectionStyles.sectionMargin}
            />
          ) : null;
        }
        if (!hasSpecs) return null;
        if (condensed) {
          const mergedRows = profile ? getMergedSpecRows(condensed, profile) : getSpecRows(condensed);
          const filtered = mergedRows.filter((r) => r.value != null && r.value !== "" && r.value !== 0);
          if (filtered.length === 0) return null;
          return (
            <ContentReveal key={key} visible={true} delay={delay}>
              <SpecsSection condensed={condensed} profile={profile} colors={colors} />
            </ContentReveal>
          );
        }
        return (
          <ContentReveal key={key} visible={true} delay={delay}>
            <FallbackSpecsSection rows={profileSpecRows} colors={colors} />
          </ContentReveal>
        );

      case "flights":
        if (!flightsReady) return null;
        if (!hasFlights) return null;
        return (
          <ContentReveal key={key} visible={flightsReady} delay={delay}>
            <FlightActivitySection
              profile={profile!}
              accentColor={accentColor}
              colors={colors}
            />
          </ContentReveal>
        );

      case "market":
        if (!showMarket) return null;
        if (!marketReady) {
          return isCondensedLoading ? (
            <SkeletonSection
              key={key}
              title="MARKET CONTEXT"
              rows={3}
              style={sectionStyles.sectionMargin}
            />
          ) : null;
        }
        if (!hasMarket) return null;
        return (
          <ContentReveal key={key} visible={marketReady} delay={delay}>
            <MarketContextSection condensed={condensed!} colors={colors} />
          </ContentReveal>
        );

      default:
        return null;
    }
  };

  let staggerIdx = 0;

  return (
    <View style={sectionStyles.scrollContent}>
      {sectionOrder.map((key) => {
        const element = renderSection(key, staggerIdx);
        if (element) staggerIdx++;
        return element;
      })}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  container: {
    marginBottom: 16,
  },
  sectionMargin: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  specValue: {
    fontSize: 17,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  flightStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  flightStatBlock: {
    alignItems: "center",
  },
  flightStatNumber: {
    fontSize: 32,
    fontWeight: "200" as const,
    fontVariant: ["tabular-nums" as const],
  },
  flightStatLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    marginTop: 4,
  },
  barsSection: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    marginTop: 4,
  },
  barsSubtitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  barRow: {
    marginBottom: 10,
  },
  barLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  barCount: {
    fontSize: 12,
    fontVariant: ["tabular-nums" as const],
    width: 30,
    textAlign: "right",
  },
  periodLabel: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic" as const,
  },
  noteText: {
    fontSize: 11,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
  },
});
