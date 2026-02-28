import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Platform,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePersona } from "@/contexts/PersonaContext";
import { useAircraftProfile } from "@/hooks/useAircraftProfile";
import { ProfileTabs } from "@/components/ProfileTabs";
import type { TabIndex } from "@/components/ProfileTabs";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { SpecsIntelTab } from "@/components/tabs/SpecsIntelTab";
import { SummaryTab } from "@/components/tabs/SummaryTab";
import { ProfileSkeleton } from "@/components/SkeletonLoader";

export default function AircraftProfileScreen() {
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { addRecentSearch } = useAuth();
  const { personaId } = usePersona();

  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const [contentOpacity] = useState(new Animated.Value(1));

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const {
    profile,
    condensed,
    relationships,
    pictures,
    phase1Status,
    phase2Status,
    phase3Status,
    isPhase1Loading,
    refetchPhase1,
    refetchPhase2,
  } = useAircraftProfile(registration);

  React.useEffect(() => {
    if (registration) {
      addRecentSearch(registration);
    }
  }, [registration]);

  const handleTabChange = useCallback(
    (index: TabIndex) => {
      if (index === activeTab) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Animated.sequence([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
      setActiveTab(index);
    },
    [activeTab, contentOpacity]
  );

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    queryClient.invalidateQueries({
      queryKey: ["/api/aircraft", registration, "profile"],
    });
    if (activeTab >= 1) {
      queryClient.invalidateQueries({
        queryKey: ["/api/aircraft/enrich"],
      });
    }
  }, [registration, activeTab, queryClient]);

  if (isPhase1Loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? webTopInset : insets.top }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  if (phase1Status === "error" || !profile) {
    return (
      <View
        style={[
          styles.container,
          styles.errorContainer,
          { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? webTopInset : insets.top },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={48}
          color={colors.secondaryLabel}
        />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Couldn't load aircraft
        </Text>
        <Text
          style={[styles.errorMessage, { color: colors.secondaryLabel }]}
        >
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => refetchPhase1()}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.separator,
            paddingTop: Platform.OS === "web" ? webTopInset : insets.top,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.tint} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text
              style={[styles.headerRegistration, { color: colors.text }]}
              numberOfLines={1}
            >
              {profile.registration}
            </Text>
            <Text
              style={[styles.headerModel, { color: colors.secondaryLabel }]}
              numberOfLines={1}
            >
              {profile.yearMfr} {profile.make} {profile.model}
              {profile.series ? ` ${profile.series}` : ""}
            </Text>
          </View>
        </View>
      </View>

      <ProfileTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        personaId={personaId}
        phaseStatuses={[phase1Status, phase2Status, phase3Status]}
      />

      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{
          paddingBottom: (insets.bottom || webBottomInset) + 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isPhase1Loading}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentOpacity }}>
          {activeTab === 0 && (
            <OverviewTab
              profile={profile}
              pictures={pictures}
              isPicturesLoading={phase2Status === "loading"}
              relationships={relationships ?? null}
              isRelationshipsLoading={phase3Status === "loading"}
            />
          )}
          {activeTab === 1 && (
            <SpecsIntelTab
              profile={profile}
              condensed={condensed}
              personaId={personaId}
              isCondensedLoading={phase2Status === "loading"}
            />
          )}
          {activeTab === 2 && (
            <SummaryTab
              registration={registration!}
              profile={profile}
              phase1Status={phase1Status}
              phase2Status={phase2Status}
              phase3Status={phase3Status}
            />
          )}
        </Animated.View>
      </ScrollView>
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
    textAlign: "center" as const,
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
  stickyHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
  },
  backButton: {
    marginRight: 4,
    marginLeft: -8,
  },
  headerText: {
    flex: 1,
  },
  headerRegistration: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  headerModel: {
    fontSize: 15,
    marginTop: 2,
  },
  tabContent: {
    flex: 1,
  },
});
