import { FitMeasurementInput, FitSizeRange } from "../types";

export const computeMetricPenalty = (
  measurementValue: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
) => {
  if (measurementValue == null || (min == null && max == null)) {
    return 0;
  }

  if (min != null && measurementValue < min) {
    return min - measurementValue;
  }

  if (max != null && measurementValue > max) {
    return measurementValue - max;
  }

  return 0;
};

export const summarizePenalties = (measurement: FitMeasurementInput, sizeRange: FitSizeRange) => {
  const chestPenalty = computeMetricPenalty(measurement.chestCm, sizeRange.chestMinCm, sizeRange.chestMaxCm);
  const waistPenalty = computeMetricPenalty(measurement.waistCm, sizeRange.waistMinCm, sizeRange.waistMaxCm);
  const hipsPenalty = computeMetricPenalty(measurement.hipsCm, sizeRange.hipsMinCm, sizeRange.hipsMaxCm);
  const inseamPenalty = computeMetricPenalty(
    measurement.inseamCm,
    sizeRange.inseamMinCm,
    sizeRange.inseamMaxCm
  );

  return {
    chestPenalty,
    waistPenalty,
    hipsPenalty,
    inseamPenalty,
    totalPenalty: chestPenalty + waistPenalty + hipsPenalty + inseamPenalty
  };
};
