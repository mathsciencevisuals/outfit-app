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

const filterOptions = ["All", "Color-led", "Avoid clashes"];

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
    if (activeFilter === "Color-led") {
      return recommendations.filter((item) => (item.matchingColors?.length ?? 0) > 0);
    }
    if (activeFilter === "Avoid clashes") {
      return recommendations.filter((item) => (item.incompatibleColors?.length ?? 0) === 0);
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
        subtitle="These picks are now stronger on color clarity, showing both matching colors and combinations to avoid."
      >
        <View style={styles.row}>
          <Pill label={recommendationBadge(best)} tone="success" />
          <Pill label={`${recommendations.length} ranked pieces`} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Top score" value={`${Math.round(best.score)}`} caption="Best current product match" />
          <MetricTile
            label="Color match"
            value={`${best.matchingColors?.length ?? 0}`}
            caption={best.matchingColors?.join(", ") || "No explicit match"}
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
            <View key={item.id ?? item.productId} style={styles.cardWrap}>
              <ProductCard
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
              <View style={styles.colorRow}>
                {(item.matchingColors?.length ?? 0) > 0 ? (
                  <Pill label={`Matches: ${item.matchingColors?.join(", ")}`} tone="success" />
                ) : (
                  <Pill label="No strong color match yet" tone="warning" />
                )}
                {(item.incompatibleColors?.length ?? 0) > 0 ? (
                  <Pill label={`Avoid: ${item.incompatibleColors?.join(", ")}`} tone="warning" />
                ) : (
                  <Pill label="No major color clash" tone="accent" />
                )}
              </View>
            </View>
          ))}
        </SectionCard>
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
  cardWrap: {
    gap: 10
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  }
});
