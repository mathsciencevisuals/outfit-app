export type ViewAngle = 'front' | 'back' | 'side_left' | 'side_right';

export interface TryOnGenerationInput {
  requestId: string;
  personImageUrl: string;
  garmentImageUrl: string;
  prompt?: string;
  viewAngles?: ViewAngle[];
}

export interface TryOnGenerationResult {
  outputImageUrl: string;
  overlayImageUrl?: string;
  confidence: number;
  summary: string;
  metadata?: Record<string, unknown>;
  views?: Partial<Record<ViewAngle, string>>;
}

export interface TryOnProvider {
  readonly name: string;
  generate(input: TryOnGenerationInput): Promise<TryOnGenerationResult>;
}
