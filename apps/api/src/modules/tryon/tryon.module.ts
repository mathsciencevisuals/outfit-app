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

    const provider = dto.provider ?? this.configService.getOrThrow<string>("TRYON_PROVIDER");
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

    const selectedVariant = dto.variantId
      ? await (this.prisma.productVariant as any).findUnique({ where: { id: dto.variantId } })
      : await (this.prisma.productVariant as any).findFirst({
          orderBy: [{ productId: "asc" }, { createdAt: "asc" }]
        });

    if (!selectedVariant) {
      throw new BadRequestException("No product variant is available for try-on generation");
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
        variant: { include: { product: true } }
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

      const providerMode: "mock" | "http" | "grok" =
        request.provider === "http" ? "http" :
        request.provider === "grok" ? "grok" : "mock";
      const providerBaseUrl = this.configService.get<string>("TRYON_HTTP_BASE_URL") ?? "http://localhost:4010";
      const grokApiKey = this.configService.get<string>("GROK_API_KEY");
      const grokUsePro = this.configService.get<string>("GROK_USE_PRO") === "true";

      const input = {
        requestId: request.id,
        personImageUrl: request.imageUrl,
        garmentImageUrl:
          request.garmentImageUrl ??
          request.garmentUpload?.publicUrl ??
          request.variant.imageUrl ??
          request.variant.product.imageUrl ??
          request.imageUrl,
        prompt: `Virtual try-on for ${request.variant.product.name} in ${request.variant.color} with ${request.fitStyle ?? "balanced"} fit styling`,
        viewAngles: selectedAngles,
      };

      let result;
      try {
        const provider = createTryOnProvider(providerMode, providerBaseUrl, grokApiKey ?? undefined, grokUsePro);
        result = await provider.generate(input);
      } catch (providerError) {
        if (providerMode === "mock") throw providerError;
        // Fallback to mock on http/grok failures
        const fallbackProvider = createTryOnProvider("mock", providerBaseUrl);
        result = await fallbackProvider.generate(input);
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
          statusMessage: providerMode === "grok" ? "Grok Aurora try-on completed"
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
