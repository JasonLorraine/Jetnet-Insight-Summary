import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  useColorScheme,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useThemeColors, getPersonaAccent } from "@/constants/colors";
import { ContentReveal } from "@/components/ContentReveal";
import { SkeletonSection } from "@/components/skeletons/SkeletonSection";
import { SkeletonCard } from "@/components/skeletons/SkeletonCard";
import { BrokerContactRow, ContactRow } from "@/components/ContactRow";
import type {
  CondensedAircraftProfile,
  IntelResponse,
  AircraftProfile,
  BrokerContact,
} from "@/shared/types";
import type { PersonaId } from "@/shared/types/persona";

interface SpecsIntelTabProps {
  profile: AircraftProfile | undefined;
  condensed: CondensedAircraftProfile | undefined;
  relationships: IntelResponse | undefined;
  personaId: PersonaId | null;
  isCondensedLoading: boolean;
  isRelationshipsLoading: boolean;
}

type SectionKey = "specs" | "contacts" | "flights" | "market";

const MARKET_VISIBLE_PERSONAS: PersonaId[] = [
  "dealer_broker",
  "charter",
  "fleet_management",
  "finance",
];

const PERSONA_SECTION_ORDER: Record<string, SectionKey[]> = {
  dealer_broker: ["contacts", "specs", "market", "flights"],
  fbo: ["specs", "flights", "contacts", "market"],
  mro: ["specs", "flights", "contacts", "market"],
  charter: ["flights", "specs", "contacts", "market"],
  fleet_management: ["contacts", "flights", "specs", "market"],
  finance: ["specs", "contacts", "market", "flights"],
  catering: ["specs", "flights", "contacts", "market"],
  ground_transportation: ["flights", "contacts", "specs", "market"],
  detailing: ["specs", "flights", "contacts", "market"],
};

const DEFAULT_ORDER: SectionKey[] = ["specs", "contacts", "flights", "market"];

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
    { label: "Range", value: condensed.maxRange, suffix: " nm" },
    { label: "Max Speed", value: condensed.maxSpeed, suffix: " ktas" },
    { label: "Passengers", value: condensed.maxPassengers },
    {
      label: "Engines",
      value:
        condensed.engineModel
          ? `${condensed.engineCount ?? ""} x ${condensed.engineModel}`.trim()
          : condensed.engineCount,
    },
    { label: "MTOW", value: condensed.mtow, suffix: " lbs" },
    { label: "Cabin Height", value: condensed.cabinHeight, suffix: " in" },
    { label: "Cabin Width", value: condensed.cabinWidth, suffix: " in" },
    { label: "Cabin Length", value: condensed.cabinLength, suffix: " in" },
    { label: "Baggage", value: condensed.baggageCapacity, suffix: " cu ft" },
    { label: "Airframe Hours", value: condensed.airframeTotalHours },
    { label: "Airframe Landings", value: condensed.airframeTotalLandings },
    { label: "Engine Hours", value: condensed.engineTotalHours },
  ];
}

function hasAnySpecValue(condensed: CondensedAircraftProfile): boolean {
  const rows = getSpecRows(condensed);
  return rows.some((r) => r.value != null && r.value !== "" && r.value !== 0);
}

function hasMarketData(condensed: CondensedAircraftProfile): boolean {
  return (
    condensed.forSale ||
    condensed.daysOnMarket != null ||
    condensed.askingPrice != null
  );
}

function formatNumber(val: number): string {
  return val.toLocaleString("en-US");
}

