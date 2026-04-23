export type Occasion =
  | "casual"
  | "streetwear"
  | "formal"
  | "college"
  | "interview"
  | "date"
  | "fest";

export interface ColorCompatibilityResult {
  score: number;
  matchingColors: string[];
  complementaryColors: string[];
  poorMatches: string[];
  explanation: string;
}

export interface RecommendationCandidate {
  productId: string;
  category: string;
  styleTags: string[];
  colors: string[];
  price: number;
  fitScore: number;
  fitConfidenceScore?: number;
  issueCount?: number;
  severeIssueCount?: number;
  hasRecommendedSize?: boolean;
  occasionTags?: Occasion[];
  savedSignal?: number;
  anchorComplementScore?: number;
  popularityScore?: number;
}

export interface RecommendationPreference {
  preferredStyles: string[];
  preferredColors: string[];
  avoidedColors: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  occasion?: Occasion | null;
  anchorCategory?: string | null;
  anchorColors?: string[];
  savedStyleTags?: string[];
  savedColors?: string[];
}

export interface RankedRecommendation {
  productId: string;
  score: number;
  explanation: string;
  reasons: string[];
  badges: string[];
  occasionMatch: boolean;
  budgetLabel: string;
  colorInsight: ColorCompatibilityResult;
}
