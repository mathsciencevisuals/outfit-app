export interface FitMeasurementInput {
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  inseamCm?: number | null;
}

export interface FitSizeRange {
  sizeLabel: string;
  chestMinCm?: number | null;
  chestMaxCm?: number | null;
  waistMinCm?: number | null;
  waistMaxCm?: number | null;
  hipsMinCm?: number | null;
  hipsMaxCm?: number | null;
  inseamMinCm?: number | null;
  inseamMaxCm?: number | null;
}

export interface FitEvaluation {
  sizeLabel: string;
  score: number;
  confidence: number;
  verdict: "ideal" | "good" | "tight" | "loose";
  notes: string;
}
