export type FitPreference = "slim" | "regular" | "relaxed";
export type FitLabel = "slim" | "regular" | "relaxed";
export type GarmentCategory =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "dresses"
  | "footwear"
  | "one-piece"
  | string;

export type BodyMeasurementKey =
  | "heightCm"
  | "weightKg"
  | "chestCm"
  | "waistCm"
  | "hipsCm"
  | "inseamCm"
  | "shoulderCm"
  | "footLengthCm";

export type FitIssueCode =
  | "chest-tight"
  | "chest-loose"
  | "waist-tight"
  | "waist-loose"
  | "shoulder-tight"
  | "shoulder-loose"
  | "sleeve-long"
  | "sleeve-short"
  | "hip-tight"
  | "hip-loose"
  | "inseam-short"
  | "inseam-long";

export type FitIssueSeverity = "low" | "medium" | "high";

export interface NormalizedMeasurementInput {
  heightCm?: number | null;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  inseamCm?: number | null;
  shoulderCm?: number | null;
  footLengthCm?: number | null;
}

export interface FitRange {
  minCm?: number | null;
  maxCm?: number | null;
}

export interface BrandSizeChartOption {
  variantId?: string | null;
  sizeLabel: string;
  displayLabel?: string | null;
  chest?: FitRange;
  waist?: FitRange;
  hips?: FitRange;
  inseam?: FitRange;
  shoulder?: FitRange;
  footLength?: FitRange;
  metadata?: Record<string, unknown> | null;
}

export interface FitIssue {
  code: FitIssueCode;
  severity: FitIssueSeverity;
  dimension: BodyMeasurementKey;
  direction: "tight" | "loose" | "short" | "long";
  deltaCm: number;
  message: string;
}

export interface SizeAlternative {
  sizeLabel: string;
  fitScore: number;
  reason: string;
}

export interface SizeComparison {
  sizeLabel: string;
  variantId?: string | null;
  fitScore: number;
  confidenceScore: number;
  fitLabel: FitLabel;
  issues: FitIssue[];
  explanation: string;
  isRecommended: boolean;
  isSelected: boolean;
}

export interface FitAssessmentInput {
  body: NormalizedMeasurementInput;
  fitPreference?: FitPreference | null;
  garmentCategory: GarmentCategory;
  sizeOptions: BrandSizeChartOption[];
  selectedSizeLabel?: string | null;
  selectedVariantId?: string | null;
  garmentMetadata?: Record<string, unknown> | null;
}

export interface FitAssessmentResult {
  recommendedSize: string | null;
  fitLabel: FitLabel;
  confidenceScore: number;
  fitScore: number;
  issues: FitIssue[];
  explanation: string;
  alternatives: SizeAlternative[];
  sizeComparisons: SizeComparison[];
  selectedSizeLabel?: string | null;
}

export interface FitProfileSummary {
  fitPreference: FitPreference;
  providedMeasurements: BodyMeasurementKey[];
  relevantMeasurements: BodyMeasurementKey[];
  completenessScore: number;
  guidance: string;
}
