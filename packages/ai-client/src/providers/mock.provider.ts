import { TryOnGenerationInput, TryOnGenerationResult, TryOnProvider } from "../interfaces/tryon-provider";

export class MockTryOnProvider implements TryOnProvider {
  readonly name = "mock";

  async generate(input: TryOnGenerationInput): Promise<TryOnGenerationResult> {
    return {
      outputImageUrl: `${input.personImageUrl}?mockTryOn=${input.requestId}`,
      overlayImageUrl: `${input.garmentImageUrl}?overlay=${input.requestId}`,
      confidence: 0.88,
      summary: "Mock try-on generated successfully with a balanced drape estimate.",
      metadata: {
        provider: this.name,
        prompt: input.prompt ?? "default-fitme-prompt"
      }
    };
  }
}
