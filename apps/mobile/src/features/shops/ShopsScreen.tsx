import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
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
import { colors, radius } from "../../theme/design";
import type { Recommendation } from "../../types/api";

function formatPrice(value?: number | null) {
  return value != null ? `$${Math.round(value)}` : "--";
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
      <Screen>
        <LoadingState title="Shops" subtitle="Preparing the current shopping shortlist." />
      </Screen>
    );
  }

  if (recommendationError) {
    return (
      <Screen>
        <ErrorState title="Shops" message="Retail partner data could not be loaded." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState title="No shop-ready products yet" message="Recommendations need profile, fit, and pricing signals before shop comparison can be useful." actionLabel="Measurements" onAction={() => router.push("/measurements")} />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Shop comparison" subtitle="Comparing offers for the selected recommendation." />
      </Screen>
    );
  }

  if (error || !data || !data.productId) {
    return (
      <Screen>
        <ErrorState title="Offer comparison" message="Offer comparison is unavailable for the selected item." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Shop"
        title="Complete look"
        subtitle="Products are ranked by fit, vibe, budget, and live retailer availability from the current recommendation set."
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Scene-matched picks</Text>
          <Text style={styles.heroText}>
            {selectedRecommendation?.explanation ??
              "Products are ranked by fit, vibe, budget, availability, and similarity to the generated result."}
          </Text>
        </View>

        <View style={styles.row}>
          <Pill label={selectedRecommendation?.rankingBadges?.[0] ?? "Best vibe"} tone="success" />
          <Pill label={formatPrice(data.lowestPrice)} tone="warning" />
          <Pill label={`${data.offers.length} offers`} tone="accent" />
        </View>

        <SegmentedControl
          options={items.slice(0, 4).map((item: Recommendation) => item.product?.name ?? item.productId)}
          selected={selectedRecommendation?.product?.name ?? selectedRecommendation?.productId ?? ""}
          onSelect={(label) => setSelectedProductId(items.find((item) => (item.product?.name ?? item.productId) === label)?.productId ?? null)}
        />

        <View style={styles.productCard}>
          <View style={styles.productArt} />
          <View style={styles.productCopy}>
            <Text style={styles.productTitle}>{data.productName ?? selectedRecommendation?.product?.name ?? "Selected product"}</Text>
            <Text style={styles.productText}>
              {selectedRecommendation?.fitWarning ??
                "Strong match for the selected vibe with live retailer pricing and fit guidance."}
            </Text>
            <View style={styles.row}>
              <Pill label={selectedRecommendation?.rankingBadges?.[0] ?? "Best vibe"} tone="success" />
              <Pill label={formatPrice(data.lowestPrice)} tone="warning" />
              <Pill label={`${data.offers.length} offers`} tone="accent" />
            </View>
            <Text style={styles.priceLine}>
              {formatPrice(data.lowestPrice)} <Text style={styles.priceSub}>{data.offers.slice(0, 2).map((offer) => offer.shop?.name).filter(Boolean).join(" · ") || "Retailers"}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Bundle suggestion</Text>
          <Text style={styles.panelBody}>
            {selectedRecommendation?.reasonTags?.length
              ? `Push the look further with ${selectedRecommendation.reasonTags.slice(0, 2).join(" and ")} signals from your saved style profile.`
              : "Add accessories or complementary pieces that reinforce the generated scene aesthetic."}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recommendation logic</Text>
          <Text style={styles.panelBody}>
            Explain every suggestion using fit score, price range, style compatibility, size confidence, and retailer availability.
          </Text>
        </View>

        {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={() => data.bestOffer?.externalUrl && Linking.openURL(data.bestOffer.externalUrl)}>
            Open retailer
          </PrimaryButton>
          <PrimaryButton onPress={() => void saveProducts()} variant="secondary">
            Save products
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Offers" title="Retail comparison" subtitle="The offer list remains practical while keeping the visual hierarchy tighter and easier to scan.">
        {data.offers.map((offer) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View>
                <Text style={styles.offerTitle}>{offer.shop?.name ?? "Retailer"}</Text>
                <Text style={styles.offerSub}>{offer.shop?.region ?? "Online"} region</Text>
              </View>
              <Pill label={offer.stock > 0 ? "In stock" : "Sold out"} tone={offer.stock > 0 ? "success" : "danger"} />
            </View>
            <View style={styles.row}>
              <Pill label={formatPrice(offer.price)} tone="warning" />
              <Pill label={`${offer.stock} units`} tone="info" />
              <Pill label={offer.variant?.sizeLabel ?? data.recommendedSize ?? "One size"} tone="neutral" />
            </View>
            <PrimaryButton onPress={() => Linking.openURL(offer.externalUrl)} variant="secondary">
              Visit shop
            </PrimaryButton>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.accent,
    gap: 8
  },
  heroTitle: {
    color: colors.panelStrong,
    fontSize: 17,
    fontWeight: "800"
  },
  heroText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12.5,
    lineHeight: 18
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  productCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line
  },
  productArt: {
    width: 78,
    height: 100,
    borderRadius: 18,
    backgroundColor: "#d9e2ff",
    borderWidth: 1,
    borderColor: "#d6dcff"
  },
  productCopy: {
    flex: 1,
    gap: 8
  },
  productTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  productText: {
    color: colors.inkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  priceLine: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  priceSub: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "500"
  },
  panel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 14.5,
    fontWeight: "800"
  },
  panelBody: {
    color: colors.inkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  saveMessage: {
    color: colors.brand,
    fontSize: 12,
    lineHeight: 18
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  offerCard: {
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  offerTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  offerSub: {
    color: colors.inkSoft,
    fontSize: 12
  }
});
