import { summarizePenalties } from "./rules/metricRule";
import { FitEvaluation, FitMeasurementInput, FitSizeRange } from "./types";

export const computeFit = (
  measurement: FitMeasurementInput,
  sizeRanges: FitSizeRange[]
): FitEvaluation | null => {
  if (sizeRanges.length === 0) {
    return null;
  }

  const ranked = sizeRanges.map((range) => {
    const penalties = summarizePenalties(measurement, range);
    const score = Math.max(0, 100 - penalties.totalPenalty * 2.5);
    const availableSignals = [
      measurement.chestCm,
      measurement.waistCm,
      measurement.hipsCm,
      measurement.inseamCm
    ].filter((value) => value != null).length;
    const confidence = Math.min(0.98, 0.45 + availableSignals * 0.12 - penalties.totalPenalty * 0.01);

    let verdict: FitEvaluation["verdict"] = "ideal";
    if (penalties.totalPenalty > 10) {
      verdict = "tight";
    } else if (penalties.totalPenalty > 5) {
      verdict = "good";
    } else if (penalties.totalPenalty > 2) {
      verdict = "loose";
    }

    return {
      sizeLabel: range.sizeLabel,
      score,
      confidence,
      verdict,
      notes: `Penalties chest:${penalties.chestPenalty} waist:${penalties.waistPenalty} hips:${penalties.hipsPenalty} inseam:${penalties.inseamPenalty}`
    };
  });

  return ranked.sort((left, right) => right.score - left.score)[0];
};
