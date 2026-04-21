export interface TryOnGenerationInput {
  requestId: string;
  personImageUrl: string;
  garmentImageUrl: string;
  prompt?: string;
}

export interface TryOnGenerationResult {
  outputImageUrl: string;
  overlayImageUrl?: string;
  confidence: number;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface TryOnProvider {
  readonly name: string;
  generate(input: TryOnGenerationInput): Promise<TryOnGenerationResult>;
}
