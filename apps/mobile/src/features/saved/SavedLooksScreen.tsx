import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { Product, SavedLook } from "../../types/api";

function formatPrice(value?: number | null) {
  return value != null ? `$${Math.round(value)}` : "--";
}

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [scope, setScope] = useState("Wardrobe");
  const { data, loading, error } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);
  const looks = data ?? [];

  const wardrobe = useMemo(() => looks.filter((look) => !look.isWishlist), [looks]);
  const likedLooks = useMemo(() => looks.filter((look) => Boolean(look.isWishlist)), [looks]);

  const likedItems = useMemo(() => {
    const collection = new Map<string, Product>();
    likedLooks.forEach((look) => {
      (look.items ?? []).forEach((item) => {
        if (item.product?.id) {
          collection.set(item.product.id, item.product);
        }
      });
      (look.recommendedProducts ?? []).forEach((product) => collection.set(product.id, product));
    });
    return Array.from(collection.values());
  }, [likedLooks]);

  const activeLooks = scope === "Liked" ? likedLooks : wardrobe;

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Saved" subtitle="Loading your wardrobe and wishlist memory." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Saved" message="Saved looks could not be loaded." actionLabel="Shops" onRetry={() => router.push("/retail")} />
      </Screen>
    );
  }

  if (looks.length === 0) {
    return (
      <Screen>
        <EmptyState title="No looks saved yet" message="Save outfits after try-on or shopping to build your wardrobe memory." actionLabel="Try-On" onAction={() => router.push("/try-on")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Saved"
        title="Wardrobe"
        subtitle="Saved fits, liked garments, and shopping intent all stay in one wardrobe surface."
      >
        <View style={styles.metrics}>
          <MetricTile label="Saved fits" value={`${wardrobe.length}`} caption="Wardrobe entries" />
          <MetricTile label="Liked looks" value={`${likedLooks.length}`} caption="Wishlist collections" />
          <MetricTile label="Liked items" value={`${likedItems.length}`} caption="Product-level intent" />
        </View>

        <SegmentedControl options={["Wardrobe", "Liked"]} selected={scope} onSelect={setScope} />

        <View style={styles.grid}>
          {activeLooks.map((look: SavedLook, index) => (
            <Pressable key={look.id} onPress={() => router.push("/retail")} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={[styles.thumb, index % 2 === 1 && styles.thumbAlt]}>
                <Pill label={look.isWishlist ? "Liked" : "Saved"} tone={look.isWishlist ? "warning" : "success"} />
              </View>
              <View style={styles.meta}>
                <Text style={styles.title}>{look.name}</Text>
                <Text style={styles.detail}>{look.note ?? (look.isWishlist ? "Liked garment" : "Saved look")}</Text>
                <View style={styles.row}>
                  <Pill label={`${look.items?.length ?? 0} items`} tone="accent" />
                  <Pill label={formatPrice(look.offerSummary?.lowestPrice)} tone="warning" />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {activeLooks.length === 0 ? (
          <EmptyState title={scope === "Liked" ? "No liked looks yet" : "No saved outfits yet"} message="Save a try-on result or product collection to populate this wardrobe view." actionLabel="Feed" onAction={() => router.push("/feed")} />
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Products" title="Liked garments" subtitle="Wishlist-backed products remain accessible even when you save them through different flows.">
        {likedItems.length > 0 ? (
          likedItems.slice(0, 6).map((product) => (
            <View key={product.id} style={styles.productRow}>
              <View>
                <Text style={styles.productTitle}>{product.name}</Text>
                <Text style={styles.productSubtitle}>
                  {[product.brand?.name, product.category, product.baseColor].filter(Boolean).join(" • ") || "Saved product"}
                </Text>
              </View>
              <View style={styles.productActions}>
                <Pill label={formatPrice(product.offerSummary?.lowestPrice)} tone="warning" />
                <PrimaryButton onPress={() => router.push("/retail")} variant="secondary" fullWidth={false}>
                  Shop
                </PrimaryButton>
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No liked garments yet" message="Use the shopping screen to save product picks into your wishlist." actionLabel="Shop now" onAction={() => router.push("/retail")} />
        )}

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={() => router.push("/try-on")}>Try another look</PrimaryButton>
          <PrimaryButton onPress={() => router.push("/retail")} variant="secondary">
            Compare offers
          </PrimaryButton>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  card: {
    width: "48%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong
  },
  thumb: {
    height: 108,
    padding: 10,
    backgroundColor: "#eadfd6"
  },
  thumbAlt: {
    backgroundColor: "#d9e2ff"
  },
  meta: {
    padding: 10,
    gap: 6
  },
  title: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  detail: {
    color: colors.inkSoft,
    fontSize: 11.5,
    lineHeight: 16
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  productRow: {
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10
  },
  productTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  productSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  productActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  pressed: {
    opacity: 0.9
  }
});
