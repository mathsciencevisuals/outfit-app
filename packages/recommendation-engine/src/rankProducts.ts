import { computeColorCompatibility } from "./colorRules";
import { RankedRecommendation, RecommendationCandidate, RecommendationPreference } from "./types";

export const rankProducts = (
  candidates: RecommendationCandidate[],
  preference: RecommendationPreference
): RankedRecommendation[] =>
  candidates
    .map((candidate) => {
      const styleHits = candidate.styleTags.filter((tag) =>
        preference.preferredStyles.includes(tag)
      ).length;
      const styleScore = styleHits * 12;
      const colorScore = computeColorCompatibility(
        preference.preferredColors,
        candidate.colors,
        preference.avoidedColors
      );
      const fitComponent = candidate.fitScore * 0.55;
      const score = Math.max(0, fitComponent + styleScore + colorScore);

      return {
        productId: candidate.productId,
        score,
        explanation: `fit:${fitComponent.toFixed(1)} style:${styleScore} color:${colorScore}`
      };
    })
    .sort((left, right) => right.score - left.score);
