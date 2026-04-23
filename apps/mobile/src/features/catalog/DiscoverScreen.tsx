import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

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
import { colors } from "../../theme/design";
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
        <LoadingState title="Feed" subtitle="Blending catalog, fit context, and style direction." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Feed" message="The product feed is unavailable right now." actionLabel="View profile" onRetry={() => router.push("/account")} />
      </Screen>
    );
  }

  if (products.length === 0) {
    return (
      <Screen>
        <EmptyState title="No products available" message="The catalog endpoint returned no product cards to surface." actionLabel="See recommendations" onAction={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  const featured = detail ?? filtered[0] ?? products[0];

  return (
    <Screen>
      <SectionCard
        eyebrow="Feed"
        title="For you"
        subtitle="Swipe through mood-led looks and jump into try-on instantly."
      >
        <View style={styles.feedScreen}>
          <View style={styles.feedOverlay} />
          <View style={styles.feedCopy}>
            <View style={styles.heroRow}>
              <Pill label={featured?.styleTags?.[0] ?? "Cyber core"} tone="neutral" />
              {featured?.offerSummary?.lowestPrice != null ? <Pill label={`$${Math.round(featured.offerSummary.lowestPrice)}`} tone="accent" /> : null}
            </View>
            <Text style={styles.feedTitle}>{featured?.name ?? "Mesh-layer street look"}</Text>
            <Text style={styles.feedText}>
              {featured?.description ?? "Low-rise denim, cropped bomber, chrome accessories. Swipe up for the next fit or tap Try On."}
            </Text>
          </View>
          <View style={styles.feedActions}>
            <View style={styles.feedFab}><Text style={styles.feedFabText}>♡</Text></View>
            <View style={styles.feedFab}><Text style={styles.feedFabText}>↗</Text></View>
            <PrimaryButton onPress={() => router.push("/try-on")} size="sm" fullWidth={false}>
              Try On
            </PrimaryButton>
          </View>
        </View>
        <SegmentedControl options={occasions} selected={occasion} onSelect={(value) => setOccasion(value as Occasion)} />
      </SectionCard>

      {featured ? (
        <SectionCard
          eyebrow="Spotlight"
          title={featured.name}
          subtitle={detailLoading ? "Refreshing feed spotlight..." : "The hero keeps fit preview, price range, and shopping next steps visible."}
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
            <MetricTile
              label="Best price"
              value={featured.offerSummary?.lowestPrice != null ? `$${Math.round(featured.offerSummary.lowestPrice)}` : "--"}
              caption={featured.offerSummary?.availabilityLabel ?? "No live offers"}
            />
            <MetricTile label="Offers" value={`${featured.offerSummary?.offerCount ?? 0}`} caption="Retail comparison ready" />
          </View>
          {featured.fitPreview ? (
            <View style={styles.heroRow}>
              <Pill label={`Size ${featured.fitPreview.recommendedSize ?? "--"}`} tone="success" />
              <Pill label={`${featured.fitPreview.fitLabel} fit`} tone="neutral" />
              <Pill label={`${Math.round(featured.fitPreview.confidenceScore * 100)}% confidence`} tone="info" />
            </View>
          ) : null}
          <PrimaryButton onPress={() => router.push("/retail")} variant="secondary">
            Compare offers
          </PrimaryButton>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Feed Stack" title="Curated for your profile">
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
            onSecondaryPress={() => router.push("/try-on")}
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
  feedScreen: {
    position: "relative",
    minHeight: 420,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#101522",
    justifyContent: "flex-end",
    padding: 14
  },
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#251738",
    opacity: 0.94
  },
  feedCopy: {
    zIndex: 1,
    marginRight: 64,
    gap: 8
  },
  feedTitle: {
    color: "#ffffff",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.4
  },
  feedText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 19
  },
  feedActions: {
    position: "absolute",
    right: 12,
    bottom: 18,
    zIndex: 1,
    gap: 10,
    alignItems: "center"
  },
  feedFab: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  feedFabText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  supportText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  }
});
