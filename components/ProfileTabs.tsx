import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
  Platform,
} from "react-native";
import { useThemeColors, getPersonaAccent } from "@/constants/colors";
import type { LoadingPhase } from "@/hooks/useAircraftProfile";

export const TAB_LABELS = ["Overview", "Specs & Intel", "Summary"] as const;
export type TabIndex = 0 | 1 | 2;

interface ProfileTabsProps {
  activeTab: TabIndex;
  onTabChange: (index: TabIndex) => void;
  personaId: string | null;
  phaseStatuses: [LoadingPhase, LoadingPhase, LoadingPhase];
}

function LoadingDot({ status, accentColor }: { status: LoadingPhase; accentColor: string }) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "loading") {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  if (status === "not-started") {
    return (
      <View
        style={[
          dotStyles.dot,
          {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: colors.tertiaryLabel,
          },
        ]}
      />
    );
  }

  if (status === "loading") {
    return (
      <Animated.View
        style={[
          dotStyles.dot,
          {
            backgroundColor: accentColor,
            opacity: pulseAnim,
          },
        ]}
      />
    );
  }

  if (status === "loaded") {
    return (
      <View
        style={[
          dotStyles.dot,
          { backgroundColor: colors.systemGreen },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        dotStyles.dot,
        { backgroundColor: colors.systemOrange },
      ]}
    />
  );
}

const dotStyles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 5,
  },
});

export function ProfileTabs({
  activeTab,
  onTabChange,
  personaId,
  phaseStatuses,
}: ProfileTabsProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const accent = getPersonaAccent(personaId ?? "", colorScheme);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<number[]>([0, 0, 0]);
  const tabPositions = useRef<number[]>([0, 0, 0]);
  const [layoutReady, setLayoutReady] = React.useState(false);

  useEffect(() => {
    if (!layoutReady) return;
    Animated.timing(slideAnim, {
      toValue: tabPositions.current[activeTab],
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [activeTab, layoutReady, slideAnim]);

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;
    if (tabWidths.current.every((w) => w > 0)) {
      slideAnim.setValue(tabPositions.current[activeTab]);
      setLayoutReady(true);
    }
  };

  const underlineWidth = layoutReady ? tabWidths.current[activeTab] : 0;

  const animatedUnderlineWidth = layoutReady
    ? slideAnim.interpolate({
        inputRange: tabPositions.current.map((_, i) => tabPositions.current[i]),
        outputRange: tabWidths.current,
        extrapolate: "clamp",
      })
    : 0;

  const tabPhaseMap: [LoadingPhase, LoadingPhase, LoadingPhase] = [
    phaseStatuses[0],
    phaseStatuses[1],
    phaseStatuses[2],
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {TAB_LABELS.map((label, index) => {
          const isActive = activeTab === index;
          return (
            <TouchableOpacity
              key={label}
              style={styles.tab}
              onPress={() => onTabChange(index as TabIndex)}
              activeOpacity={0.7}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                handleTabLayout(index, x, width);
              }}
            >
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? accent : colors.secondaryLabel,
                      fontWeight: isActive ? ("600" as const) : ("400" as const),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <LoadingDot
                  status={tabPhaseMap[index]}
                  accentColor={accent}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {layoutReady && (
        <Animated.View
          style={[
            styles.underline,
            {
              backgroundColor: accent,
              transform: [{ translateX: slideAnim }],
              width: animatedUnderlineWidth as any,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  underline: {
    height: 2,
    borderRadius: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
  },
});
