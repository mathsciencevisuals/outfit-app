import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

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
        <ErrorState
          title="Shops"
          message="Retail partner data could not be loaded."
          actionLabel="Back to recommendations"
          onRetry={() => router.push("/recommendations")}
        />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No shop-ready products yet"
          message="Recommendations need profile, fit, and pricing signals before shop comparison can be useful."
          actionLabel="See recommendations"
          onAction={() => router.push("/recommendations")}
        />
      </Screen>
    );
  }

  const comparison = data;

  return (
    <Screen>
      <SectionCard
        eyebrow="Retail Comparison"
        title="Buy options across connected partners"
        subtitle="Compare shop price, stock, and the size most likely to work before leaving the app."
      >
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
        <ErrorState
          title="Offer comparison"
          message="Offer comparison is unavailable for the selected item."
          actionLabel="Back to recommendations"
          onRetry={() => router.push("/recommendations")}
        />
      ) : (
        <>
          <SectionCard eyebrow="Offer Detail" title={comparison.productName ?? "Selected item"}>
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
            <SectionCard eyebrow="Best Offer" title={`${comparison.bestOffer.shop?.name ?? "Retailer"} leads`}>
              <View style={styles.row}>
                <Pill label={`$${Math.round(comparison.bestOffer?.price ?? 0)}`} tone="warning" />
                <Pill label={(comparison.bestOffer?.stock ?? 0) > 0 ? "In stock" : "Sold out"} tone={(comparison.bestOffer?.stock ?? 0) > 0 ? "success" : "danger"} />
                <Pill label={comparison.bestOffer?.variant?.sizeLabel ?? comparison.recommendedSize ?? "One size"} tone="info" />
              </View>
              <Text style={styles.offerText}>This is the cleanest handoff right now based on visible price and availability.</Text>
              <PrimaryButton onPress={() => comparison.bestOffer?.externalUrl && Linking.openURL(comparison.bestOffer.externalUrl)}>
                Buy now
              </PrimaryButton>
            </SectionCard>
          ) : null}

          <SectionCard eyebrow="Partner Cards" title="Shop comparison">
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
                    <Feather name="tag" size={16} color="#172033" />
                    <Text style={styles.offerLabel}>${Math.round(offer.price)}</Text>
                  </View>
                  <View style={styles.offerMetric}>
                    <Feather name="box" size={16} color="#172033" />
                    <Text style={styles.offerLabel}>{offer.stock} units</Text>
                  </View>
                  <View style={styles.offerMetric}>
                    <Feather name="shopping-bag" size={16} color="#172033" />
                    <Text style={styles.offerLabel}>{offer.variant?.sizeLabel ?? comparison.recommendedSize ?? "One size"}</Text>
                  </View>
                </View>
                <Text style={styles.offerText}>Outbound handoff is ready through the retailer link for this specific offer.</Text>
                <PrimaryButton onPress={() => Linking.openURL(offer.externalUrl)}>Visit Shop</PrimaryButton>
              </View>
            ))}
            {comparison.cheaperAlternative ? (
              <View style={styles.altCard}>
                <Text style={styles.altTitle}>Cheaper alternative</Text>
                <Text style={styles.altText}>
                  {comparison.cheaperAlternative.name} from ${Math.round(comparison.cheaperAlternative.offerSummary?.lowestPrice ?? 0)}
                </Text>
                <PrimaryButton onPress={() => router.push("/discover")} variant="secondary">
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
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  shopCard: {
    borderRadius: 22,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
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
    color: "#172033",
    fontSize: 18,
    fontWeight: "700"
  },
  shopSubtitle: {
    color: "#667085",
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
    borderRadius: 999,
    backgroundColor: "#efe5d7"
  },
  offerLabel: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "600"
  },
  offerText: {
    color: "#5f697d",
    fontSize: 14,
    lineHeight: 21
  },
  altCard: {
    borderRadius: 22,
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "#d4dfec",
    padding: 14,
    gap: 10
  },
  altTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700"
  },
  altText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20
  }
});
