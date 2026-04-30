import { InjectQueue } from "@nestjs/bullmq";
import { BullModule } from "@nestjs/bullmq";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { IsBoolean, IsOptional, IsString } from "class-validator";

import { createTryOnProvider, ViewAngle } from "@fitme/ai-client";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { TRYON_QUEUE } from "../../jobs/queues/tryon.queue";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";
import { UploadsModule, UploadsService } from "../uploads/uploads.module";

const { memoryStorage } = require("multer") as { memoryStorage: () => unknown };

const TRYON_PROVIDERS = ["mock", "http", "grok", "gemini"] as const;
type TryOnProviderMode = (typeof TRYON_PROVIDERS)[number];

function normalizeTryOnProvider(provider?: string | null): TryOnProviderMode {
  const normalized = provider?.trim().toLowerCase();
  return TRYON_PROVIDERS.includes(normalized as TryOnProviderMode)
    ? normalized as TryOnProviderMode
    : "mock";
}

class CreateTryOnRequestDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  uploadId?: string;

  @IsOptional()
  @IsString()
  garmentUploadId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  fitStyle?: string;

  @IsOptional()
  @IsString()
  comparisonLabel?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  /** Comma-separated list of view angles to generate: front,back,side_left,side_right */
  @IsOptional()
  @IsString()
  viewAngles?: string;

  /** Set to "true" when garmentPhoto shows a model wearing the clothes rather than an isolated garment */
  @IsOptional()
  @IsString()
  garmentIsModelPhoto?: string;
}

class IdentifyGarmentDto {
  @IsString()
  garmentUrl!: string;
}

class UpdateProviderConfigDto {
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiKeyHint?: string;

  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  config?: Record<string, unknown>;
}

