import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useThemeColors, getScoreColor } from "@/constants/colors";
import { SkeletonLine } from "@/components/skeletons/SkeletonLine";
import { SkeletonCard } from "@/components/skeletons/SkeletonCard";
import { ContentReveal } from "@/components/ContentReveal";
import { CompanyCard } from "@/components/CompanyCard";
import { FleetItem } from "@/components/FleetItem";
import { PhotoGallery } from "@/components/PhotoGallery";
import { BrokerContactRow, ContactRow } from "@/components/ContactRow";
import type { AircraftProfile, AircraftPicture, IntelResponse, BrokerContact } from "@/shared/types";

interface OverviewTabProps {
  profile: AircraftProfile;
  pictures: AircraftPicture[] | undefined;
  isPicturesLoading: boolean;
  relationships: IntelResponse | null;
  isRelationshipsLoading: boolean;
}

function PhotoSkeleton() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  return (
    <View style={[photoStyles.skeleton, { backgroundColor: colors.secondaryBackground }]}>
      <Ionicons
        name="camera-outline"
        size={40}
        color={colors.tertiaryLabel}
        style={{ opacity: 0.2 }}
      />
      <SkeletonLine width={120} height={10} style={{ marginTop: 12 }} />
    </View>
  );
}

const photoStyles = StyleSheet.create({
  skeleton: {
    width: 280,
    height: 190,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

function buildContactPack(
  profile: AircraftProfile,
  recommendations: BrokerContact[]
): string {
  const lines: string[] = [];
  lines.push(
    `${profile.registration} — ${profile.yearMfr} ${profile.make} ${profile.model}`
  );
  lines.push(`S/N ${profile.serialNumber}`);
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

export function OverviewTab({ profile, pictures, isPicturesLoading, relationships, isRelationshipsLoading }: OverviewTabProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const router = useRouter();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const resolvedPictures = pictures ?? profile.pictures;
  const showPhotos = resolvedPictures && resolvedPictures.length > 0;
  const showPhotoSkeleton = isPicturesLoading && (!profile.pictures || profile.pictures.length === 0);

  const owner = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "owner"
  );
  const operator = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "operator"
  );
  const manager = profile.relationships.find(
    (r) => r.relationType.toLowerCase() === "manager"
  );
  const displayOperator = operator && operator.companyName !== owner?.companyName ? operator : null;
  const displayManager = manager && manager.companyName !== owner?.companyName && manager.companyName !== operator?.companyName ? manager : null;

  const fleet = profile.ownerIntelligence?.fleetAircraft ?? [];

  return (
    <View style={styles.content}>
      {showPhotoSkeleton ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
          contentContainerStyle={styles.galleryContent}
        >
          <PhotoSkeleton />
          <PhotoSkeleton />
        </ScrollView>
      ) : showPhotos ? (
        <ContentReveal visible={true} delay={0}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gallery}
            contentContainerStyle={styles.galleryContent}
          >
            {resolvedPictures!.map((pic, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.photoWrap}
                activeOpacity={0.85}
                onPress={() => {
                  setGalleryIndex(idx);
                  setGalleryOpen(true);
                }}
              >
                <Image
                  source={{ uri: pic.url }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                />
                {resolvedPictures!.length > 1 && idx === 0 ? (
                  <View style={styles.photoCountBadge}>
                    <Ionicons name="images-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.photoCountText}>{resolvedPictures!.length}</Text>
                  </View>
                ) : null}
                {pic.caption ? (
                  <Text
                    style={[styles.photoCaption, { color: colors.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {pic.caption}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <PhotoGallery
            pictures={resolvedPictures!}
            visible={galleryOpen}
            initialIndex={galleryIndex}
            onClose={() => setGalleryOpen(false)}
          />
        </ContentReveal>
      ) : null}

      <ContentReveal visible={true} delay={60}>
        <View style={styles.heroSection}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroReg, { color: colors.primaryLabel }]}>
              {profile.registration}
            </Text>
            {profile.hotNotScore ? (
              <View
                style={[
                  styles.scorePill,
                  {
                    backgroundColor:
                      getScoreColor(profile.hotNotScore.score, colorScheme) + "18",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scorePillText,
                    {
                      color: getScoreColor(
                        profile.hotNotScore.score,
                        colorScheme
                      ),
                    },
                  ]}
                >
                  {profile.hotNotScore.score} {profile.hotNotScore.label}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.heroModel, { color: colors.secondaryLabel }]}>
            {profile.yearMfr} {profile.make} {profile.model}
            {profile.series ? ` ${profile.series}` : ""}
          </Text>
          <Text style={[styles.heroSerial, { color: colors.tertiaryLabel }]}>
            S/N {profile.serialNumber}
          </Text>
        </View>
      </ContentReveal>

      <ContentReveal visible={true} delay={120}>
        <View style={[styles.operatorCard, { backgroundColor: colors.secondaryBackground }]}>
          {owner ? (
            <View style={styles.entityRow}>
              <View style={[styles.entityBadge, { backgroundColor: colors.systemBlue + "18" }]}>
                <Ionicons name="shield-outline" size={16} color={colors.systemBlue} />
              </View>
              <View style={styles.entityInfo}>
                <Text style={[styles.entityRole, { color: colors.tertiaryLabel }]}>Owner</Text>
                <Text style={[styles.entityName, { color: colors.primaryLabel }]} numberOfLines={1}>
                  {owner.companyName}
                </Text>
                {owner.contactName ? (
                  <Text style={[styles.entityContact, { color: colors.secondaryLabel }]} numberOfLines={1}>
                    {owner.contactName}{owner.contactTitle ? ` · ${owner.contactTitle}` : ""}
                  </Text>
                ) : null}
                {(owner.city || owner.state || owner.country) ? (
                  <View style={styles.entityLocationRow}>
                    <Ionicons name="location-outline" size={11} color={colors.tertiaryLabel} />
                    <Text style={[styles.entityLocationText, { color: colors.tertiaryLabel }]}>
                      {[owner.city, owner.state, owner.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {displayOperator ? (
            <View style={[styles.entityRow, owner ? styles.entityDivided : undefined, owner ? { borderTopColor: colors.separator } : undefined]}>
              <View style={[styles.entityBadge, { backgroundColor: colors.systemGreen + "18" }]}>
                <Ionicons name="navigate-outline" size={16} color={colors.systemGreen} />
              </View>
              <View style={styles.entityInfo}>
                <Text style={[styles.entityRole, { color: colors.tertiaryLabel }]}>Operator</Text>
                <Text style={[styles.entityName, { color: colors.primaryLabel }]} numberOfLines={1}>
                  {displayOperator.companyName}
                </Text>
                {displayOperator.contactName ? (
                  <Text style={[styles.entityContact, { color: colors.secondaryLabel }]} numberOfLines={1}>
                    {displayOperator.contactName}{displayOperator.contactTitle ? ` · ${displayOperator.contactTitle}` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {displayManager ? (
            <View style={[styles.entityRow, styles.entityDivided, { borderTopColor: colors.separator }]}>
              <View style={[styles.entityBadge, { backgroundColor: colors.systemOrange + "18" }]}>
                <Ionicons name="business-outline" size={16} color={colors.systemOrange} />
              </View>
              <View style={styles.entityInfo}>
                <Text style={[styles.entityRole, { color: colors.tertiaryLabel }]}>Manager</Text>
                <Text style={[styles.entityName, { color: colors.primaryLabel }]} numberOfLines={1}>
                  {displayManager.companyName}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.metaStrip, { borderTopColor: colors.separator }]}>
            <View style={styles.metaChip}>
              <Ionicons name="airplane-outline" size={13} color={colors.secondaryLabel} />
              <Text style={[styles.metaChipText, { color: colors.secondaryLabel }]}>
                {profile.categorySize || profile.weightClass}
              </Text>
            </View>

            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={13} color={colors.secondaryLabel} />
              <Text style={[styles.metaChipText, { color: colors.secondaryLabel }]}>
                {profile.baseLocation.city || profile.baseLocation.icao || "Unknown"}
              </Text>
            </View>

            <View style={styles.metaChip}>
              <Text style={[styles.metaChipText, { color: colors.secondaryLabel }]}>
                {profile.lifecycleStatus}
              </Text>
            </View>

            {profile.marketSignals.forSale ? (
              <View style={[styles.forSaleBadge, { backgroundColor: colors.systemRed + "18" }]}>
                <Text style={[styles.forSaleText, { color: colors.systemRed }]}>For Sale</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ContentReveal>

      {isRelationshipsLoading && !relationships && (profile.contacts?.length ?? 0) === 0 ? (
        <View style={styles.contactsSection}>
          <Text style={[styles.contactsSectionTitle, { color: colors.tertiaryLabel }]}>
            WHO'S INVOLVED
          </Text>
          <SkeletonCard lines={4} />
        </View>
      ) : (
        <ContactsSectionBlock
          relationships={relationships}
          profile={profile}
          colors={colors}
          router={router}
        />
      )}

      {profile.companyProfile ? (
        <ContentReveal visible={true} delay={240}>
          <CompanyCard company={profile.companyProfile} />
        </ContentReveal>
      ) : null}

      {fleet.length > 0 ? (
        <ContentReveal visible={true} delay={240}>
          <View style={styles.fleetSection}>
            <Text style={[styles.fleetTitle, { color: colors.secondaryLabel }]}>
              Fleet ({fleet.length} aircraft)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fleetListContent}
            >
              {fleet.map((item) => (
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
        </ContentReveal>
      ) : null}

      {profile.evolutionLink ? (
        <ContentReveal visible={true} delay={fleet.length > 0 ? 300 : 240}>
          <TouchableOpacity
            style={[styles.evolutionButton, { backgroundColor: colors.secondaryBackground }]}
            onPress={() => Linking.openURL(profile.evolutionLink)}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={18} color={colors.systemBlue} />
            <Text style={[styles.evolutionLabel, { color: colors.systemBlue }]}>
              Open in Evolution
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
          </TouchableOpacity>
        </ContentReveal>
      ) : null}
    </View>
  );
}

function ContactsSectionBlock({
  relationships,
  profile,
  colors,
  router,
}: {
  relationships: IntelResponse | null;
  profile: AircraftProfile;
  colors: ReturnType<typeof useThemeColors>;
  router: ReturnType<typeof useRouter>;
}) {
  const recs = relationships?.recommendations ?? [];
  const hasRecs = recs.length > 0;
  const hasProfileContacts = (profile.contacts?.length ?? 0) > 0;

  if (!hasRecs && !hasProfileContacts) return null;

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
    <ContentReveal visible={true} delay={180}>
      <View style={contactStyles.container}>
        <Text style={[contactStyles.sectionTitle, { color: colors.tertiaryLabel }]}>
          WHO'S INVOLVED
        </Text>

        {hasRecs ? (
          <>
            {tierOrder.map((tier) => {
              const contacts = tiers[tier];
              if (!contacts || contacts.length === 0) return null;
              return (
                <View key={tier} style={contactStyles.tierGroup}>
                  <Text
                    style={[
                      contactStyles.tierLabel,
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

            <View style={contactStyles.contactActions}>
              {recs.length > 5 ? (
                <TouchableOpacity
                  style={[
                    contactStyles.contactActionButton,
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
                      contactStyles.contactActionLabel,
                      { color: colors.systemBlue },
                    ]}
                  >
                    View All Contacts
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  contactStyles.contactActionButton,
                  { backgroundColor: colors.tertiaryBackground },
                ]}
                onPress={handleCopyPack}
              >
                <Ionicons name="copy" size={16} color={colors.systemBlue} />
                <Text
                  style={[
                    contactStyles.contactActionLabel,
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
    </ContentReveal>
  );
}

const contactStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
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
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  gallery: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  galleryContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  photoWrap: {
    width: 280,
    borderRadius: 16,
    overflow: "hidden",
  },
  photo: {
    width: 280,
    height: 190,
    borderRadius: 16,
  },
  photoCaption: {
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  photoCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600" as const,
    fontVariant: ["tabular-nums" as const],
  },
  heroSection: {
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroReg: {
    fontSize: 34,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    flex: 1,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: "600" as const,
    fontVariant: ["tabular-nums" as const],
  },
  heroModel: {
    fontSize: 20,
    fontWeight: "400" as const,
    marginTop: 4,
  },
  heroSerial: {
    fontSize: 15,
    fontWeight: "400" as const,
    marginTop: 4,
  },
  operatorCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  entityDivided: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entityBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  entityInfo: {
    flex: 1,
  },
  entityRole: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  entityName: {
    fontSize: 17,
    fontWeight: "500" as const,
    marginTop: 1,
  },
  entityContact: {
    fontSize: 13,
    marginTop: 2,
  },
  entityLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  entityLocationText: {
    fontSize: 12,
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaChipText: {
    fontSize: 13,
  },
  forSaleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  forSaleText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  fleetSection: {
    marginBottom: 12,
  },
  fleetTitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  fleetListContent: {
    gap: 8,
  },
  fleetCard: {
    width: 220,
  },
  evolutionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  evolutionLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
    flex: 1,
  },
  contactsSection: {
    marginBottom: 16,
  },
  contactsSectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
});
