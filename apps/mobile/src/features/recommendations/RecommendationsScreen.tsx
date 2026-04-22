import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { ProductCard, productSubtitle, recommendationBadge } from "../../components/ProductCard";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { Recommendation } from "../../types/api";

const filterOptions = ["All", "High score", "Style-led"];

export function RecommendationsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [activeFilter, setActiveFilter] = useState("All");
  const { data, loading, error } = useAsyncResource(async () => {
    const results = await mobileApi.recommendations(userId);
    return results.length > 0 ? results : mobileApi.generateRecommendations(userId);
  }, [userId]);

  const recommendations = data ?? [];
  const filtered = useMemo(() => {
    if (activeFilter === "High score") {
      return recommendations.filter((item) => item.score >= 80);
    }
    if (activeFilter === "Style-led") {
      return recommendations.filter((item) => (item.explanation ?? "").toLowerCase().includes("style"));
    }
    return recommendations;
  }, [activeFilter, recommendations]);

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Recommendations" subtitle="Ranking products by fit, color, and style signals." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="Recommendations"
          message="Recommendations could not be loaded."
          actionLabel="Back to discover"
          onRetry={() => router.push("/discover")}
        />
      </Screen>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No recommendations yet"
          message="Generate or unlock recommendations after your profile and fit data are ready."
          actionLabel="Go to try-on"
          onAction={() => router.push("/tryon-upload")}
        />
      </Screen>
    );
  }

  const best = recommendations[0];

  return (
    <Screen>
      <SectionCard
        eyebrow="Recommendations"
        title="What fits your profile best"
        subtitle="These picks are already ranked by the recommendation engine and shaped into a shopping-ready shortlist."
      >
        <View style={styles.row}>
          <Pill label={recommendationBadge(best)} tone="success" />
          <Pill label={`${recommendations.length} ranked pieces`} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Top score" value={`${Math.round(best.score)}`} caption="Best current product match" />
          <MetricTile
            label="Best pick"
            value={best.product?.brand?.name ?? "FitMe"}
            caption={best.product?.name ?? "Recommendation lead"}
          />
        </View>
        <SegmentedControl options={filterOptions} selected={activeFilter} onSelect={setActiveFilter} />
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches for this filter"
          message="Switch filters to expand the recommendation shortlist."
          actionLabel="Show all"
          onAction={() => setActiveFilter("All")}
        />
      ) : (
        <SectionCard eyebrow="Curated Cards" title="Recommendation shortlist">
          {filtered.map((item: Recommendation) => (
            <ProductCard
              key={item.id ?? item.productId}
              title={item.product?.name ?? item.productId}
              subtitle={productSubtitle(item.product)}
              badge={recommendationBadge(item)}
              scoreLabel={`Score ${Math.round(item.score)}`}
              highlight={item.explanation ?? "Routed here through fit-aware ranking."}
              primaryLabel="Compare shops"
              onPrimaryPress={() => router.push("/shops")}
              secondaryLabel="Try on now"
              onSecondaryPress={() => router.push("/tryon-upload")}
            />
          ))}
        </SectionCard>
      )}

      <SectionCard eyebrow="Buy Path" title="Move to commerce">
        <Text style={styles.supportText}>
          When you are ready to buy, compare retail partners first so the best-ranked look stays grounded in actual offer visibility.
        </Text>
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
  supportText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
