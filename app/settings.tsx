import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePersona } from "@/contexts/PersonaContext";
import { useThemeColors } from "@/constants/colors";
import { PERSONAS } from "@/constants/personas";

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const {
    logout,
    isLLMConfigured,
    llmProvider,
    clearLLMConfig,
    recentSearches,
    clearRecentSearches,
  } = useAuth();
  const { personaId, personaConfig } = usePersona();

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace("/");
    };

    if (Platform.OS === "web") {
      doLogout();
    } else {
      Alert.alert("Disconnect", "Disconnect from JETNET?", [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const handleClearLLM = () => {
    const doClear = async () => {
      await clearLLMConfig();
    };

    if (Platform.OS === "web") {
      doClear();
    } else {
      Alert.alert("Remove AI Key", "Remove your stored API key?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doClear },
      ]);
    }
  };

  const handleClearRecents = () => {
    const doClear = async () => {
      await clearRecentSearches();
    };

    if (Platform.OS === "web") {
      doClear();
    } else {
      Alert.alert("Clear History", "Clear all recent searches?", [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: doClear },
      ]);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: (insets.bottom || webBottomInset) + 20 }}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          JETNET Connection
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.rowText, { color: colors.text }]}>Connected</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Active Persona
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Ionicons
              name={personaConfig ? "person-circle" : "person-circle-outline"}
              size={20}
              color={personaConfig ? colors.tint : colors.textSecondary}
            />
            <Text style={[styles.rowText, { color: colors.text }]}>
              {personaConfig ? personaConfig.label : "No persona selected"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionRow, { borderTopColor: colors.border }]}
            onPress={() => router.push("/select-persona")}
          >
            <Text style={[styles.actionText, { color: colors.accent }]}>
              {personaConfig ? "Change Persona" : "Select Persona"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          AI Configuration
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {isLLMConfigured ? (
            <>
              <View style={styles.row}>
                <Ionicons name="sparkles" size={20} color={colors.tint} />
                <Text style={[styles.rowText, { color: colors.text }]}>
                  {llmProvider === "openai" ? "OpenAI" : "Anthropic"} configured
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionRow, { borderTopColor: colors.border }]}
                onPress={() => router.push("/setup-llm")}
              >
                <Text style={[styles.actionText, { color: colors.accent }]}>
                  Change Provider
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionRow, { borderTopColor: colors.border }]}
                onPress={handleClearLLM}
              >
                <Text style={[styles.actionText, { color: colors.error }]}>
                  Remove API Key
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => router.push("/setup-llm")}>
              <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.text }]}>
                Configure AI Provider
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Data
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.text }]}>
              {recentSearches.length} recent searches
            </Text>
          </View>
          {recentSearches.length > 0 ? (
            <TouchableOpacity
              style={[styles.actionRow, { borderTopColor: colors.border }]}
              onPress={handleClearRecents}
            >
              <Text style={[styles.actionText, { color: colors.error }]}>
                Clear Search History
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          MCP Server
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Ionicons name="server-outline" size={20} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.text }]}>
              Available at /mcp
            </Text>
          </View>
          <Text style={[styles.mcpNote, { color: colors.textSecondary }]}>
            Streamable HTTP transport. Use with Siri Shortcuts, Claude Desktop,
            or any MCP-compatible client.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.error + "15" }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>
          Disconnect from JETNET
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "500" as const,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
  },
  mcpNote: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
