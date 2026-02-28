import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { BrokerContactRow } from "@/components/ContactRow";
import type { IntelResponse, BrokerContact, BrokerTier } from "@/shared/types";

const FILTER_CHIPS: { label: string; tier: BrokerTier }[] = [
  { label: "Primary", tier: "Primary" },
  { label: "Aviation Ops", tier: "Aviation Ops" },
  { label: "Finance/Admin", tier: "Finance/Admin" },
  { label: "Secondary", tier: "Secondary" },
];

export default function AllContactsScreen() {
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<BrokerTier>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery<IntelResponse>({
    queryKey: ["/api/intel/relationships", registration],
    enabled: !!registration,
  });

  const contacts = data?.recommendations ?? [];

  const filtered = useMemo(() => {
    let result = [...contacts];

    if (activeFilters.size > 0) {
      result = result.filter((c) => activeFilters.has(c.tier));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const company = c.companyName.toLowerCase();
        const title = (c.title || "").toLowerCase();
        return fullName.includes(q) || company.includes(q) || title.includes(q);
      });
    }

    result.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [contacts, activeFilters, search]);

  const toggleFilter = useCallback((tier: BrokerTier) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: BrokerContact }) => (
      <BrokerContactRow contact={item} aircraftRegistration={registration} />
    ),
    [registration],
  );

  const keyExtractor = useCallback(
    (item: BrokerContact, index: number) =>
      `${item.contactId ?? "nc"}-${item.companyId ?? "nco"}-${index}`,
    [],
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading contacts...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load contacts
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={() => refetch()}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search name, company, or title..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== "ios" ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.chipsRow}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilters.has(chip.tier);
          return (
            <TouchableOpacity
              key={chip.tier}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.accent : colors.surfaceSecondary,
                },
              ]}
              onPress={() => toggleFilter(chip.tier)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? "#FFFFFF" : colors.text },
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.countText, { color: colors.textSecondary }]}>
        {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        {activeFilters.size > 0 || search ? " (filtered)" : ""}
      </Text>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 },
        ]}
        scrollEnabled={filtered.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {contacts.length === 0
                ? "No contacts found for this aircraft"
                : "No contacts match your filters"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  countText: {
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
});
