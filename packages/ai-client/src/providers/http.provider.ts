import { TryOnGenerationInput, TryOnGenerationResult, TryOnProvider } from "../interfaces/tryon-provider";

export class HttpTryOnProvider implements TryOnProvider {
  readonly name = "http";

  constructor(private readonly baseUrl: string) {}

  async generate(input: TryOnGenerationInput): Promise<TryOnGenerationResult> {
    const response = await fetch(`${this.baseUrl}/try-on`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`HTTP try-on provider failed with status ${response.status}`);
    }

    return (await response.json()) as TryOnGenerationResult;
  }
}
