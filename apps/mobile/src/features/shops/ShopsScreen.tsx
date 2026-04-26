import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { Recommendation } from "../../types/api";
import { Screen } from "../../components/Screen";
import { demoData } from "../../demo/demo-data";

function formatPrice(value?: number | null) {
  return value != null ? `Rs. ${Math.round(value)}` : "Price pending";
}

export function ShopsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { data: recommendations, loading: recommendationLoading, error: recommendationError } = useAsyncResource(
    () => mobileApi.recommendations(userId),
    [userId]
  );

  const items = recommendations ?? [];

  useEffect(() => {
    if (!selectedProductId && items[0]?.productId) {
      setSelectedProductId(items[0].productId);
    }
  }, [items, selectedProductId]);

  const { data, loading, error } = useAsyncResource(
    () => (selectedProductId ? mobileApi.shopComparison({ productId: selectedProductId }) : Promise.resolve(null)),
    [selectedProductId]
  );

  const selectedRecommendation = items.find((item) => item.productId === selectedProductId) ?? items[0] ?? null;

  const saveProducts = async () => {
    if (!selectedRecommendation?.productId) {
      return;
    }

    const saved = await mobileApi.saveLook(userId, {
      name: `${selectedRecommendation.product?.name ?? "Selected"} wishlist`,
      note: "Saved from the shopping recommendations screen.",
      productIds: [selectedRecommendation.productId],
      isWishlist: true
    });
    setSaveMessage(`Saved ${saved.name}`);
  };

  if (recommendationLoading) {
    return (
      <Screen showProfileStrip={false}>
        <LoadingState title="Shops" subtitle="Preparing the current shopping shortlist." />
      </Screen>
    );
  }

  if (recommendationError) {
    return (
      <Screen showProfileStrip={false}>
        <ErrorState title="Shops" message="Retail partner data could not be loaded." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen showProfileStrip={false}>
        <EmptyState
          title="No shop-ready products yet"
          message="Recommendations need profile, fit, and pricing signals before shop comparison can be useful."
          actionLabel="Measurements"
          onAction={() => router.push("/measurements")}
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen showProfileStrip={false}>
        <LoadingState title="Shop comparison" subtitle="Comparing offers for the selected recommendation." />
      </Screen>
    );
  }

  if (error || !data || !data.productId) {
    return (
      <Screen showProfileStrip={false}>
        <ErrorState title="Offer comparison" message="Offer comparison is unavailable for the selected item." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  const heroImage =
    selectedRecommendation?.product?.imageUrl ??
    selectedRecommendation?.cheaperAlternative?.imageUrl ??
    demoData.products[0].imageUrl ??
    null;

  return (
    <Screen showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          {heroImage ? <Image source={{ uri: heroImage }} style={styles.heroImage} /> : null}
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>Shop</Text>
            <Text style={styles.heroTitle}>Complete the look</Text>
            <Text style={styles.heroBody}>
              {selectedRecommendation?.explanation ??
                "Products are ranked by fit, vibe, budget, availability, and similarity to the generated result."}
            </Text>
            <View style={styles.chipRow}>
              <MetaChip label={selectedRecommendation?.rankingBadges?.[0] ?? "Best vibe"} tone="success" />
              <MetaChip label={formatPrice(data.lowestPrice)} tone="warning" />
              <MetaChip label={`${data.offers.length} offers`} tone="accent" />
            </View>
          </View>
        </View>

        <View style={styles.selectorRow}>
          {items.slice(0, 4).map((item: Recommendation) => {
            const selected = item.productId === selectedProductId;
            return (
              <Pressable key={item.productId} onPress={() => setSelectedProductId(item.productId)} style={({ pressed }) => [styles.selectorChip, selected && styles.selectorChipActive, pressed && styles.pressed]}>
                <Text style={[styles.selectorChipText, selected && styles.selectorChipTextActive]} numberOfLines={1}>
                  {item.product?.name ?? item.productId}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Scene-matched picks</Text>
          <Text style={styles.sectionSubtitle}>Product cards stay fit-aware and screenshot-friendly with visible imagery and retailer context.</Text>

          {data.offers.map((offer, index) => {
            const productImage =
              offer.variant?.imageUrl ??
              offer.variant?.product?.imageUrl ??
              selectedRecommendation?.product?.imageUrl ??
              demoData.products[index % demoData.products.length]?.imageUrl ??
              null;

            return (
              <View key={offer.id} style={styles.productCard}>
                <View style={styles.productThumb}>
                  {productImage ? <Image source={{ uri: productImage }} style={styles.productImage} /> : null}
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productTitle}>{offer.variant?.product?.name ?? data.productName ?? "Selected product"}</Text>
                  <Text style={styles.productBody}>
                    {offer.shop?.name ?? "Retailer"} · {offer.variant?.sizeLabel ?? data.recommendedSize ?? "One size"} · {offer.shop?.region ?? "IN"}
                  </Text>
                  <View style={styles.chipRow}>
                    <MetaChip label={formatPrice(offer.price)} tone="warning" />
                    <MetaChip label={selectedRecommendation?.rankingBadges?.[0] ?? "Fit pick"} tone="success" />
                    <MetaChip label={selectedRecommendation?.reasonTags?.[0] ?? "Vibe match"} tone="accent" />
                  </View>
                  <View style={styles.buttonRow}>
                    <ActionButton label="Open retailer" onPress={() => Linking.openURL(offer.externalUrl)} />
                    <ActionButton label="Save products" variant="secondary" onPress={() => void saveProducts()} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bundle suggestions</Text>
          <Text style={styles.sectionSubtitle}>Small add-ons that push the result closer to the selected scene and fit story.</Text>

          <View style={styles.bundleCard}>
            <Text style={styles.bundleTitle}>Primary bundle suggestion</Text>
            <Text style={styles.bundleBody}>
              {selectedRecommendation?.reasonTags?.length
                ? `Push the look further with ${selectedRecommendation.reasonTags.slice(0, 2).join(" and ")} signals from your saved style profile.`
                : "Add accessories or complementary pieces that reinforce the generated scene aesthetic."}
            </Text>
          </View>

          {data.cheaperAlternative ? (
            <View style={styles.bundleCard}>
              <Text style={styles.bundleTitle}>Cheaper alternative</Text>
              <Text style={styles.bundleBody}>
                {data.cheaperAlternative.name} at {formatPrice(data.cheaperAlternative.offerSummary?.lowestPrice)} keeps the silhouette while lowering spend.
              </Text>
            </View>
          ) : null}

          {data.bestFitAlternative ? (
            <View style={styles.bundleCard}>
              <Text style={styles.bundleTitle}>Best fit alternative</Text>
              <Text style={styles.bundleBody}>
                {data.bestFitAlternative.product.name} is marked as a {data.bestFitAlternative.fit ?? "strong"} fit alternative for this styling direction.
              </Text>
            </View>
          ) : null}
        </View>

        {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}
      </View>
    </Screen>
  );
}

function MetaChip({
  label,
  tone
}: {
  label: string;
  tone: "accent" | "success" | "warning";
}) {
  return (
    <View
      style={[
        styles.metaChip,
        tone === "accent" && styles.metaChipAccent,
        tone === "success" && styles.metaChipSuccess,
        tone === "warning" && styles.metaChipWarning
      ]}
    >
      <Text
        style={[
          styles.metaChipText,
          tone === "accent" && styles.metaChipTextAccent,
          tone === "success" && styles.metaChipTextSuccess,
          tone === "warning" && styles.metaChipTextWarning
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary" ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.actionButtonText, variant === "secondary" && styles.actionButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  heroCard: {
    minHeight: 240,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.heroEnd,
    ...shadow
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,22,37,0.44)"
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 10,
    padding: 18
  },
  eyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 28,
    fontWeight: "800"
  },
  heroBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectorChip: {
    maxWidth: "48%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  selectorChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  selectorChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  selectorChipTextActive: {
    color: colors.inkOnDark
  },
  sectionCard: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  sectionSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  productCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  productThumb: {
    width: 92,
    height: 120,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.pageStrong
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  productCopy: {
    flex: 1,
    gap: 8
  },
  productTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  productBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  actionButtonSecondary: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.lineStrong
  },
  actionButtonText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  actionButtonTextSecondary: {
    color: colors.ink
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill
  },
  metaChipAccent: {
    backgroundColor: colors.accentSoft
  },
  metaChipSuccess: {
    backgroundColor: colors.successSoft
  },
  metaChipWarning: {
    backgroundColor: colors.warningSoft
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "800"
  },
  metaChipTextAccent: {
    color: colors.accentStrong
  },
  metaChipTextSuccess: {
    color: colors.success
  },
  metaChipTextWarning: {
    color: colors.warning
  },
  bundleCard: {
    gap: 6,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  bundleTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  bundleBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  saveMessage: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
