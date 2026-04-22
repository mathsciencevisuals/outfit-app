import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { SavedLook } from "../../types/api";

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [view, setView] = useState("Grid");
  const [scope, setScope] = useState("Saved");
  const { data, loading, error } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);
  const looks = data ?? [];

  const filtered = useMemo(
    () => looks.filter((look) => (scope === "Wishlist" ? Boolean(look.isWishlist) : !look.isWishlist)),
    [looks, scope]
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Saved looks" subtitle="Loading your curated outfit memory." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="Saved looks"
          message="Saved looks could not be loaded."
          actionLabel="Back to shops"
          onRetry={() => router.push("/shops")}
        />
      </Screen>
    );
  }

  if (looks.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No looks saved yet"
          message="Save outfits after recommendations and try-on to build a reusable shortlist."
          actionLabel="Go to discover"
          onAction={() => router.push("/discover")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Saved Looks"
        title="Your reusable outfit shortlist"
        subtitle="Saved outfits and wishlist items stay visible here instead of hiding behind broken placeholders."
      >
        <View style={styles.heroRow}>
          <Pill label={`${looks.length} looks total`} tone="success" />
          <Pill label={`${looks.filter((look) => look.isWishlist).length} wishlist`} tone="neutral" />
        </View>
        <SegmentedControl options={["Saved", "Wishlist"]} selected={scope} onSelect={setScope} />
        <SegmentedControl options={["Grid", "List"]} selected={view} onSelect={setView} />
      </SectionCard>

      <SectionCard eyebrow="Collection" title={view === "Grid" ? "Grid view" : "List view"}>
        {filtered.length === 0 ? (
          <EmptyState
            title={scope === "Wishlist" ? "No wishlist items yet" : "No saved outfits yet"}
            message="Save a try-on look or recommendation to populate this section."
            actionLabel="Go to recommendations"
            onAction={() => router.push("/recommendations")}
          />
        ) : (
          <View style={view === "Grid" ? styles.grid : styles.list}>
            {filtered.map((look: SavedLook) => (
              <View key={look.id} style={view === "Grid" ? styles.gridCard : styles.listCard}>
                <View style={styles.artBoard} />
                <View style={styles.lookMeta}>
                  <Text style={styles.lookTitle}>{look.name}</Text>
                  <Pill label={look.isWishlist ? "Wishlist" : "Saved look"} tone={look.isWishlist ? "warning" : "accent"} />
                </View>
                <Text style={styles.lookNote}>{look.note ?? "No note yet. Revisit after your next try-on."}</Text>
                <View style={styles.lookActions}>
                  <PrimaryButton size="sm" onPress={() => router.push("/shops")}>
                    Compare offers
                  </PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" onPress={() => router.push("/discover")}>
                    Find similar
                  </PrimaryButton>
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  list: {
    gap: 12
  },
  gridCard: {
    width: "48%",
    borderRadius: 22,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 12,
    gap: 10
  },
  listCard: {
    borderRadius: 22,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 14,
    gap: 10
  },
  artBoard: {
    height: 112,
    borderRadius: 18,
    backgroundColor: "#ebddca"
  },
  lookMeta: {
    gap: 8
  },
  lookTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700"
  },
  lookNote: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 20
  },
  lookActions: {
    gap: 8
  }
});
