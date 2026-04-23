import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { colors, radius } from "../../theme/design";
import type { Occasion, Product } from "../../types/api";

const occasions: Occasion[] = ["casual", "streetwear", "formal", "college", "interview", "date", "fest"];

const quickActions = [
  { id: "try-on", title: "Try a fit", subtitle: "Camera or upload", icon: "camera", route: "/try-on" },
  { id: "saved", title: "Wardrobe", subtitle: "Saved looks", icon: "heart", route: "/saved" },
  { id: "shops", title: "Shop now", subtitle: "Best offers", icon: "shopping-bag", route: "/retail" }
] as const;

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
      <Screen tone="dark">
        <LoadingState title="Feed" subtitle="Blending catalog, fit context, and style direction." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark">
        <ErrorState title="Feed" message="The product feed is unavailable right now." actionLabel="View profile" onRetry={() => router.push("/account")} />
      </Screen>
    );
  }

  if (products.length === 0) {
    return (
      <Screen tone="dark">
        <EmptyState title="No products available" message="The catalog endpoint returned no product cards to surface." actionLabel="See recommendations" onAction={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  const featured = detail ?? filtered[0] ?? products[0];

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="Feed"
        title="Immersive fashion discovery"
        subtitle="Keep the premium tab shell and cleaner typography, but push the home screen into a darker, more editorial feed."
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowSecondary} />
          <View style={styles.heroHeader}>
            <Pill label={featured?.styleTags?.[0] ?? "Style DNA"} tone="accent" />
            {featured?.offerSummary?.lowestPrice != null ? <Pill label={`From $${Math.round(featured.offerSummary.lowestPrice)}`} tone="warning" /> : null}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Tonight's top frame</Text>
            <Text style={styles.heroTitle}>{featured?.name ?? "Future sport layering"}</Text>
            <Text style={styles.heroText}>
              {featured?.description ?? "A darker, richer feed hero with clearer action order: discover, try on, save, then compare offers."}
            </Text>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{featured?.fitPreview?.recommendedSize ?? "--"}</Text>
              <Text style={styles.heroMetricLabel}>Best size</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{featured?.offerSummary?.offerCount ?? 0}</Text>
              <Text style={styles.heroMetricLabel}>Offer paths</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>
                {featured?.fitPreview?.confidenceScore != null ? `${Math.round(featured.fitPreview.confidenceScore * 100)}%` : "--"}
              </Text>
              <Text style={styles.heroMetricLabel}>Fit confidence</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <PrimaryButton onPress={() => router.push("/try-on")} fullWidth={false}>
              Try this look
            </PrimaryButton>
            <PrimaryButton onPress={() => router.push("/retail")} variant="secondary" fullWidth={false}>
              Compare offers
            </PrimaryButton>
          </View>
        </View>

        <SegmentedControl options={occasions} selected={occasion} onSelect={(value) => setOccasion(value as Occasion)} />
      </SectionCard>

      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable key={action.id} onPress={() => router.push(action.route)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
            <View style={styles.quickIcon}>
              <Feather name={action.icon} size={18} color={colors.inkOnDark} />
            </View>
            <Text style={styles.quickTitle}>{action.title}</Text>
            <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      {featured ? (
        <SectionCard
          eyebrow="Spotlight"
          title={featured.name}
          subtitle={detailLoading ? "Refreshing spotlight detail..." : "Fit, price, and commerce context stay visible without crowding the layout."}
        >
          <View style={styles.row}>
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
            <View style={styles.row}>
              <Pill label={`Size ${featured.fitPreview.recommendedSize ?? "--"}`} tone="success" />
              <Pill label={`${featured.fitPreview.fitLabel} fit`} tone="neutral" />
              <Pill label={`${Math.round(featured.fitPreview.confidenceScore * 100)}% confidence`} tone="info" />
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Discovery Cards" title="Curated for your profile" subtitle="Bolder cards keep the CTA hierarchy obvious while preserving fit and commerce integration.">
        {filtered.map((product: Product, index) => (
          <ProductCard
            key={product.id}
            tone={index === 0 ? "dark" : "light"}
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
  hero: {
    position: "relative",
    minHeight: 340,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.heroStart,
    padding: 18,
    justifyContent: "space-between"
  },
  heroGlow: {
    position: "absolute",
    top: -36,
    right: -22,
    width: 190,
    height: 190,
    borderRadius: radius.pill,
    backgroundColor: colors.heroGlow
  },
  heroGlowSecondary: {
    position: "absolute",
    bottom: -56,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: "rgba(47,109,246,0.2)"
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap"
  },
  heroCopy: {
    gap: 8,
    marginTop: 56
  },
  heroLabel: {
    color: colors.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700"
  },
  heroText: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: "88%"
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 10
  },
  heroMetric: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  heroMetricValue: {
    color: colors.inkOnDark,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800"
  },
  heroMetricLabel: {
    marginTop: 4,
    color: colors.inkOnDarkSoft,
    fontSize: 11
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10
  },
  quickCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 22,
    padding: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassStrong,
    marginBottom: 16
  },
  quickTitle: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "800"
  },
  quickSubtitle: {
    marginTop: 4,
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    lineHeight: 16
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
  supportText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.92
  }
});
