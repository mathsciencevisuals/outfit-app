import { computeColorCompatibility } from "./colorRules";
import { RankedRecommendation, RecommendationCandidate, RecommendationPreference } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const rankProducts = (
  candidates: RecommendationCandidate[],
  preference: RecommendationPreference
): RankedRecommendation[] =>
  candidates
    .map((candidate) => {
      const styleHits = candidate.styleTags.filter((tag) =>
        preference.preferredStyles.includes(tag)
      ).length;
      const styleScore = styleHits * 10;
      const colorScore = computeColorCompatibility(
        preference.preferredColors,
        candidate.colors,
        preference.avoidedColors
      );
      const fitConfidence = clamp(candidate.fitConfidenceScore ?? 0.5, 0, 1);
      const fitComponent = candidate.fitScore * 0.54;
      const confidenceComponent = fitConfidence * fitConfidence * 26;
      const uncertaintyPenalty = (1 - fitConfidence) * 18;
      const issuePenalty = (candidate.issueCount ?? 0) * 3.5 + (candidate.severeIssueCount ?? 0) * 6;
      const readinessBoost = candidate.hasRecommendedSize ? 6 : -4;
      const score = Math.max(
        0,
        fitComponent + confidenceComponent + styleScore + colorScore + readinessBoost - uncertaintyPenalty - issuePenalty
      );

      return {
        productId: candidate.productId,
        score,
        explanation: `fit:${fitComponent.toFixed(1)} confidence:${confidenceComponent.toFixed(1)} uncertainty:-${uncertaintyPenalty.toFixed(1)} style:${styleScore} color:${colorScore} issues:-${issuePenalty.toFixed(1)} readiness:${readinessBoost}`
      };
    })
    .sort((left, right) => right.score - left.score);
