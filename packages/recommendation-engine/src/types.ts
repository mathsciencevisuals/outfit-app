export interface RecommendationCandidate {
  productId: string;
  styleTags: string[];
  colors: string[];
  fitScore: number;
}

export interface RecommendationPreference {
  preferredStyles: string[];
  preferredColors: string[];
  avoidedColors: string[];
}

export interface RankedRecommendation {
  productId: string;
  score: number;
  explanation: string;
}
