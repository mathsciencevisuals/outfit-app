import {
  BodyMeasurementKey,
  BrandSizeChartOption,
  FitAssessmentInput,
  FitAssessmentResult,
  FitIssue,
  FitIssueCode,
  FitIssueSeverity,
  FitLabel,
  FitPreference,
  FitProfileSummary,
  GarmentCategory,
  NormalizedMeasurementInput,
  SizeComparison
} from "./types";

const allMeasurementKeys: BodyMeasurementKey[] = [
  "heightCm",
  "weightKg",
  "chestCm",
  "waistCm",
  "hipsCm",
  "inseamCm",
  "shoulderCm",
  "footLengthCm"
];

type RangeDimensionKey = Exclude<BodyMeasurementKey, "heightCm" | "weightKg">;

type CategoryProfile = {
  dimensions: RangeDimensionKey[];
  weights: Partial<Record<RangeDimensionKey, number>>;
  targetOffset: number;
};

type EvaluatedComparison = SizeComparison & {
  matchedDimensions: number;
  relevantRanges: number;
  chartCoverageRatio: number;
  coverageRatio: number;
  averagePosition: number;
};

const preferenceTargets: Record<FitPreference, number> = {
  slim: 0.82,
  regular: 0.5,
  relaxed: 0.22
};

const fitLabelTargets: Array<{ label: FitLabel; threshold: number }> = [
  { label: "relaxed", threshold: 0.33 },
  { label: "regular", threshold: 0.68 },
  { label: "slim", threshold: 1.01 }
];

