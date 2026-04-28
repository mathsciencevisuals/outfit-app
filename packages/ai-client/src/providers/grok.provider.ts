import { TryOnGenerationInput, TryOnGenerationResult, TryOnProvider, ViewAngle } from "../interfaces/tryon-provider";

const XAI_BASE = "https://api.x.ai/v1";

const ANGLE_ADDITIONS: Record<ViewAngle, string> = {
  front:      "",
  back:       " Show the result from the back view, model facing away from camera.",
  side_left:  " Show the result from the left-side profile view.",
  side_right: " Show the result from the right-side profile view.",
};

const BASE_PROMPT =
  "Replace the clothing on the person in the first image with the exact garment " +
  "from the second image. Match the fabric, color, texture, fit, drape, and style " +
  "perfectly to the person's body shape and pose. " +
  "Keep the exact same pose, face, hair, lighting, background, and body proportions. " +
  "Highly photorealistic, natural fit, no distortions.";

export class GrokTryOnProvider implements TryOnProvider {
  readonly name = "grok";

  constructor(
    private readonly apiKey: string,
    private readonly usePro = false
  ) {}

  private get model() {
    return this.usePro ? "grok-imagine-image-pro" : "grok-imagine-image";
  }

  async generate(input: TryOnGenerationInput): Promise<TryOnGenerationResult> {
    const angles: ViewAngle[] = input.viewAngles?.length ? input.viewAngles : ["front"];

    const views: Partial<Record<ViewAngle, string>> = {};
    for (const angle of angles) {
      views[angle] = await this.editTryOn(
        input.personImageUrl,
        input.garmentImageUrl,
        angle
      );
    }

    const primaryUrl = views["front"] ?? views[angles[0]] ?? "";

    return {
      outputImageUrl: primaryUrl,
      confidence: 0.88,
      summary: `Grok Aurora virtual try-on — ${angles.join(", ")} view(s).`,
      views,
      metadata: { provider: this.model, angles },
    };
  }

  private async editTryOn(
    personImageUrl: string,
    garmentImageUrl: string,
    angle: ViewAngle
  ): Promise<string> {
    const prompt = BASE_PROMPT + ANGLE_ADDITIONS[angle];

    const res = await fetch(`${XAI_BASE}/images/edits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        images: [
          { type: "image_url", image_url: { url: personImageUrl } },   // image 1 = person
          { type: "image_url", image_url: { url: garmentImageUrl } },  // image 2 = garment
        ],
        num_images: 1,
        aspect_ratio: "3:4",   // portrait — better for full-body try-on
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Grok image edit error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as { data: Array<{ url: string }> };
    const url = json.data[0]?.url;
    if (!url) throw new Error(`Grok returned no image URL for angle: ${angle}`);
    return url;
  }
}
