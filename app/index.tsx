import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/constants/colors";

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/search");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: (insets.top || webTopInset) + 60,
          paddingBottom: (insets.bottom || webBottomInset) + 40,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.tint + "18" }]}>
          <Ionicons name="airplane" size={48} color={colors.tint} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Hot or Not</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Aircraft Sales Intelligence
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Instant Hot/Not scoring, owner disposition analysis, and AI-powered
          broker summaries powered by JETNET data.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push("/login")}
        >
          <Ionicons name="key-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Connect JETNET Account</Text>
        </TouchableOpacity>

        <View style={styles.features}>
          <FeatureRow icon="speedometer-outline" text="Hot/Not Score (0-100)" colors={colors} />
          <FeatureRow icon="person-outline" text="Owner Disposition Intelligence" colors={colors} />
          <FeatureRow icon="sparkles-outline" text="AI Broker Summaries" colors={colors} />
          <FeatureRow icon="server-outline" text="MCP Server for Siri / AI" colors={colors} />
        </View>
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={16} color={colors.tint} />
      <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "700" as const,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: "500" as const,
    marginTop: 6,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 320,
  },
  actions: {
    gap: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
  },
});
