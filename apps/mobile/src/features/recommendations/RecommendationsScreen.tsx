import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
import type { Occasion, Recommendation } from "../../types/api";

const occasions: Array<Occasion | "all"> = ["all", "casual", "streetwear", "formal", "college", "interview", "date", "fest"];
const filterOptions = ["All", "Best fit", "Budget", "Color-led"];

export function RecommendationsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const [activeFilter, setActiveFilter] = useState("All");
  const [occasion, setOccasion] = useState<Occasion | "all">("all");
  const { data, loading, error } = useAsyncResource(async () => {
    const results = await mobileApi.recommendations(userId, { occasion: occasion === "all" ? undefined : occasion });
    return results.length > 0 ? results : mobileApi.generateRecommendations(userId, { occasion: occasion === "all" ? undefined : occasion });
  }, [userId, occasion]);

  const recommendations = data ?? [];
  const filtered = useMemo(() => {
    if (activeFilter === "Best fit") {
      return recommendations.filter((item) => (item.fitResult?.fitScore ?? 0) >= 78);
    }
    if (activeFilter === "Budget") {
      return recommendations.filter(
        (item) => (item.budgetLabel ?? "").toLowerCase().includes("budget") || (item.rankingBadges ?? []).includes("Budget Pick")
      );
    }
    if (activeFilter === "Color-led") {
      return recommendations.filter(
        (item) => (item.colorInsight?.matchingColors?.length ?? 0) > 0 || (item.colorInsight?.complementaryColors?.length ?? 0) > 0
      );
    }
    return recommendations;
  }, [activeFilter, recommendations]);

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Recommendations" subtitle="Ranking products by fit, occasion, color, budget, and saved-style signals." />
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
          message="Complete your profile and measurements to unlock clearer fit, style, and budget recommendations."
          actionLabel="Go to profile"
          onAction={() => router.push("/profile")}
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
        subtitle="Ranking blends fit confidence, style preference, occasion, budget, saved looks, and retail context."
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerLabel}>Curated now</Text>
            <Text style={styles.headerText}>Use these cards to move straight into shop comparison or try-on without losing context.</Text>
          </View>
          <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [styles.profileChip, pressed && styles.pressed]}>
            <Feather name="user" size={14} color="#182033" />
            <Text style={styles.profileChipText}>Profile</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pill label={recommendationBadge(best)} tone="success" />
          <Pill label={`${recommendations.length} ranked pieces`} tone="neutral" />
          {best.fitResult?.recommendedSize ? <Pill label={`Top size ${best.fitResult.recommendedSize}`} tone="accent" /> : null}
        </View>

        <View style={styles.metricRow}>
          <MetricTile label="Top score" value={`${Math.round(best.score)}`} caption="Best current product match" />
          <MetricTile
            label="Best price"
            value={best.offerSummary?.lowestPrice != null ? `$${Math.round(best.offerSummary.lowestPrice)}` : "--"}
            caption={best.budgetLabel ?? "Needs more pricing"}
          />
        </View>

        <SegmentedControl options={occasions} selected={occasion} onSelect={(value) => setOccasion(value as Occasion | "all")} />
        <SegmentedControl options={filterOptions} selected={activeFilter} onSelect={setActiveFilter} />
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches for this filter"
          message="This filter narrowed the list too far. Switch filters to widen the shortlist."
          actionLabel="Show all"
          onAction={() => setActiveFilter("All")}
        />
      ) : (
        <SectionCard eyebrow="Shortlist" title="Recommendation cards" subtitle="Each card keeps the next action obvious so users can move forward without hunting for the right entry point.">
          {filtered.map((item: Recommendation) => (
            <View key={item.id ?? item.productId} style={styles.cardWrap}>
              <ProductCard
                title={item.product?.name ?? item.productId}
                subtitle={productSubtitle(item.product)}
                badge={recommendationBadge(item)}
                scoreLabel={`Score ${Math.round(item.score)}`}
                highlight={item.explanation ?? "Routed here through fit-aware ranking."}
                bestSizeLabel={item.bestSizeLabel}
                fitLabel={item.bestFitLabel}
                confidenceLabel={item.fitResult ? `${Math.round(item.fitResult.confidenceScore * 100)}% confidence` : null}
                warning={item.fitWarning}
                issueLabels={item.fitResult?.issues.map((issue) => issue.code)}
                contextTags={[...(item.reasonTags ?? []), ...(item.occasionTags ?? [])]}
                rankingBadges={item.rankingBadges}
                priceLabel={
                  item.offerSummary?.lowestPrice != null ? `From $${Math.round(item.offerSummary.lowestPrice)}` : item.budgetLabel ?? null
                }
                primaryLabel="Compare shops"
                onPrimaryPress={() => router.push("/shops")}
                secondaryLabel="Try on now"
                onSecondaryPress={() => router.push("/tryon-upload")}
              />
              <View style={styles.insightCard}>
                <Text style={styles.insightTitle}>Color and budget read</Text>
                <Text style={styles.insightText}>
                  {item.colorInsight?.explanation ?? "Color alignment is still being evaluated."}
                </Text>
                {item.cheaperAlternative ? (
                  <Text style={styles.insightText}>
                    Cheaper option: {item.cheaperAlternative.name} from $
                    {Math.round(item.cheaperAlternative.offerSummary?.lowestPrice ?? 0)}.
                  </Text>
                ) : null}
              </View>
              <View style={styles.colorRow}>
                {(item.colorInsight?.matchingColors?.length ?? 0) > 0 ? (
                  <Pill label={`Matches: ${item.colorInsight?.matchingColors.join(", ")}`} tone="success" />
                ) : (
                  <Pill label="No direct color match" tone="warning" />
                )}
                {(item.colorInsight?.complementaryColors?.length ?? 0) > 0 ? (
                  <Pill label={`Complements: ${item.colorInsight?.complementaryColors.join(", ")}`} tone="info" />
                ) : null}
                {(item.incompatibleColors?.length ?? 0) > 0 ? (
                  <Pill label={`Avoid: ${item.incompatibleColors?.join(", ")}`} tone="danger" />
                ) : null}
              </View>
            </View>
          ))}
        </SectionCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
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
    color: "#846746",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  headerText: {
    color: "#647183",
    fontSize: 14,
    lineHeight: 21
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#efe3cf",
    borderWidth: 1,
    borderColor: "#dcc8ab"
  },
  profileChipText: {
    color: "#182033",
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
  cardWrap: {
    gap: 10
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  insightCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#f8f2ea",
    borderWidth: 1,
    borderColor: "#e5d7c0",
    gap: 6
  },
  insightTitle: {
    color: "#182033",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  insightText: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  }
});
