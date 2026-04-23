import { analyzeColorCompatibility } from "./colorRules";
import { RankedRecommendation, RecommendationCandidate, RecommendationPreference } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function budgetSignal(price: number, budgetMin?: number | null, budgetMax?: number | null) {
  if (budgetMin == null && budgetMax == null) {
    return { score: 0, label: "Budget open", reason: null as string | null };
  }

  if (budgetMin != null && budgetMax != null && price >= budgetMin && price <= budgetMax) {
    return { score: 18, label: "Within budget", reason: "within your budget" };
  }

  if (budgetMax != null && price <= budgetMax * 1.08) {
    return { score: 8, label: "Near budget", reason: "close to your budget ceiling" };
  }

  if (budgetMin != null && price < budgetMin) {
    return { score: 12, label: "Value pick", reason: "priced below your target range" };
  }

  return { score: -16, label: "Above budget", reason: "priced above your budget" };
}

export const rankProducts = (
  candidates: RecommendationCandidate[],
  preference: RecommendationPreference
): RankedRecommendation[] =>
  candidates
    .map((candidate) => {
      const styleHits = candidate.styleTags.filter((tag) => preference.preferredStyles.includes(tag)).length;
      const savedStyleHits = candidate.styleTags.filter((tag) => (preference.savedStyleTags ?? []).includes(tag)).length;
      const occasionMatch = preference.occasion ? (candidate.occasionTags ?? []).includes(preference.occasion) : false;
      const colorInsight = analyzeColorCompatibility(
        [...preference.preferredColors, ...(preference.savedColors ?? [])],
        candidate.colors,
        preference.avoidedColors,
        preference.anchorColors ?? []
      );
      const fitConfidence = clamp(candidate.fitConfidenceScore ?? 0.5, 0, 1);
      const fitComponent = candidate.fitScore * 0.44;
      const confidenceComponent = fitConfidence * fitConfidence * 24;
      const uncertaintyPenalty = (1 - fitConfidence) * 18;
      const issuePenalty = (candidate.issueCount ?? 0) * 3.6 + (candidate.severeIssueCount ?? 0) * 6.5;
      const styleComponent = styleHits * 9 + savedStyleHits * 4;
      const occasionComponent = occasionMatch ? 12 : 0;
      const budget = budgetSignal(candidate.price, preference.budgetMin, preference.budgetMax);
      const anchorBonus = candidate.anchorComplementScore ?? 0;
      const savedSignal = candidate.savedSignal ?? 0;
      const readinessBoost = candidate.hasRecommendedSize ? 6 : -4;
      const popularityBoost = clamp(candidate.popularityScore ?? 0, 0, 10);
      const score = Math.max(
        0,
        fitComponent +
          confidenceComponent +
          styleComponent +
          colorInsight.score +
          occasionComponent +
          budget.score +
          anchorBonus +
          savedSignal +
          readinessBoost +
          popularityBoost -
          uncertaintyPenalty -
          issuePenalty
      );

      const reasons = [
        candidate.fitScore >= 84 ? "best fit for your measurements" : null,
        styleHits > 0 ? "matches your preferred style" : null,
        budget.reason,
        colorInsight.matchingColors.length > 0
          ? `strong color match through ${colorInsight.matchingColors.join(", ")}`
          : colorInsight.complementaryColors.length > 0
            ? `pairs well with ${colorInsight.complementaryColors.join(", ")}`
            : null,
        occasionMatch && preference.occasion ? `good for ${preference.occasion}` : null
      ].filter(Boolean) as string[];

      const badges = [
        candidate.fitScore >= 88 && fitConfidence >= 0.72 && (candidate.severeIssueCount ?? 0) === 0 ? "Best Fit" : null,
        budget.label === "Value pick" || budget.label === "Within budget" ? "Budget Pick" : null,
        styleHits > 0 && colorInsight.score >= 12 ? "Style Match" : null,
        popularityBoost >= 8 ? "Trending" : null
      ].filter(Boolean) as string[];

      return {
        productId: candidate.productId,
        score,
        explanation: `fit:${fitComponent.toFixed(1)} confidence:${confidenceComponent.toFixed(1)} style:${styleComponent} color:${colorInsight.score} occasion:${occasionComponent} budget:${budget.score} anchor:${anchorBonus} saved:${savedSignal} uncertainty:-${uncertaintyPenalty.toFixed(1)} issues:-${issuePenalty.toFixed(1)}`,
        reasons,
        badges,
        occasionMatch,
        budgetLabel: budget.label,
        colorInsight
      };
    })
    .sort((left, right) => right.score - left.score);
