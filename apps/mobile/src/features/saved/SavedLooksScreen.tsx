import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, fonts, radius } from "../../theme/design";
import type { Product, SavedLook } from "../../types/api";

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [view, setView] = useState("Looks");
  const [scope, setScope] = useState("Wardrobe");
  const { data, loading, error } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);
  const looks = data ?? [];

  const filtered = useMemo(
    () => looks.filter((look) => (scope === "Liked" ? Boolean(look.isWishlist) : !look.isWishlist)),
    [looks, scope]
  );

  const likedItems = useMemo(() => {
    const collection = new Map<string, Product>();

    looks
      .filter((look) => Boolean(look.isWishlist))
      .forEach((look) => {
        (look.items ?? []).forEach((item) => {
          if (item.product?.id) {
            collection.set(item.product.id, item.product);
          }
        });
        (look.recommendedProducts ?? []).forEach((product) => {
          collection.set(product.id, product);
        });
      });

    return Array.from(collection.values());
  }, [looks]);

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Saved" subtitle="Loading your wardrobe memory." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Saved" message="Saved looks could not be loaded." actionLabel="Back to shops" onRetry={() => router.push("/retail")} />
      </Screen>
    );
  }

  if (looks.length === 0) {
    return (
      <Screen>
        <EmptyState title="No looks saved yet" message="Save outfits after recommendations and try-on to build a reusable shortlist." actionLabel="Go to feed" onAction={() => router.push("/feed")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Saved"
        title="Wardrobe and liked pieces"
        subtitle="This tab now acts as your wardrobe layer, combining saved looks, wishlist intent, and quick routes back into shopping."
      >
        <View style={styles.topRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerLabel}>Collection state</Text>
            <Text style={styles.headerText}>Use this as the memory layer between recommendations, try-on, and shop comparison.</Text>
          </View>
          <Pressable onPress={() => router.push("/account")} style={({ pressed }) => [styles.profileChip, pressed && styles.pressed]}>
            <Feather name="user" size={14} color={colors.ink} />
            <Text style={styles.profileChipText}>Profile</Text>
          </Pressable>
        </View>

        <View style={styles.heroRow}>
          <Pill label={`${looks.length} looks total`} tone="success" />
          <Pill label={`${likedItems.length} liked items`} tone="neutral" />
        </View>
        <SegmentedControl options={["Wardrobe", "Liked"]} selected={scope} onSelect={setScope} />
        <SegmentedControl options={["Looks", "List"]} selected={view} onSelect={setView} />
      </SectionCard>

      <SectionCard eyebrow="Wardrobe" title={view === "Looks" ? "Saved looks" : "Saved list"} subtitle="Each saved look keeps commerce and discovery CTAs visible so the next step stays obvious.">
        {filtered.length === 0 ? (
          <EmptyState title={scope === "Liked" ? "No liked items yet" : "No saved outfits yet"} message="Save a try-on look or recommendation to populate this section." actionLabel="Go to recommendations" onAction={() => router.push("/recommendations")} />
        ) : (
          <View style={view === "Looks" ? styles.grid : styles.list}>
            {filtered.map((look: SavedLook) => (
              <View key={look.id} style={view === "Looks" ? styles.gridCard : styles.listCard}>
                <View style={styles.artBoard}>
                  <View style={styles.artOrbLarge} />
                  <View style={styles.artOrbSmall} />
                  <Pill label={look.isWishlist ? "Liked look" : "Saved look"} tone={look.isWishlist ? "warning" : "accent"} />
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
                  <PrimaryButton size="sm" onPress={() => router.push("/retail")}>
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

      <SectionCard
        eyebrow="Liked Items"
        title="Pieces you keep returning to"
        subtitle="Wishlist-backed products surface here so the wardrobe tab covers both whole looks and individual intent signals."
      >
        {likedItems.length === 0 ? (
          <EmptyState title="No liked products yet" message="Wishlist looks and saved intent will surface individual products here." actionLabel="Browse feed" onAction={() => router.push("/feed")} />
        ) : (
          <View style={styles.list}>
            {likedItems.slice(0, 6).map((product) => (
              <View key={product.id} style={styles.likedCard}>
                <View style={styles.lookMeta}>
                  <Text style={styles.lookTitle}>{product.name}</Text>
                  <Text style={styles.lookNote}>
                    {[product.brand?.name, product.category, product.baseColor].filter(Boolean).join(" • ") || "Liked product"}
                  </Text>
                </View>
                <View style={styles.pillRow}>
                  {product.offerSummary?.lowestPrice != null ? <Pill label={`From $${Math.round(product.offerSummary.lowestPrice)}`} tone="warning" /> : null}
                  <Pill label={product.offerSummary?.availabilityLabel ?? "Ready for review"} tone="success" />
                </View>
                <View style={styles.lookActions}>
                  <PrimaryButton size="sm" onPress={() => router.push("/try-on")}>
                    Try on
                  </PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" onPress={() => router.push("/retail")}>
                    Shop
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
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  headerText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.pageStrong,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  profileChipText: {
    color: colors.ink,
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
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 12
  },
  listCard: {
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 12
  },
  likedCard: {
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 12
  },
  artBoard: {
    height: 118,
    borderRadius: 20,
    backgroundColor: colors.pageStrong,
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
    borderRadius: radius.pill,
    backgroundColor: "#d7c1a4"
  },
  artOrbSmall: {
    position: "absolute",
    left: 10,
    bottom: -18,
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: "#d8e1dd"
  },
  lookMeta: {
    gap: 8
  },
  lookTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.display
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  lookNote: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20
  },
  lookActions: {
    gap: 8
  }
});