function SpecsSection({
  condensed,
  colors,
}: {
  condensed: CondensedAircraftProfile;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const rows = getSpecRows(condensed).filter(
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

function ContactsSection({
  relationships,
  profile,
  colors,
}: {
  relationships: IntelResponse;
  profile: AircraftProfile;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const router = useRouter();
  const recs = relationships.recommendations;
  if (recs.length === 0 && profile.contacts.length === 0) return null;

  const tiers: Record<string, BrokerContact[]> = {};
  for (const rec of recs) {
    const tier = rec.tier || "Secondary";
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(rec);
  }

  const tierOrder = [
    "Primary",
    "Aviation Ops",
    "Finance/Admin",
    "Secondary",
    "Historical",
  ];

  async function handleCopyPack() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const pack = buildContactPack(profile, recs);
    try {
      await Clipboard.setStringAsync(pack);
      Alert.alert("Copied", "Contact pack copied to clipboard.");
    } catch {
      Alert.alert("Contact Pack", pack);
    }
  }

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
        WHO'S INVOLVED
      </Text>

      {recs.length > 0 ? (
        <>
          {tierOrder.map((tier) => {
            const contacts = tiers[tier];
            if (!contacts || contacts.length === 0) return null;
            return (
              <View key={tier} style={sectionStyles.tierGroup}>
                <Text
                  style={[
                    sectionStyles.tierLabel,
                    { color: colors.secondaryLabel },
                  ]}
                >
                  {tier}
                </Text>
                {contacts.map((rec, i) => (
                  <BrokerContactRow
                    key={rec.contactId ?? i}
                    contact={rec}
                    aircraftRegistration={profile.registration}
                  />
                ))}
              </View>
            );
          })}

          <View style={sectionStyles.contactActions}>
            {recs.length > 5 ? (
              <TouchableOpacity
                style={[
                  sectionStyles.contactActionButton,
                  { backgroundColor: colors.tertiaryBackground },
                ]}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push(
                    `/contacts/${encodeURIComponent(profile.registration)}`
                  );
                }}
              >
                <Ionicons name="people" size={16} color={colors.systemBlue} />
                <Text
                  style={[
                    sectionStyles.contactActionLabel,
                    { color: colors.systemBlue },
                  ]}
                >
                  View All Contacts
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                sectionStyles.contactActionButton,
                { backgroundColor: colors.tertiaryBackground },
              ]}
              onPress={handleCopyPack}
            >
              <Ionicons name="copy" size={16} color={colors.systemBlue} />
              <Text
                style={[
                  sectionStyles.contactActionLabel,
                  { color: colors.systemBlue },
                ]}
              >
                Copy Contact Pack
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        profile.contacts.slice(0, 8).map((contact, i) => (
          <ContactRow
            key={i}
            contact={contact}
            aircraftRegistration={profile.registration}
          />
        ))
      )}
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

function buildContactPack(
  profile: AircraftProfile,
  recommendations: BrokerContact[]
): string {
  const lines: string[] = [];
  lines.push(
    `Aircraft: ${profile.registration} — ${profile.make} ${profile.model} (${profile.yearMfr})`
  );
  lines.push("");

  const owner = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );
  const operator = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "operator"
  );
  const manager = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "manager"
  );
  if (owner) lines.push(`Owner: ${owner.companyName}`);
  if (operator && operator.companyName !== owner?.companyName)
    lines.push(`Operator: ${operator.companyName}`);
  if (manager && manager.companyName !== owner?.companyName)
    lines.push(`Manager: ${manager.companyName}`);

  const topContacts = recommendations.slice(0, 5);
  if (topContacts.length > 0) {
    lines.push("");
    lines.push("Top Contacts:");
    for (const c of topContacts) {
      const name = `${c.firstName} ${c.lastName}`.trim();
      const parts = [name];
      if (c.roleBadge) parts.push(`[${c.roleBadge}]`);
      if (c.companyName) parts.push(`— ${c.companyName}`);
      lines.push(`  ${parts.join(" ")}`);
      if (c.title) lines.push(`    ${c.title}`);
      if (c.emails.length > 0) lines.push(`    ${c.emails[0]}`);
      if (c.phones.mobile) lines.push(`    Mobile: ${c.phones.mobile}`);
      else if (c.phones.work) lines.push(`    Work: ${c.phones.work}`);
    }
  }

  return lines.join("\n");
}

export function SpecsIntelTab({
  profile,
  condensed,
  relationships,
  personaId,
  isCondensedLoading,
  isRelationshipsLoading,
}: SpecsIntelTabProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const accentColor = getPersonaAccent(personaId ?? "", colorScheme);

  const sectionOrder = getSectionOrder(personaId);

  const showMarket =
    personaId != null && MARKET_VISIBLE_PERSONAS.includes(personaId);

  const specsReady = !!condensed;
  const contactsReady = !!relationships;
  const flightsReady = !!profile?.utilizationSummary;
  const marketReady = !!condensed && showMarket;

  const hasSpecs = condensed ? hasAnySpecValue(condensed) : false;
  const hasContacts =
    relationships
      ? relationships.recommendations.length > 0 ||
        (profile?.contacts?.length ?? 0) > 0
      : false;
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
        return (
          <ContentReveal key={key} visible={specsReady} delay={delay}>
            <SpecsSection condensed={condensed!} colors={colors} />
          </ContentReveal>
        );

      case "contacts":
        if (!contactsReady) {
          return isRelationshipsLoading ? (
            <View key={key} style={sectionStyles.sectionMargin}>
              <Text
                style={[
                  sectionStyles.sectionTitle,
                  { color: colors.tertiaryLabel },
                ]}
              >
                WHO'S INVOLVED
              </Text>
              <SkeletonCard lines={4} />
            </View>
          ) : null;
        }
        if (!hasContacts) return null;
        return (
          <ContentReveal key={key} visible={contactsReady} delay={delay}>
            <ContactsSection
              relationships={relationships!}
              profile={profile!}
              colors={colors}
            />
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
    <ScrollView
      style={sectionStyles.scrollView}
      contentContainerStyle={sectionStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {sectionOrder.map((key) => {
        const element = renderSection(key, staggerIdx);
        if (element) staggerIdx++;
        return element;
      })}
    </ScrollView>
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
  tierGroup: {
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    marginBottom: 6,
    marginTop: 4,
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  contactActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  contactActionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
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
