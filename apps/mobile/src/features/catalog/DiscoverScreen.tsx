import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { ProductCard, productSubtitle } from "../../components/ProductCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import type { Occasion, Product } from "../../types/api";

const occasions: Occasion[] = ["casual", "streetwear", "formal", "college", "interview", "date", "fest"];

export function DiscoverScreen() {
  const router = useRouter();
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);
  const products = data ?? [];
  const filtered = useMemo(
    () => products.filter((product) => !product.occasionTags?.length || product.occasionTags.includes(occasion)),
    [occasion, products]
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProductId && filtered[0]?.id) {
      setSelectedProductId(filtered[0].id);
    }
  }, [filtered, selectedProductId]);

  const { data: detail, loading: detailLoading } = useAsyncResource(
    () => (selectedProductId ? mobileApi.productDetail(selectedProductId) : Promise.resolve(null)),
    [selectedProductId]
  );

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

  const featured = detail ?? filtered[0] ?? products[0];

  return (
    <Screen>
      <SectionCard
        eyebrow="Discover"
        title="Fit-aware picks for your next look"
        subtitle="Browse products with fit, occasion, and commerce context before you commit to try-on or retailer handoff."
      >
        <View style={styles.heroRow}>
          <Pill label="Live catalog" tone="accent" />
          <Pill label={`${filtered.length} matching pieces`} tone="neutral" />
          {featured?.offerSummary?.lowestPrice != null ? <Pill label={`From $${Math.round(featured.offerSummary.lowestPrice)}`} tone="warning" /> : null}
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Featured brand" value={featured?.brand?.name ?? "FitMe"} />
          <MetricTile label="Category" value={featured?.category ?? "Catalog"} />
        </View>
        <SegmentedControl options={occasions} selected={occasion} onSelect={(value) => setOccasion(value as Occasion)} />
        <PrimaryButton onPress={() => router.push("/tryon-upload")}>Start try-on</PrimaryButton>
      </SectionCard>

      {featured ? (
        <SectionCard
          eyebrow="Product Detail"
          title={featured.name}
          subtitle={detailLoading ? "Refreshing detail context..." : "Product detail now includes fit preview, cheaper alternatives, and complete-the-look hooks."}
        >
          <View style={styles.heroRow}>
            {(featured.occasionTags ?? []).slice(0, 3).map((tag) => (
              <Pill key={tag} label={tag} tone="info" />
            ))}
            {(featured.offerSummary?.badges ?? []).slice(0, 2).map((tag) => (
              <Pill key={tag} label={tag} tone="success" />
            ))}
          </View>
          <Text style={styles.supportText}>{featured.description ?? "Catalog detail with fit and commerce signals."}</Text>
          <View style={styles.metricRow}>
            <MetricTile label="Best price" value={featured.offerSummary?.lowestPrice != null ? `$${Math.round(featured.offerSummary.lowestPrice)}` : "--"} caption={featured.offerSummary?.availabilityLabel ?? "No live offers"} />
            <MetricTile label="Offers" value={`${featured.offerSummary?.offerCount ?? 0}`} caption="Retail comparison ready" />
          </View>
          {featured.fitPreview ? (
            <View style={styles.heroRow}>
              <Pill label={`Size ${featured.fitPreview.recommendedSize ?? "--"}`} tone="success" />
              <Pill label={`${featured.fitPreview.fitLabel} fit`} tone="neutral" />
              <Pill label={`${Math.round(featured.fitPreview.confidenceScore * 100)}% confidence`} tone="info" />
            </View>
          ) : null}
          <PrimaryButton onPress={() => router.push("/shops")} variant="secondary">
            Compare offers
          </PrimaryButton>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Featured Feed" title="Curated right now">
        {filtered.map((product: Product, index) => (
          <ProductCard
            key={product.id}
            title={product.name}
            subtitle={productSubtitle(product)}
            badge={index === 0 ? "Hero piece" : `Look ${index + 1}`}
            highlight={product.description ?? "Ready for fit-aware discovery and retail comparison."}
            contextTags={product.occasionTags}
            rankingBadges={product.offerSummary?.badges}
            priceLabel={product.offerSummary?.lowestPrice != null ? `From $${Math.round(product.offerSummary.lowestPrice)}` : null}
            primaryLabel="View detail"
            onPrimaryPress={() => setSelectedProductId(product.id)}
            secondaryLabel="Try this look"
            onSecondaryPress={() => router.push("/tryon-upload")}
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
  },
  supportText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
