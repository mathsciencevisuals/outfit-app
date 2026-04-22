import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import type { Shop } from "../../types/api";

function summarizePrice(shop: Shop) {
  const offers = shop.inventoryOffers ?? [];
  if (offers.length === 0) {
    return "No live pricing";
  }

  const lowest = offers.reduce((current, offer) => {
    const numericPrice = Number(offer.price);
    return numericPrice < current ? numericPrice : current;
  }, Number.MAX_SAFE_INTEGER);

  return `$${Math.round(lowest)}`;
}

export function ShopsScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsyncResource(() => mobileApi.shops(), []);
  const shops = data ?? [];

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Shops" subtitle="Comparing retail partners and inventory visibility." />
      </Screen>
    );
  }

  if (error) {
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

  if (shops.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No shops connected"
          message="Retail offers are not available yet."
          actionLabel="See saved looks"
          onAction={() => router.push("/saved-looks")}
        />
      </Screen>
    );
  }

  const totalOffers = shops.reduce((sum, shop) => sum + (shop.inventoryOffers?.length ?? 0), 0);

  return (
    <Screen>
      <SectionCard
        eyebrow="Retail Comparison"
        title="Buy options across connected partners"
        subtitle="Use this layer to translate your recommendation shortlist into actual availability, region context, and offer depth."
      >
        <View style={styles.row}>
          <Pill label={`${shops.length} shops`} tone="accent" />
          <Pill label={`${totalOffers} total offers`} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Regions" value={`${new Set(shops.map((shop) => shop.region)).size}`} caption="Coverage across partner markets" />
          <MetricTile label="Offers" value={`${totalOffers}`} caption="Visible inventory signals" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Partner Cards" title="Shop comparison">
        {shops.map((shop: Shop) => (
          <View key={shop.id} style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <View style={styles.shopMeta}>
                <Text style={styles.shopTitle}>{shop.name}</Text>
                <Text style={styles.shopSubtitle}>{shop.region} region</Text>
              </View>
              <Pill label={`${shop.inventoryOffers?.length ?? 0} offers`} tone="success" />
            </View>
            <View style={styles.offerStrip}>
              <View style={styles.offerMetric}>
                <Feather name="tag" size={16} color="#172033" />
                <Text style={styles.offerLabel}>From {summarizePrice(shop)}</Text>
              </View>
              <View style={styles.offerMetric}>
                <Feather name="map-pin" size={16} color="#172033" />
                <Text style={styles.offerLabel}>{shop.region}</Text>
              </View>
            </View>
            <Text style={styles.offerText}>
              Offers are already attached to product variants, making this the clean handoff from recommendation confidence into commerce visibility.
            </Text>
          </View>
        ))}
        <PrimaryButton onPress={() => router.push("/saved-looks")} variant="secondary">
          Go to saved looks
        </PrimaryButton>
      </SectionCard>
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
  }
});
