import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { ProductCard, productSubtitle } from "../../components/ProductCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import type { Product } from "../../types/api";

export function DiscoverScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);
  const products = data ? data.slice(0, 5) : [];

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Discover" subtitle="Blending catalog, fit context, and style direction." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="Discover"
          message="The product feed is unavailable right now."
          actionLabel="View profile"
          onRetry={() => router.push("/profile")}
        />
      </Screen>
    );
  }

  if (products.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No products available"
          message="The catalog endpoint returned no product cards to surface."
          actionLabel="See recommendations"
          onAction={() => router.push("/recommendations")}
        />
      </Screen>
    );
  }

  const featured = products[0];

  return (
    <Screen>
      <SectionCard
        eyebrow="Discover"
        title="Fit-aware picks for your next look"
        subtitle="The catalog is already connected to sizing, style, and try-on flows, so you can move straight from browsing to confidence."
      >
        <View style={styles.heroRow}>
          <Pill label="Live catalog" tone="accent" />
          <Pill label={`${products.length} featured pieces`} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Featured brand" value={featured.brand?.name ?? "FitMe"} />
          <MetricTile label="Category" value={featured.category} />
        </View>
        <PrimaryButton onPress={() => router.push("/tryon-upload")}>Start try-on</PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Featured Feed" title="Curated right now">
        {products.map((product: Product, index) => (
          <ProductCard
            key={product.id}
            title={product.name}
            subtitle={productSubtitle(product)}
            badge={index === 0 ? "Hero piece" : `Look ${index + 1}`}
            highlight={product.description ?? "Ready for fit-aware discovery and retail comparison."}
            primaryLabel="Try this look"
            onPrimaryPress={() => router.push("/tryon-upload")}
            secondaryLabel="See recommendations"
            onSecondaryPress={() => router.push("/recommendations")}
          />
        ))}
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
  metricRow: {
    flexDirection: "row",
    gap: 10
  }
});