const categoryProfiles: Record<string, CategoryProfile> = {
  tops: {
    dimensions: ["chestCm", "shoulderCm", "waistCm"],
    weights: { chestCm: 1.2, shoulderCm: 1.15, waistCm: 0.75 },
    targetOffset: 0.02
  },
  bottoms: {
    dimensions: ["waistCm", "hipsCm", "inseamCm"],
    weights: { waistCm: 1.2, hipsCm: 1.05, inseamCm: 0.9 },
    targetOffset: 0.04
  },
  outerwear: {
    dimensions: ["chestCm", "shoulderCm", "waistCm"],
    weights: { chestCm: 1.15, shoulderCm: 1.2, waistCm: 0.65 },
    targetOffset: -0.12
  },
  dresses: {
    dimensions: ["chestCm", "waistCm", "hipsCm", "shoulderCm"],
    weights: { chestCm: 1.05, waistCm: 1.05, hipsCm: 1.1, shoulderCm: 0.95 },
    targetOffset: -0.02
  },
  "one-piece": {
    dimensions: ["chestCm", "waistCm", "hipsCm", "shoulderCm"],
    weights: { chestCm: 1.05, waistCm: 1.05, hipsCm: 1.1, shoulderCm: 0.95 },
    targetOffset: -0.02
  },
  footwear: {
    dimensions: ["footLengthCm"],
    weights: { footLengthCm: 1.25 },
    targetOffset: 0.05
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function sortSizeLabel(left: string, right: string) {
  const order = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const leftIndex = order.indexOf(left.toUpperCase());
  const rightIndex = order.indexOf(right.toUpperCase());

  if (leftIndex !== -1 && rightIndex !== -1) {
    return leftIndex - rightIndex;
  }

  const leftNumber = Number(left.replace(/[^0-9.]/g, ""));
  const rightNumber = Number(right.replace(/[^0-9.]/g, ""));
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function normalizeCategoryKey(category: GarmentCategory) {
  const value = String(category ?? "tops").toLowerCase();

  if (value.includes("foot") || value.includes("shoe") || value.includes("sneaker") || value.includes("boot")) {
    return "footwear";
  }
  if (value.includes("dress")) {
    return "dresses";
  }
  if (
    value.includes("one-piece") ||
    value.includes("one piece") ||
    value.includes("jumpsuit") ||
    value.includes("romper")
  ) {
    return "one-piece";
  }
  if (
    value.includes("bottom") ||
    value.includes("pant") ||
    value.includes("trouser") ||
    value.includes("skirt") ||
    value.includes("jean") ||
    value.includes("short")
  ) {
    return "bottoms";
  }
  if (value.includes("outerwear") || value.includes("jacket") || value.includes("coat") || value.includes("blazer")) {
    return "outerwear";
  }
  return "tops";
}

function getCategoryProfile(category: GarmentCategory): CategoryProfile {
  return categoryProfiles[normalizeCategoryKey(category)] ?? categoryProfiles.tops;
}

export function normalizeMeasurementInput(input: Partial<NormalizedMeasurementInput> | null | undefined): NormalizedMeasurementInput {
  const normalized = Object.fromEntries(
    allMeasurementKeys.map((key) => {
      const rawValue = input?.[key];
      if (rawValue == null) {
        return [key, null];
      }

      const numeric = Number(rawValue);
      return [key, Number.isFinite(numeric) ? round(numeric, 1) : null];
    })
  ) as NormalizedMeasurementInput;

  return normalized;
}

function getRange(option: BrandSizeChartOption, dimension: RangeDimensionKey) {
  switch (dimension) {
    case "chestCm":
      return option.chest;
    case "waistCm":
      return option.waist;
    case "hipsCm":
      return option.hips;
    case "inseamCm":
      return option.inseam;
    case "shoulderCm":
      return option.shoulder;
    case "footLengthCm":
      return option.footLength;
    default:
      return undefined;
  }
}

function normalizedCutOffset(value: unknown) {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized.includes("slim") || normalized.includes("tailored")) {
    return 0.08;
  }
  if (normalized.includes("relaxed") || normalized.includes("oversized") || normalized.includes("loose")) {
    return -0.08;
  }
  return 0;
}

function getTargetForDimension(
  fitPreference: FitPreference,
  garmentCategory: GarmentCategory,
  dimension: RangeDimensionKey,
  metadata?: Record<string, unknown> | null
) {
  const profile = getCategoryProfile(garmentCategory);
  const globalOffset = profile.targetOffset;
  const dimensionOffset = dimension === "waistCm" ? 0.02 : dimension === "footLengthCm" ? 0.05 : 0;
  const metadataOffset = normalizedCutOffset(metadata?.cut ?? metadata?.fitIntent ?? metadata?.silhouette);

  return clamp(preferenceTargets[fitPreference] + globalOffset + dimensionOffset + metadataOffset, 0.08, 0.92);
}

export function relevantMeasurementsForCategory(category: GarmentCategory): BodyMeasurementKey[] {
  return getCategoryProfile(category).dimensions;
}

export function normalizeSizeChartOptions(
  options: BrandSizeChartOption[],
  garmentCategory: GarmentCategory
): BrandSizeChartOption[] {
  const relevantDimensions = relevantMeasurementsForCategory(garmentCategory);

  return [...options]
    .map((option) => ({
      ...option,
      displayLabel: option.displayLabel ?? option.sizeLabel,
      chest: option.chest ?? undefined,
      waist: option.waist ?? undefined,
      hips: option.hips ?? undefined,
      inseam: option.inseam ?? undefined,
      shoulder: option.shoulder ?? undefined,
      footLength: option.footLength ?? undefined
    }))
    .filter((option) =>
      relevantDimensions.some((dimension) => {
        const range = getRange(option, dimension as RangeDimensionKey);
        return Boolean(range?.minCm != null || range?.maxCm != null);
      })
    )
    .sort((left, right) => sortSizeLabel(left.sizeLabel, right.sizeLabel));
}

function severityForDelta(deltaCm: number): FitIssueSeverity {
  if (deltaCm >= 5) {
    return "high";
  }
  if (deltaCm >= 2.5) {
    return "medium";
  }
  return "low";
}

function toIssueCode(
  dimension: BodyMeasurementKey,
  direction: "tight" | "loose" | "short" | "long"
): FitIssueCode | null {
  if (dimension === "chestCm") {
    return direction === "tight" ? "chest-tight" : direction === "loose" ? "chest-loose" : null;
  }
  if (dimension === "waistCm") {
    return direction === "tight" ? "waist-tight" : direction === "loose" ? "waist-loose" : null;
  }
  if (dimension === "hipsCm") {
    return direction === "tight" ? "hip-tight" : direction === "loose" ? "hip-loose" : null;
  }
  if (dimension === "shoulderCm") {
    return direction === "tight" ? "shoulder-tight" : direction === "loose" ? "shoulder-loose" : null;
  }
  if (dimension === "inseamCm") {
    return direction === "short" ? "inseam-short" : direction === "long" ? "inseam-long" : null;
  }
  return null;
}

function labelForDimension(dimension: BodyMeasurementKey) {
  switch (dimension) {
    case "chestCm":
      return "Chest";
    case "waistCm":
      return "Waist";
    case "hipsCm":
      return "Hips";
    case "inseamCm":
      return "Inseam";
    case "shoulderCm":
      return "Shoulders";
    case "footLengthCm":
      return "Foot length";
    default:
      return dimension;
  }
}

function buildIssue(
  dimension: BodyMeasurementKey,
  direction: "tight" | "loose" | "short" | "long",
  deltaCm: number
): FitIssue | null {
  const code = toIssueCode(dimension, direction);
  if (!code) {
    return null;
  }

  const dimensionLabel = labelForDimension(dimension);
  const roundedDelta = round(deltaCm, 1);
  const message =
    direction === "tight"
      ? `${dimensionLabel} is likely the main pressure point and may feel snug by about ${roundedDelta} cm.`
      : direction === "loose"
        ? `${dimensionLabel} is likely to sit with extra room of about ${roundedDelta} cm.`
        : direction === "short"
          ? `${dimensionLabel} may finish short by about ${roundedDelta} cm.`
          : `${dimensionLabel} may run long by about ${roundedDelta} cm.`;

  return {
    code,
    severity: severityForDelta(deltaCm),
    dimension,
    direction,
    deltaCm: roundedDelta,
    message
  };
}

function fitLabelFromPosition(position: number): FitLabel {
  return fitLabelTargets.find((candidate) => position <= candidate.threshold)?.label ?? "regular";
}

function formatIssueLabel(code: FitIssueCode) {
  return code
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSizeExplanation(sizeLabel: string, fitLabel: FitLabel, issues: FitIssue[]) {
  if (issues.length === 0) {
    return `Size ${sizeLabel} is the cleanest match and should wear as a ${fitLabel} fit without obvious pressure points.`;
  }

  const strongestIssue = [...issues].sort(
    (left, right) => right.deltaCm - left.deltaCm || right.message.localeCompare(left.message)
  )[0];

  return `Size ${sizeLabel} still scores best, but expect a ${fitLabel} fit with a likely ${formatIssueLabel(strongestIssue.code).toLowerCase()} watchout.`;
}

function comparisonDirection(current: string, reference: string) {
  const order = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const currentIndex = order.indexOf(current.toUpperCase());
  const referenceIndex = order.indexOf(reference.toUpperCase());
  if (currentIndex !== -1 && referenceIndex !== -1) {
    if (currentIndex > referenceIndex) {
      return "larger";
    }
    if (currentIndex < referenceIndex) {
      return "smaller";
    }
    return "similar";
  }

  const currentNumber = Number(current.replace(/[^0-9.]/g, ""));
  const referenceNumber = Number(reference.replace(/[^0-9.]/g, ""));
  if (!Number.isNaN(currentNumber) && !Number.isNaN(referenceNumber)) {
    if (currentNumber > referenceNumber) {
      return "larger";
    }
    if (currentNumber < referenceNumber) {
      return "smaller";
    }
  }

  return "similar";
}

function buildAlternativeReason(candidate: EvaluatedComparison, recommended: EvaluatedComparison) {
  const direction = comparisonDirection(candidate.sizeLabel, recommended.sizeLabel);

  if (candidate.issues.length === 0 && recommended.issues.length > 0) {
    return `A ${direction === "similar" ? "nearby" : direction} option that removes the main issue flags, with a slightly ${candidate.fitLabel} silhouette.`;
  }
  if (candidate.fitLabel !== recommended.fitLabel) {
    return `Worth trying if you want a more ${candidate.fitLabel} look than the recommended ${recommended.fitLabel} read.`;
  }
  if (direction === "larger") {
    return "A roomier fallback if you want more ease through the key fit zones.";
  }
  if (direction === "smaller") {
    return "A closer, neater fallback if you prefer a more held silhouette.";
  }
  return "A close backup with a very similar score profile.";
}

function summarizeConfidence(
  coverageRatio: number,
  chartCoverageRatio: number,
  scoreGap: number
) {
  if (coverageRatio < 0.5) {
    return "Confidence is limited because several key body measurements are still missing.";
  }
  if (chartCoverageRatio < 0.75) {
    return "Confidence is tempered because the size chart does not cover every key dimension for this category.";
  }
  if (scoreGap < 4) {
    return "Confidence is moderate because the next size scores very close to the recommendation.";
  }
  return "Confidence is stronger because both your measurements and the item chart line up cleanly.";
}

function evaluateSizeOption(
  option: BrandSizeChartOption,
  body: NormalizedMeasurementInput,
  garmentCategory: GarmentCategory,
  fitPreference: FitPreference,
  selectedSizeLabel?: string | null,
  selectedVariantId?: string | null,
  garmentMetadata?: Record<string, unknown> | null
): EvaluatedComparison {
  const categoryProfile = getCategoryProfile(garmentCategory);
  const issues: FitIssue[] = [];
  const measuredPositions: Array<{ value: number; weight: number }> = [];
  let penalty = 0;
  let matchedDimensions = 0;
  let relevantRanges = 0;

  for (const dimension of categoryProfile.dimensions) {
    const bodyValue = body[dimension];
    const range = getRange(option, dimension);
    const min = range?.minCm ?? null;
    const max = range?.maxCm ?? null;
    const weight = categoryProfile.weights[dimension] ?? 1;

    if (min == null && max == null) {
      continue;
    }

    relevantRanges += 1;
    if (bodyValue == null) {
      penalty += 3.2 * weight;
      continue;
    }

    matchedDimensions += 1;
    const lower = min ?? max ?? bodyValue;
    const upper = max ?? min ?? bodyValue;

    if (bodyValue < lower) {
      const delta = lower - bodyValue;
      penalty += delta * 1.2 * weight;
      const direction = dimension === "inseamCm" ? "long" : "loose";
      const issue = buildIssue(dimension, direction, delta);
      if (issue) {
        issues.push(issue);
      }
      measuredPositions.push({ value: 0, weight });
      continue;
    }

    if (bodyValue > upper) {
      const delta = bodyValue - upper;
      penalty += delta * 1.95 * weight;
      const direction = dimension === "inseamCm" ? "short" : "tight";
      const issue = buildIssue(dimension, direction, delta);
      if (issue) {
        issues.push(issue);
      }
      measuredPositions.push({ value: 1, weight });
      continue;
    }

    const span = Math.max(upper - lower, 1);
    const position = clamp((bodyValue - lower) / span, 0, 1);
    const targetPosition = getTargetForDimension(fitPreference, garmentCategory, dimension, {
      ...(garmentMetadata ?? {}),
      ...((option.metadata as Record<string, unknown> | null) ?? {})
    });
    measuredPositions.push({ value: position, weight });
    penalty += Math.abs(position - targetPosition) * 8.5 * weight;
  }

  const coverageRatio = categoryProfile.dimensions.length === 0 ? 0 : matchedDimensions / categoryProfile.dimensions.length;
  const chartCoverageRatio = categoryProfile.dimensions.length === 0 ? 0 : relevantRanges / categoryProfile.dimensions.length;
  const totalWeight = measuredPositions.reduce((sum, item) => sum + item.weight, 0);
  const averagePosition =
    totalWeight > 0
      ? measuredPositions.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
      : getTargetForDimension(fitPreference, garmentCategory, categoryProfile.dimensions[0] ?? "chestCm", garmentMetadata);

  const highIssues = issues.filter((issue) => issue.severity === "high").length;
  const mediumIssues = issues.filter((issue) => issue.severity === "medium").length;
  penalty += highIssues * 7 + mediumIssues * 3;

  const fitScore = clamp(round(100 - penalty * 3.4 - (1 - coverageRatio) * 18 - (1 - chartCoverageRatio) * 10, 1), 5, 98);
  const fitLabel = fitLabelFromPosition(averagePosition);

  return {
    sizeLabel: option.sizeLabel,
    variantId: option.variantId ?? null,
    fitScore,
    confidenceScore: 0,
    fitLabel,
    issues,
    explanation: buildSizeExplanation(option.sizeLabel, fitLabel, issues),
    isRecommended: false,
    isSelected:
      (selectedVariantId != null && option.variantId === selectedVariantId) ||
      (selectedVariantId == null && selectedSizeLabel != null && option.sizeLabel === selectedSizeLabel),
    matchedDimensions,
    relevantRanges,
    chartCoverageRatio: round(chartCoverageRatio, 2),
    coverageRatio: round(coverageRatio, 2),
    averagePosition: round(averagePosition, 3)
  };
}

function applyConfidenceScores(comparisons: EvaluatedComparison[]) {
  return comparisons.map((comparison, index) => {
    const nextBest = comparisons[index + 1];
    const scoreGap = nextBest ? comparison.fitScore - nextBest.fitScore : 8;
    const issuePenalty = comparison.issues.reduce((sum, issue) => {
      if (issue.severity === "high") {
        return sum + 0.09;
      }
      if (issue.severity === "medium") {
        return sum + 0.05;
      }
      return sum + 0.02;
    }, 0);

    const confidenceScore = clamp(
      round(
        0.18 +
          comparison.coverageRatio * 0.34 +
          comparison.chartCoverageRatio * 0.22 +
          clamp(scoreGap / 12, 0, 1) * 0.18 -
          issuePenalty,
        2
      ),
      0.18,
      0.96
    );

    return {
      ...comparison,
      confidenceScore
    };
  });
}

function buildTopLevelExplanation(
  result: EvaluatedComparison,
  alternatives: FitAssessmentResult["alternatives"],
  fitPreference: FitPreference,
  selectedSizeLabel: string | null | undefined,
  scoreGap: number
) {
  const selectedSizeMessage =
    selectedSizeLabel && selectedSizeLabel !== result.sizeLabel
      ? `Your current selection is ${selectedSizeLabel}, so moving to ${result.sizeLabel} should improve the fit.`
      : "";
  const strongestIssue = [...result.issues].sort(
    (left, right) => right.deltaCm - left.deltaCm || right.message.localeCompare(left.message)
  )[0];
  const issueMessage = strongestIssue
    ? strongestIssue.message
    : `No major issue flags stand out for the recommended size.`;
  const alternativeMessage =
    alternatives.length > 0
      ? ` Backup options are ${alternatives.map((alternative) => alternative.sizeLabel).join(" or ")} if you want to adjust the silhouette.`
      : "";

  return [
    `We recommend size ${result.sizeLabel} for a ${fitPreference} preference.`,
    `It should wear as a ${result.fitLabel} fit.`,
    issueMessage,
    summarizeConfidence(result.coverageRatio, result.chartCoverageRatio, scoreGap),
    selectedSizeMessage + alternativeMessage
  ]
    .filter(Boolean)
    .join(" ");
}

export function assessFit(input: FitAssessmentInput): FitAssessmentResult {
  const fitPreference = input.fitPreference ?? "regular";
  const body = normalizeMeasurementInput(input.body);
  const relevantMeasurements = relevantMeasurementsForCategory(input.garmentCategory);
  const normalizedOptions = normalizeSizeChartOptions(input.sizeOptions, input.garmentCategory);

  if (normalizedOptions.length === 0) {
    return {
      recommendedSize: null,
      fitLabel: "regular",
      confidenceScore: 0.18,
      fitScore: 20,
      issues: [],
      explanation: "Fit guidance is limited because this item does not have usable size-chart data yet.",
      alternatives: [],
      sizeComparisons: [],
      selectedSizeLabel: input.selectedSizeLabel ?? null
    };
  }

  const comparisons = normalizedOptions.map((option) =>
    evaluateSizeOption(
      option,
      body,
      input.garmentCategory,
      fitPreference,
      input.selectedSizeLabel,
      input.selectedVariantId,
      input.garmentMetadata
    )
  );

  comparisons.sort((left, right) => right.fitScore - left.fitScore || left.sizeLabel.localeCompare(right.sizeLabel));
  const scoredComparisons = applyConfidenceScores(comparisons);
  const recommended = scoredComparisons[0];
  recommended.isRecommended = true;
  const recommendedIndex = normalizedOptions.findIndex((option) => option.sizeLabel === recommended.sizeLabel);

  const alternatives = scoredComparisons
    .slice(1)
    .filter((comparison) => {
      const scoreGap = recommended.fitScore - comparison.fitScore;
      const index = normalizedOptions.findIndex((option) => option.sizeLabel === comparison.sizeLabel);
      const isNeighbor = recommendedIndex >= 0 && index >= 0 ? Math.abs(index - recommendedIndex) <= 1 : true;
      return scoreGap <= 10 || (isNeighbor && scoreGap <= 14);
    })
    .slice(0, 3)
    .map((comparison) => ({
      sizeLabel: comparison.sizeLabel,
      fitScore: comparison.fitScore,
      reason: buildAlternativeReason(comparison, recommended)
    }));

  const nextBest = scoredComparisons[1];
  const scoreGap = nextBest ? recommended.fitScore - nextBest.fitScore : 8;

  return {
    recommendedSize: recommended.sizeLabel,
    fitLabel: recommended.fitLabel,
    confidenceScore: recommended.confidenceScore,
    fitScore: recommended.fitScore,
    issues: recommended.issues,
    explanation: buildTopLevelExplanation(
      recommended,
      alternatives,
      fitPreference,
      input.selectedSizeLabel,
      scoreGap
    ),
    alternatives,
    sizeComparisons: scoredComparisons,
    selectedSizeLabel: input.selectedSizeLabel ?? null
  };
}

export function buildFitProfileSummary(
  body: Partial<NormalizedMeasurementInput> | null | undefined,
  fitPreference?: FitPreference | null,
  garmentCategory: GarmentCategory = "tops"
): FitProfileSummary {
  const normalized = normalizeMeasurementInput(body);
  const relevantMeasurements = relevantMeasurementsForCategory(garmentCategory);
  const providedMeasurements = relevantMeasurements.filter((key) => normalized[key] != null);
  const completenessScore =
    relevantMeasurements.length === 0 ? 0 : round(providedMeasurements.length / relevantMeasurements.length, 2);

  return {
    fitPreference: fitPreference ?? "regular",
    providedMeasurements,
    relevantMeasurements,
    completenessScore,
    guidance:
      completenessScore >= 0.85
        ? "Your fit profile is detailed enough for stronger size guidance."
        : completenessScore >= 0.55
          ? "Guidance is usable, but adding the remaining measurements will improve confidence."
          : "Add more measurements to reduce ambiguity and improve size guidance."
  };
}

export const computeFit = assessFit;
