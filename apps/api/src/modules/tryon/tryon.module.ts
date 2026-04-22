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
  Query
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { IsBoolean, IsOptional, IsString } from "class-validator";

import { createTryOnProvider } from "@fitme/ai-client";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { TRYON_QUEUE } from "../../jobs/queues/tryon.queue";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";

class CreateTryOnRequestDto {
  @IsString()
  userId!: string;

  @IsString()
  variantId!: string;

  @IsOptional()
  @IsString()
  uploadId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  provider?: string;
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

    return (this.prisma.tryOnRequest as any).findMany({
      where,
      include: {
        result: true,
        sourceUpload: true,
        variant: { include: { product: true } },
        user: true
      } as any,
      orderBy: { requestedAt: "desc" }
    }).then((requests: any[]) => requests.map((request: any) => this.serializeRequest(request)));
  }

  async get(user: AuthenticatedUser, id: string) {
    const request = await (this.prisma.tryOnRequest as any).findUnique({
      where: { id },
      include: {
        result: true,
        sourceUpload: true,
        variant: { include: { product: true } },
        user: true
      } as any
    });

    if (request) {
      this.authorizationService.assertSelfOrPrivileged(user, request.userId, "You cannot access this try-on request");
    }

    return request ? this.serializeRequest(request) : null;
  }

  async create(user: AuthenticatedUser, dto: CreateTryOnRequestDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this try-on request");

    const provider = dto.provider ?? this.configService.getOrThrow<string>("TRYON_PROVIDER");
    const upload = dto.uploadId
      ? await (this.prisma.upload as any).findUnique({ where: { id: dto.uploadId } })
      : null;

    if (dto.uploadId && (!upload || upload.userId !== dto.userId)) {
      throw new BadRequestException("Try-on upload is missing or does not belong to the user");
    }

    const imageUrl = upload?.publicUrl ?? dto.imageUrl;
    if (!imageUrl) {
      throw new BadRequestException("A completed upload or imageUrl is required");
    }

    const request = await (this.prisma.tryOnRequest as any).create({
      data: {
        userId: dto.userId,
        variantId: dto.variantId,
        sourceUploadId: upload?.id,
        imageUrl,
        provider,
        statusMessage: "Queued for processing"
      } as any,
      include: {
        result: true,
        sourceUpload: true,
        variant: { include: { product: true } },
        user: true
      } as any
    });

    await this.queue.add(
      "process-tryon",
      { tryOnRequestId: request.id },
      {
        attempts: 2,
        removeOnComplete: 25,
        removeOnFail: 50
      }
    );
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
        variant: { include: { product: true } }
      } as any
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
      } as any
    });

    try {
      const provider = createTryOnProvider(
        request.provider === "http" ? "http" : "mock",
        this.configService.getOrThrow<string>("TRYON_HTTP_BASE_URL")
      );
      const result = await provider.generate({
        requestId: request.id,
        personImageUrl: request.imageUrl,
        garmentImageUrl: request.variant.imageUrl ?? request.variant.product.imageUrl ?? request.imageUrl,
        prompt: `Virtual try-on for ${request.variant.product.name} in ${request.variant.color}`
      });

      await (this.prisma.tryOnResult as any).upsert({
        where: { requestId: request.id },
        update: {
          outputImageUrl: result.outputImageUrl,
          overlayImageUrl: result.overlayImageUrl,
          confidence: result.confidence,
          summary: result.summary,
          metadata: result.metadata as Prisma.InputJsonValue | undefined
        },
        create: {
          requestId: request.id,
          outputImageUrl: result.outputImageUrl,
          overlayImageUrl: result.overlayImageUrl,
          confidence: result.confidence,
          summary: result.summary,
          metadata: result.metadata as Prisma.InputJsonValue | undefined
        }
      });

      await (this.prisma.tryOnRequest as any).update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          statusMessage: "Try-on completed",
          processedAt: new Date()
        } as any
      });
    } catch (error: unknown) {
      await (this.prisma.tryOnRequest as any).update({
        where: { id: request.id },
        data: {
          status: "FAILED",
          statusMessage: error instanceof Error ? error.message.slice(0, 300) : "Try-on processing failed",
          processedAt: new Date()
        } as any
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
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTryOnRequestDto) {
    return this.service.create(user, dto);
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
  imports: [RewardsModule, BullModule.registerQueue({ name: TRYON_QUEUE })],
  controllers: [TryOnController],
  providers: [TryOnService, PrismaService],
  exports: [TryOnService]
})
export class TryOnModule {}
