import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/constants/colors";

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, sessionToken, recentSearches, addRecentSearch, isLLMConfigured } =
    useAuth();

  const [query, setQuery] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated]);

  const handleSearch = () => {
    const reg = query.trim().toUpperCase();
    if (!reg) return;
    addRecentSearch(reg);
    router.push(`/aircraft/${encodeURIComponent(reg)}`);
    setQuery("");
  };

  const handleRecentPress = (reg: string) => {
    addRecentSearch(reg);
    router.push(`/aircraft/${encodeURIComponent(reg)}`);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: (insets.top || webTopInset) + 16,
          paddingBottom: insets.bottom || webBottomInset,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Search</Text>
          <View style={styles.headerActions}>
            {!isLLMConfigured ? (
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.tint + "18" }]}
                onPress={() => router.push("/setup-llm")}
              >
                <Ionicons name="sparkles-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Tail number (e.g. N123AB)"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {query.trim().length > 0 ? (
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: colors.tint }]}
            onPress={handleSearch}
          >
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            <Text style={styles.goButtonText}>Look Up {query.toUpperCase()}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {recentSearches.length > 0 ? (
        <View style={styles.recentsSection}>
          <Text style={[styles.recentsTitle, { color: colors.textSecondary }]}>
            Recent Searches
          </Text>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item}
            scrollEnabled={recentSearches.length > 0}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.recentItem, { backgroundColor: colors.surface }]}
                onPress={() => handleRecentPress(item)}
              >
                <View style={styles.recentLeft}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.recentText, { color: colors.text }]}>{item}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="airplane-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Enter a tail number to get started
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Get instant Hot/Not scores, owner disposition, and AI-powered summaries.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    gap: 12,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    height: 48,
  },
  goButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  goButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  recentsSection: {
    flex: 1,
  },
  recentsTitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    marginLeft: 4,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  recentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recentText: {
    fontSize: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
});
