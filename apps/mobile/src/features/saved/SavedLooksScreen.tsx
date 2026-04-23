import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        subtitle="Saved outfits carry live offer context and related follow-up actions so you can move from memory to commerce."
      >
        <View style={styles.topRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerLabel}>Collection state</Text>
            <Text style={styles.headerText}>Use this as a memory layer between recommendations, try-on, and shop comparison.</Text>
          </View>
          <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [styles.profileChip, pressed && styles.pressed]}>
            <Feather name="user" size={14} color="#182033" />
            <Text style={styles.profileChipText}>Profile</Text>
          </Pressable>
        </View>

        <View style={styles.heroRow}>
          <Pill label={`${looks.length} looks total`} tone="success" />
          <Pill label={`${looks.filter((look) => look.isWishlist).length} wishlist`} tone="neutral" />
        </View>
        <SegmentedControl options={["Saved", "Wishlist"]} selected={scope} onSelect={setScope} />
        <SegmentedControl options={["Grid", "List"]} selected={view} onSelect={setView} />
      </SectionCard>

      <SectionCard eyebrow="Collection" title={view === "Grid" ? "Grid view" : "List view"} subtitle="Each card keeps comparison and discovery CTAs visible so the next step is obvious.">
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
                <View style={styles.artBoard}>
                  <View style={styles.artOrbLarge} />
                  <View style={styles.artOrbSmall} />
                  <Pill label={look.isWishlist ? "Wishlist" : "Saved look"} tone={look.isWishlist ? "warning" : "accent"} />
                </View>
                <View style={styles.lookMeta}>
                  <Text style={styles.lookTitle}>{look.name}</Text>
                  <View style={styles.pillRow}>
                    {(look.occasionTags ?? []).slice(0, 2).map((tag) => (
                      <Pill key={tag} label={tag} tone="info" />
                    ))}
                    <Pill label={`${look.items?.length ?? 0} items`} tone="neutral" />
                  </View>
                </View>
                <Text style={styles.lookNote}>{look.note ?? "No note yet. Revisit after your next try-on."}</Text>
                <View style={styles.pillRow}>
                  {look.offerSummary?.lowestPrice != null ? <Pill label={`From $${Math.round(look.offerSummary.lowestPrice)}`} tone="warning" /> : null}
                  <Pill label={look.offerSummary?.availabilityLabel ?? "No live offers"} tone="success" />
                </View>
                {(look.recommendedProducts?.length ?? 0) > 0 ? (
                  <Text style={styles.lookNote}>
                    Complete the look with {look.recommendedProducts?.slice(0, 2).map((product) => product.name).join(" or ")}.
                  </Text>
                ) : (
                  <Text style={styles.lookNote}>This look is ready to compare across shops from the current saved items.</Text>
                )}
                <View style={styles.lookActions}>
                  <PrimaryButton size="sm" onPress={() => router.push("/shops")}>
                    Compare offers
                  </PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" onPress={() => router.push("/recommendations")}>
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerCopy: {
    flex: 1,
    gap: 4
  },
  headerLabel: {
    color: "#846746",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  headerText: {
    color: "#647183",
    fontSize: 14,
    lineHeight: 21
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#efe3cf",
    borderWidth: 1,
    borderColor: "#dcc8ab"
  },
  profileChipText: {
    color: "#182033",
    fontSize: 13,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.92
  },
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
    borderRadius: 24,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: "#e5d7c0",
    padding: 12,
    gap: 12
  },
  listCard: {
    borderRadius: 24,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: "#e5d7c0",
    padding: 14,
    gap: 12
  },
  artBoard: {
    height: 118,
    borderRadius: 20,
    backgroundColor: "#efe3cf",
    overflow: "hidden",
    padding: 12,
    justifyContent: "space-between"
  },
  artOrbLarge: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: "#d7c1a4"
  },
  artOrbSmall: {
    position: "absolute",
    left: 10,
    bottom: -18,
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: "#d8e1dd"
  },
  lookMeta: {
    gap: 8
  },
  lookTitle: {
    color: "#182033",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
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