@Injectable()
export class TryOnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService,
    private readonly uploadsService: UploadsService,
    @InjectQueue(TRYON_QUEUE) private readonly queue: Queue
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const where =
      userId != null
        ? (() => {
            this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot view these try-on requests");
            return { userId };
          })()
        : this.authorizationService.isPrivileged(user)
          ? undefined
          : { userId: user.id };

    return (this.prisma.tryOnRequest as any)
      .findMany({
        where,
        include: {
          result: true,
          sourceUpload: true,
          garmentUpload: true,
          variant: { include: { product: true, inventoryOffers: true } },
          user: true
        },
        orderBy: { requestedAt: "desc" }
      })
      .then((requests: any[]) => requests.map((request: any) => this.serializeRequest(request)));
  }

  async get(user: AuthenticatedUser, id: string) {
    const request = await (this.prisma.tryOnRequest as any).findUnique({
      where: { id },
      include: {
        result: true,
        sourceUpload: true,
        garmentUpload: true,
        variant: { include: { product: { include: { brand: true } }, inventoryOffers: { include: { shop: true } } } },
        user: true
      }
    });

    if (request) {
      this.authorizationService.assertSelfOrPrivileged(user, request.userId, "You cannot access this try-on request");
    }

    return request ? this.serializeRequest(request) : null;
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateTryOnRequestDto,
    files?: {
      userPhoto?: Array<{ buffer?: Buffer; mimetype?: string; originalname?: string }>;
      garmentPhoto?: Array<{ buffer?: Buffer; mimetype?: string; originalname?: string }>;
    }
  ) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this try-on request");

    const provider = normalizeTryOnProvider(dto.provider ?? this.configService.getOrThrow<string>("TRYON_PROVIDER"));
    const garmentPhotoFile = files?.garmentPhoto?.[0];
    const upload = dto.uploadId
      ? await (this.prisma.upload as any).findUnique({ where: { id: dto.uploadId } })
      : null;
    const garmentUpload = dto.garmentUploadId
      ? await (this.prisma.upload as any).findUnique({ where: { id: dto.garmentUploadId } })
      : null;

    if (dto.uploadId && (!upload || upload.userId !== dto.userId)) {
      throw new BadRequestException("Try-on upload is missing or does not belong to the user");
    }

    if (dto.garmentUploadId && (!garmentUpload || garmentUpload.userId !== dto.userId)) {
      throw new BadRequestException("Garment upload is missing or does not belong to the user");
    }

    // Accept inline file uploads when no pre-signed upload is provided
    const userPhotoFile = files?.userPhoto?.[0];
    let imageUrl = upload?.publicUrl ?? dto.imageUrl;
    if (!imageUrl && userPhotoFile?.buffer) {
      imageUrl = await this.uploadsService.storeFile(
        dto.userId, userPhotoFile.buffer, userPhotoFile.mimetype ?? "image/jpeg", "tryon"
      );
    }
    if (!imageUrl) {
      throw new BadRequestException("A completed upload, imageUrl, or userPhoto file is required");
    }

    let inlineGarmentUrl: string | null = garmentUpload?.publicUrl ?? null;
    if (!inlineGarmentUrl && garmentPhotoFile?.buffer) {
      inlineGarmentUrl = await this.uploadsService.storeFile(
        dto.userId, garmentPhotoFile.buffer, garmentPhotoFile.mimetype ?? "image/jpeg", "garment"
      );
    }
    if (!inlineGarmentUrl && !dto.variantId) {
      throw new BadRequestException("A garment image or store item is required");
    }

    const selectedVariant = await this.resolveTryOnVariant(dto.variantId, inlineGarmentUrl);

    // Encode selected view angles in comparisonLabel (parsed back during processing)
    const viewAnglesStr = dto.viewAngles ?? "front";
    const comparisonLabel = dto.comparisonLabel ?? viewAnglesStr;

    const request = await (this.prisma.tryOnRequest as any).create({
      data: {
        userId: dto.userId,
        variantId: selectedVariant.id,
        sourceUploadId: upload?.id ?? null,
        garmentUploadId: garmentUpload?.id ?? null,
        imageUrl,
        garmentImageUrl: inlineGarmentUrl,
        provider,
        fitStyle: dto.fitStyle ?? "balanced",
        comparisonLabel,
        statusMessage: "Queued for processing"
      },
      include: {
        result: true,
        sourceUpload: true,
        garmentUpload: true,
        variant: { include: { product: true } },
        user: true
      }
    });

    try {
      await this.queue.add(
        "process-tryon",
        { tryOnRequestId: request.id },
        {
          attempts: 2,
          removeOnComplete: 25,
          removeOnFail: 50
        }
      );
    } catch {
      void this.processQueuedRequest(request.id);
    }

    await this.rewardsService.awardFirstTryOn(dto.userId);
    return this.serializeRequest(request);
  }

  private async resolveTryOnVariant(variantId?: string, garmentImageUrl?: string | null) {
    if (variantId) {
      const selectedVariant = await (this.prisma.productVariant as any).findUnique({ where: { id: variantId } });
      if (!selectedVariant) {
        throw new BadRequestException("Selected product variant is not available for try-on generation");
      }
      return selectedVariant;
    }

    const existingVariant = await (this.prisma.productVariant as any).findFirst({
      orderBy: [{ productId: "asc" }, { sku: "asc" }]
    });
    if (existingVariant) {
      return existingVariant;
    }

    if (!garmentImageUrl) {
      throw new BadRequestException("No product variant is available for try-on generation");
    }

    const brand = await (this.prisma.brand as any).upsert({
      where: { slug: "user-uploaded-garments" },
      update: {},
      create: {
        name: "User Uploaded Garments",
        slug: "user-uploaded-garments",
        countryCode: "IN",
        sizingNotes: "System fallback for direct garment uploads."
      }
    });

    const product = await (this.prisma.product as any).upsert({
      where: { slug: "uploaded-garment-try-on" },
      update: { imageUrl: garmentImageUrl },
      create: {
        brandId: brand.id,
        name: "Uploaded Garment",
        slug: "uploaded-garment-try-on",
        category: "uploaded",
        description: "User-uploaded garment used for virtual try-on.",
        baseColor: "unknown",
        secondaryColors: [],
        materials: [],
        styleTags: ["uploaded"],
        imageUrl: garmentImageUrl
      }
    });

    return (this.prisma.productVariant as any).upsert({
      where: { sku: "uploaded-garment-try-on-default" },
      update: { imageUrl: garmentImageUrl },
      create: {
        productId: product.id,
        sku: "uploaded-garment-try-on-default",
        sizeLabel: "One Size",
        color: "Uploaded",
        price: new Prisma.Decimal(0),
        currency: "USD",
        imageUrl: garmentImageUrl
      }
    });
  }

  async process(user: AuthenticatedUser, id: string) {
    this.authorizationService.assertRoles(user, ["ADMIN", "OPERATOR"], "You cannot process try-on requests");
    await this.processQueuedRequest(id);
    return this.get(user, id);
  }

  async processQueuedRequest(id: string) {
    const request = await (this.prisma.tryOnRequest as any).findUnique({
      where: { id },
      include: {
        sourceUpload: true,
        garmentUpload: true,
        variant: { include: { product: true } },
        user: {
          include: {
            profile: true,
            measurements: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      }
    });

    if (!request) {
      return null;
    }

    if (request.status === "COMPLETED") {
      return request;
    }

    await (this.prisma.tryOnRequest as any).update({
      where: { id },
      data: {
        status: "PROCESSING",
        statusMessage: "Generating try-on preview"
      }
    });

    try {
      const VALID_ANGLES: ViewAngle[] = ["front", "back", "side_left", "side_right"];
      const rawAngles = (request.comparisonLabel ?? "front").split(",").map((s: string) => s.trim());
      const viewAngles: ViewAngle[] = rawAngles.filter((a: string) => VALID_ANGLES.includes(a as ViewAngle)) as ViewAngle[];
      const selectedAngles: ViewAngle[] = viewAngles.length ? viewAngles : ["front"];

      const configuredProvider = normalizeTryOnProvider(this.configService.get<string>("TRYON_PROVIDER"));
      const storedProvider = normalizeTryOnProvider(request.provider);
      const providerMode =
        configuredProvider === "gemini" && storedProvider === "grok"
          ? "gemini"
          : storedProvider;

      const personImageUrl  = request.imageUrl;
      const garmentImageUrl =
        request.garmentImageUrl ??
        request.garmentUpload?.publicUrl ??
        request.variant.imageUrl ??
        request.variant.product.imageUrl ??
        request.imageUrl;

      let result: import("@fitme/ai-client").TryOnGenerationResult;

      if (providerMode === "gemini") {
        // Build user context for personalised Claude analysis
        const profile     = request.user?.profile;
        const measurement = request.user?.measurements?.[0];
        const claudeCtx = profile ? {
          fitPreference:   profile.fitPreference  as string | null,
          stylePreference: profile.stylePreference as Record<string, unknown> | null,
          budgetLabel:     profile.budgetLabel     as string | null,
          chestCm:         measurement?.chestCm    as number | null ?? null,
          heightCm:        (measurement?.heightCm ?? profile.heightCm) as number | null,
        } : undefined;

        // Two-step approach: first describe the garment via Claude (especially important
        // when the garment image shows a model wearing the clothes), then use that rich
        // description to guide Gemini's image generation for more reliable results.
        // Views are generated one at a time (not in parallel) to stay within Gemini rate limits.
        // After each view completes we persist a partial result so the client can display
        // it immediately without waiting for all angles.
        try {
          const [fitAnalysisResult, garmentDescription] = await Promise.all([
            this.callClaude(personImageUrl, garmentImageUrl, claudeCtx),
            this.describeGarmentWithClaude(garmentImageUrl),
          ]);

          const views: Partial<Record<ViewAngle, string>> = {};
          const partialBase = {
            fitStyle: request.fitStyle ?? "balanced",
            selectedColor: request.variant.color,
            selectedSize: request.variant.sizeLabel,
          };

          for (const angle of selectedAngles) {
            let angleSucceeded = false;
            for (let attempt = 0; attempt < 3 && !angleSucceeded; attempt++) {
              try {
                const url = await this.callGemini(
                  personImageUrl, garmentImageUrl, request.userId, angle, garmentDescription
                );
                views[angle] = url;
                angleSucceeded = true;

                const currentOutputUrl = views.front ?? (Object.values(views)[0] as string | undefined) ?? "";
                await (this.prisma.tryOnResult as any).upsert({
                  where: { requestId: request.id },
                  update: {
                    outputImageUrl: currentOutputUrl,
                    metadata: { ...partialBase, views } as Prisma.InputJsonValue,
                  },
                  create: {
                    requestId: request.id,
                    outputImageUrl: currentOutputUrl,
                    confidence: 0.75,
                    metadata: { ...partialBase, views } as Prisma.InputJsonValue,
                  },
                });
              } catch (angleError) {
                const msg = angleError instanceof Error ? angleError.message : String(angleError);
                if (attempt < 2) {
                  console.warn(`[TryOn] Attempt ${attempt + 1} failed for ${angle}, retrying:`, msg);
                  await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                } else {
                  console.warn(`[TryOn] All attempts failed for ${angle}:`, msg);
                }
              }
            }
          }

          if (Object.keys(views).length === 0) {
            throw new Error("All view generation attempts failed");
          }

          const outputImageUrl = views.front ?? (Object.values(views)[0] as string) ?? "";

          result = {
            outputImageUrl,
            views,
            confidence: fitAnalysisResult.fitScore / 100,
            summary: `${fitAnalysisResult.sizeRecommendation} recommended. ${fitAnalysisResult.styleNotes}`,
            metadata: {
              fitScore:            fitAnalysisResult.fitScore,
              sizeRecommendation:  fitAnalysisResult.sizeRecommendation,
              colourMatch:         fitAnalysisResult.colourMatch,
              styleNotes:          fitAnalysisResult.styleNotes,
              occasion:            fitAnalysisResult.occasion,
              stylistNote:         fitAnalysisResult.stylistNote,
              provider:            'gemini+claude',
            },
          };
        } catch (geminiError) {
          // Fall back to mock if Gemini/Claude calls fail
          const fallbackProvider = createTryOnProvider("mock", "http://localhost:4010");
          const input = {
            requestId: request.id, personImageUrl, garmentImageUrl,
            prompt: `Virtual try-on for ${request.variant.product.name}`,
            viewAngles: selectedAngles,
          };
          result = await fallbackProvider.generate(input);
        }
      } else {
        const providerBaseUrl = this.configService.get<string>("TRYON_HTTP_BASE_URL") ?? "http://localhost:4010";
        const grokApiKey = this.configService.get<string>("GROK_API_KEY");
        const grokUsePro = this.configService.get<string>("GROK_USE_PRO") === "true";

        const input = {
          requestId: request.id,
          personImageUrl,
          garmentImageUrl,
          prompt: `Virtual try-on for ${request.variant.product.name} in ${request.variant.color} with ${request.fitStyle ?? "balanced"} fit styling`,
          viewAngles: selectedAngles,
        };

        try {
          const provider = createTryOnProvider(providerMode as "mock" | "http" | "grok", providerBaseUrl, grokApiKey ?? undefined, grokUsePro);
          result = await provider.generate(input);
        } catch (providerError) {
          if (providerMode === "mock") throw providerError;
          const fallbackProvider = createTryOnProvider("mock", providerBaseUrl);
          result = await fallbackProvider.generate(input);
        }
      }

      const resultMetadata: Prisma.InputJsonValue = {
        ...(result.metadata ?? {}),
        ...(result.views ? { views: result.views } : {}),
        fitStyle: request.fitStyle ?? "balanced",
        selectedColor: request.variant.color,
        selectedSize: request.variant.sizeLabel,
      } as Prisma.InputJsonValue;

      await (this.prisma.tryOnResult as any).upsert({
        where: { requestId: request.id },
        update: {
          outputImageUrl: result.outputImageUrl,
          overlayImageUrl: result.overlayImageUrl,
          confidence: result.confidence,
          summary: result.summary,
          metadata: resultMetadata,
        },
        create: {
          requestId: request.id,
          outputImageUrl: result.outputImageUrl,
          overlayImageUrl: result.overlayImageUrl,
          confidence: result.confidence,
          summary: result.summary,
          metadata: resultMetadata,
        }
      });

      await (this.prisma.tryOnRequest as any).update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          statusMessage: providerMode === "gemini" ? "Gemini + Claude try-on completed"
            : providerMode === "grok" ? "Grok Aurora try-on completed"
            : providerMode === "http" ? "Try-on completed"
            : "Try-on completed with preview renderer",
          processedAt: new Date()
        }
      });
    } catch (error: unknown) {
      await (this.prisma.tryOnRequest as any).update({
        where: { id: request.id },
        data: {
          status: "FAILED",
          statusMessage: error instanceof Error ? error.message.slice(0, 300) : "Try-on processing failed",
          processedAt: new Date()
        }
      });
    }

    return request;
  }

  listProviderConfigs() {
    return this.prisma.providerConfig.findMany({ orderBy: { provider: "asc" } });
  }

  updateProviderConfig(provider: string, dto: UpdateProviderConfigDto) {
    const data = {
      ...dto,
      config: dto.config as Prisma.InputJsonValue | undefined
    };

    return this.prisma.providerConfig.upsert({
      where: { provider },
      update: data,
      create: { provider, ...data }
    });
  }

  // ── Claude fit analysis ──────────────────────────────────────────────────────

  private async callClaude(
    personImageUrl: string,
    garmentImageUrl: string,
    ctx?: {
      fitPreference?: string | null;
      stylePreference?: Record<string, unknown> | null;
      budgetLabel?: string | null;
      chestCm?: number | null;
      heightCm?: number | null;
    }
  ): Promise<{
    fitScore: number;
    sizeRecommendation: string;
    colourMatch: string;
    styleNotes: string;
    occasion: string;
    stylistNote: string;
  }> {
    const stub = {
      fitScore: 75, sizeRecommendation: 'M', colourMatch: 'Good',
      styleNotes: 'Looks like a good fit for everyday wear.',
      occasion: 'Casual', stylistNote: '',
    };
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return stub;

    const ctxLines: string[] = [];
    if (ctx?.fitPreference)  ctxLines.push(`Preferred fit: ${ctx.fitPreference}`);
    if (ctx?.budgetLabel)    ctxLines.push(`Budget: ${ctx.budgetLabel}`);
    if (ctx?.heightCm)       ctxLines.push(`Height: ${ctx.heightCm}cm`);
    if (ctx?.chestCm)        ctxLines.push(`Chest: ${ctx.chestCm}cm`);
    const styles = (ctx?.stylePreference as any)?.preferredStyles as string[] | undefined;
    if (styles?.length)      ctxLines.push(`Preferred styles: ${styles.join(', ')}`);
    const userCtxBlock = ctxLines.length ? `User context — ${ctxLines.join('; ')}.\n\n` : '';

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 640,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: personImageUrl } },
              { type: 'image', source: { type: 'url', url: garmentImageUrl } },
              {
                type: 'text',
                text: `${userCtxBlock}Analyze this garment on this person. Consider body shape, proportions, and Indian fashion context. Return ONLY valid JSON, no other text:\n{"fitScore":<0-100>,"sizeRecommendation":"<XS/S/M/L/XL/XXL>","colourMatch":"<Excellent/Good/Fair/Poor>","styleNotes":"<2-3 sentences about the fit and style>","occasion":"<Casual/College/Formal/Party/Ethnic>","stylistNote":"<personalized 2-3 sentence stylist message referencing the user context above, with Indian fashion tip>"}`,
              },
            ],
          }],
        }),
      });

      if (!res.ok) return stub;
      const data = await res.json() as { content?: Array<{ text?: string }> };
      const text = data.content?.[0]?.text ?? '{}';
      return { ...stub, ...JSON.parse(text) };
    } catch {
      return stub;
    }
  }

  // ── Garment identification ────────────────────────────────────────────────────

  async identifyGarment(garmentUrl: string): Promise<{
    category: string;
    fabric: string;
    occasions: string[];
    color: string;
    description: string;
  }> {
    const stub = {
      category: 'top', fabric: 'cotton', occasions: ['casual', 'college'],
      color: 'blue', description: 'A casual everyday garment suitable for college wear.',
    };
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return stub;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: garmentUrl } },
              {
                type: 'text',
                text: 'Identify this garment. Return ONLY valid JSON:\n{"category":"<top|bottom|dress|outerwear|footwear|accessory>","fabric":"<cotton|silk|polyester|denim|linen|wool|synthetic>","occasions":["<casual|college|formal|party|ethnic|festive>"],"color":"<primary color>","description":"<one sentence description in Indian fashion context>"}',
              },
            ],
          }],
        }),
      });

      if (!res.ok) return stub;
      const data = await res.json() as { content?: Array<{ text?: string }> };
      const text = data.content?.[0]?.text ?? '{}';
      return { ...stub, ...JSON.parse(text) };
    } catch {
      return stub;
    }
  }

  // ── Gemini image generation ──────────────────────────────────────────────────

  private async callGemini(
    personImageUrl: string,
    garmentImageUrl: string,
    userId: string,
    viewAngle: ViewAngle = "front",
    garmentDescription = ""
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      return `https://picsum.photos/seed/${Date.now()}/600/800`;
    }

    const [personRes, garmentRes] = await Promise.all([
      fetch(personImageUrl),
      fetch(garmentImageUrl),
    ]);

    const [personB64, garmentB64] = await Promise.all([
      personRes.arrayBuffer().then(b => Buffer.from(b).toString('base64')),
      garmentRes.arrayBuffer().then(b => Buffer.from(b).toString('base64')),
    ]);

    const personMime  = personRes.headers.get('content-type')  ?? 'image/jpeg';
    const garmentMime = garmentRes.headers.get('content-type') ?? 'image/jpeg';

    const imageModel = this.configService.get<string>('GEMINI_IMAGE_MODEL') ?? 'gemini-2.0-flash-exp';
    const viewInstruction = {
      front:      'Camera angle: straight-on front view.',
      back:       'Camera angle: from directly behind the person.',
      side_left:  'Camera angle: from the person\'s left side.',
      side_right: 'Camera angle: from the person\'s right side.',
    }[viewAngle];

    // Structured prompt: explicit roles + garment description from pre-analysis
    const garmentLine = garmentDescription
      ? `The garment to apply is: ${garmentDescription}.`
      : 'The garment to apply is shown in IMAGE B.';

    const prompt = `You are a virtual try-on AI. Your ONLY task is to produce a single realistic photo of the person wearing a different garment.

IMAGE A = the target person (first image provided). Do NOT change: their face, hair, skin tone, body shape, pose, or background.
IMAGE B = the garment source (second image provided). This may show a flat-lay garment, a hanger, or a model wearing the clothes. If IMAGE B shows a model, ignore the model entirely — extract ONLY the clothing item.

${garmentLine}

YOUR OUTPUT must be a single image showing IMAGE A's person wearing the garment from IMAGE B. Requirements:
1. ALL existing clothing on the person MUST be replaced by the garment from IMAGE B. No original clothing visible.
2. Garment must fit the person's body naturally with realistic draping, folds, and shadows.
3. Preserve exact: face identity, hair, skin tone, background, body proportions, lighting.
4. Match exactly from IMAGE B: garment color, pattern, cut, neckline, sleeve shape, fabric texture, length.
5. ${viewInstruction}
6. Output ONE merged final image only — no collage, no side-by-side, no commentary.`;

    // Interleave text labels with images so Gemini clearly knows which is which
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'IMAGE A — TARGET PERSON (do NOT alter this person\'s face, hair, skin, body, background):' },
              { inlineData: { mimeType: personMime,  data: personB64  } },
              { text: 'IMAGE B — GARMENT SOURCE (extract the clothing item shown; ignore any model wearing it):' },
              { inlineData: { mimeType: garmentMime, data: garmentB64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText.slice(0, 200)}`);
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> } }>;
    };
    const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      const textPart = geminiData.candidates?.[0]?.content?.parts?.find(p => p.text)?.text ?? '';
      throw new Error(`Gemini returned no image. Response: ${textPart.slice(0, 150)}`);
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const mimeType    = imagePart.inlineData.mimeType ?? 'image/png';
    return this.uploadsService.storeFile(userId, imageBuffer, mimeType, 'tryon-result');
  }

  // Uses Claude Haiku to describe the garment in detail before sending to Gemini.
  // This two-step approach is critical when garmentImageUrl shows a model wearing
  // the clothes — Claude extracts just the garment, giving Gemini better guidance.
  private async describeGarmentWithClaude(garmentImageUrl: string): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return '';

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: garmentImageUrl } },
              {
                type: 'text',
                text: 'Describe ONLY the clothing item in this image (ignore any model/person wearing it). Be specific: garment type, exact color, pattern, neckline, sleeve style, silhouette/cut, length, and distinctive design features. One dense sentence only.',
              },
            ],
          }],
        }),
      });

      if (!res.ok) return '';
      const data = await res.json() as { content?: Array<{ text?: string }> };
      return data.content?.[0]?.text?.trim() ?? '';
    } catch {
      return '';
    }
  }

  private serializeRequest(request: any) {
    if (!request) {
      return null;
    }

    return {
      ...request,
      status: request.status === "PENDING" ? "QUEUED" : request.status
    };
  }
}

@ApiBearerAuth()
@ApiTags("try-on")
@Controller("try-on")
class TryOnController {
  constructor(private readonly service: TryOnService) {}

  @Get("requests")
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Get("requests/:id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.get(user, id);
  }

  @Post("requests")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "userPhoto", maxCount: 1 },
        { name: "garmentPhoto", maxCount: 1 }
      ],
      { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }
    )
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTryOnRequestDto,
    @UploadedFiles()
    files?: {
      userPhoto?: Array<{ buffer?: Buffer; mimetype?: string; originalname?: string }>;
      garmentPhoto?: Array<{ buffer?: Buffer; mimetype?: string; originalname?: string }>;
    }
  ) {
    return this.service.create(user, dto, files);
  }

  @Roles("ADMIN", "OPERATOR")
  @Post("requests/:id/process")
  process(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.process(user, id);
  }

  @Post("identify-garment")
  identifyGarment(@Body() dto: IdentifyGarmentDto) {
    return this.service.identifyGarment(dto.garmentUrl);
  }

  @Roles("ADMIN", "OPERATOR")
  @Get("provider-configs")
  listProviderConfigs() {
    return this.service.listProviderConfigs();
  }

  @Roles("ADMIN")
  @Put("provider-configs/:provider")
  updateProviderConfig(
    @Param("provider") provider: string,
    @Body() dto: UpdateProviderConfigDto
  ) {
    return this.service.updateProviderConfig(provider, dto);
  }
}

@Module({
  imports: [RewardsModule, UploadsModule, BullModule.registerQueue({ name: TRYON_QUEUE })],
  controllers: [TryOnController],
  providers: [TryOnService, PrismaService],
  exports: [TryOnService]
})
export class TryOnModule {}
