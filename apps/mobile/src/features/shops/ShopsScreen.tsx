import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
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
import { colors, fonts, radius } from "../../theme/design";
import type { Recommendation } from "../../types/api";

export function ShopsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data: recommendations, loading: recommendationLoading, error: recommendationError } = useAsyncResource(
    () => mobileApi.recommendations(userId),
    [userId]
  );
  const items = recommendations ?? [];
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProductId && items[0]?.productId) {
      setSelectedProductId(items[0].productId);
    }
  }, [items, selectedProductId]);

  const { data, loading, error } = useAsyncResource(
    () => (selectedProductId ? mobileApi.shopComparison({ productId: selectedProductId }) : Promise.resolve(null)),
    [selectedProductId]
  );

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
        <ErrorState title="Shops" message="Retail partner data could not be loaded." actionLabel="Back to recommendations" onRetry={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState title="No shop-ready products yet" message="Recommendations need profile, fit, and pricing signals before shop comparison can be useful." actionLabel="See recommendations" onAction={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  const comparison = data;

  return (
    <Screen>
      <SectionCard
        eyebrow="Shops"
        title="Retail comparison built for handoff"
        subtitle="Compare best price, stock, and recommended size before you leave the app for the retailer."
      >
        <View style={styles.topRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerLabel}>Retail handoff</Text>
            <Text style={styles.headerText}>Keep selection, fit context, and price clarity visible before sending users off-platform.</Text>
          </View>
          <Pressable onPress={() => router.push("/recommendations")} style={({ pressed }) => [styles.profileChip, pressed && styles.pressed]}>
            <Feather name="star" size={14} color={colors.ink} />
            <Text style={styles.profileChipText}>Recommendations</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pill label={`${items.length} recommended products`} tone="accent" />
          {comparison?.recommendedSize ? <Pill label={`Recommended ${comparison.recommendedSize}`} tone="success" /> : null}
          {(comparison?.badges ?? []).slice(0, 2).map((badge) => (
            <Pill key={badge} label={badge} tone={badge.includes("Price") ? "warning" : "info"} />
          ))}
        </View>
        <SegmentedControl
          options={items.slice(0, 4).map((item: Recommendation) => item.product?.name ?? item.productId)}
          selected={items.find((item) => item.productId === selectedProductId)?.product?.name ?? items[0]?.product?.name ?? ""}
          onSelect={(label) => setSelectedProductId(items.find((item) => (item.product?.name ?? item.productId) === label)?.productId ?? null)}
        />
      </SectionCard>

      {loading ? (
        <LoadingState title="Offers" subtitle="Comparing connected shops for the selected item." />
      ) : error || !comparison || !comparison.productId ? (
        <ErrorState title="Offer comparison" message="Offer comparison is unavailable for the selected item." actionLabel="Back to recommendations" onRetry={() => router.push("/recommendations")} />
      ) : (
        <>
          <SectionCard eyebrow="Offer Detail" title={comparison.productName ?? "Selected item"} subtitle="The top metrics stay up front so users can compare retailers quickly.">
            <View style={styles.metricRow}>
              <MetricTile label="Lowest" value={comparison.lowestPrice != null ? `$${Math.round(comparison.lowestPrice)}` : "--"} caption="Best visible price" />
              <MetricTile label="Highest" value={comparison.highestPrice != null ? `$${Math.round(comparison.highestPrice)}` : "--"} caption="Top offer in range" />
            </View>
            <View style={styles.metricRow}>
              <MetricTile label="Offers" value={`${comparison.offers.length}`} caption="Available buy paths" />
              <MetricTile label="Fit" value={comparison.fitLabel ?? "regular"} caption={comparison.recommendedSize ? `Size ${comparison.recommendedSize}` : "Size guidance unavailable"} />
            </View>
          </SectionCard>

          {comparison.bestOffer ? (
            <SectionCard eyebrow="Best Offer" title={`${comparison.bestOffer.shop?.name ?? "Retailer"} leads`} subtitle="This CTA is the clearest outbound path based on visible price and availability.">
              <View style={styles.row}>
                <Pill label={`$${Math.round(comparison.bestOffer.price ?? 0)}`} tone="warning" />
                <Pill label={(comparison.bestOffer.stock ?? 0) > 0 ? "In stock" : "Sold out"} tone={(comparison.bestOffer.stock ?? 0) > 0 ? "success" : "danger"} />
                <Pill label={comparison.bestOffer.variant?.sizeLabel ?? comparison.recommendedSize ?? "One size"} tone="info" />
              </View>
              <Text style={styles.offerText}>This is the cleanest handoff right now based on visible price and availability.</Text>
              <View style={styles.ctaRow}>
                <PrimaryButton onPress={() => comparison.bestOffer?.externalUrl && Linking.openURL(comparison.bestOffer.externalUrl)}>
                  Buy now
                </PrimaryButton>
                <PrimaryButton onPress={() => router.push("/try-on")} variant="secondary">
                  Try on again
                </PrimaryButton>
              </View>
            </SectionCard>
          ) : null}

          <SectionCard eyebrow="Partner Cards" title="Shop comparison" subtitle="Keep retailer cards consistent so price, stock, and CTA hierarchy scan quickly.">
            {comparison.offers.map((offer) => (
              <View key={offer.id} style={styles.shopCard}>
                <View style={styles.shopHeader}>
                  <View style={styles.shopMeta}>
                    <Text style={styles.shopTitle}>{offer.shop?.name ?? "Retailer"}</Text>
                    <Text style={styles.shopSubtitle}>{offer.shop?.region ?? "Online"} region</Text>
                  </View>
                  <Pill label={offer.stock > 0 ? "In stock" : "Sold out"} tone={offer.stock > 0 ? "success" : "danger"} />
                </View>
                <View style={styles.offerStrip}>
                  <View style={styles.offerMetric}>
                    <Feather name="tag" size={16} color={colors.ink} />
                    <Text style={styles.offerLabel}>${Math.round(offer.price)}</Text>
                  </View>
                  <View style={styles.offerMetric}>
                    <Feather name="box" size={16} color={colors.ink} />
                    <Text style={styles.offerLabel}>{offer.stock} units</Text>
                  </View>
                  <View style={styles.offerMetric}>
                    <Feather name="shopping-bag" size={16} color={colors.ink} />
                    <Text style={styles.offerLabel}>{offer.variant?.sizeLabel ?? comparison.recommendedSize ?? "One size"}</Text>
                  </View>
                </View>
                <Text style={styles.offerText}>Outbound handoff is ready through the retailer link for this specific offer.</Text>
                <PrimaryButton onPress={() => Linking.openURL(offer.externalUrl)}>Visit shop</PrimaryButton>
              </View>
            ))}
            {comparison.cheaperAlternative ? (
              <View style={styles.altCard}>
                <Text style={styles.altTitle}>Cheaper alternative</Text>
                <Text style={styles.altText}>
                  {comparison.cheaperAlternative.name} from ${Math.round(comparison.cheaperAlternative.offerSummary?.lowestPrice ?? 0)}
                </Text>
                <PrimaryButton onPress={() => router.push("/feed")} variant="secondary">
                  View alternative
                </PrimaryButton>
              </View>
            ) : null}
          </SectionCard>
        </>
      )}
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
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  ctaRow: {
    gap: 10
  },
  shopCard: {
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 12
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  shopMeta: {
    flex: 1,
    gap: 4
  },
  shopTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.display
  },
  shopSubtitle: {
    color: colors.inkSoft,
    fontSize: 14
  },
  offerStrip: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  offerMetric: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.pageStrong
  },
  offerLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  offerText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  altCard: {
    borderRadius: radius.lg,
    backgroundColor: "#f8f2ea",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10
  },
  altTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.display
  },
  altText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  }
});
