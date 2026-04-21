import { InjectQueue } from "@nestjs/bullmq";
import { BullModule } from "@nestjs/bullmq";
import {
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
import { ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { IsBoolean, IsOptional, IsString } from "class-validator";

import { createTryOnProvider } from "@fitme/ai-client";
import { PrismaService } from "../../common/prisma.service";
import { TRYON_QUEUE } from "../../jobs/queues/tryon.queue";

class CreateTryOnRequestDto {
  @IsString()
  userId!: string;

  @IsString()
  variantId!: string;

  @IsString()
  imageUrl!: string;

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
    @InjectQueue(TRYON_QUEUE) private readonly queue: Queue
  ) {}

  list(userId?: string) {
    return this.prisma.tryOnRequest.findMany({
      where: userId ? { userId } : undefined,
      include: { result: true, variant: { include: { product: true } }, user: true },
      orderBy: { requestedAt: "desc" }
    });
  }

  get(id: string) {
    return this.prisma.tryOnRequest.findUnique({
      where: { id },
      include: { result: true, variant: { include: { product: true } }, user: true }
    });
  }

  async create(dto: CreateTryOnRequestDto) {
    const provider = dto.provider ?? this.configService.getOrThrow<string>("TRYON_PROVIDER");
    const request = await this.prisma.tryOnRequest.create({
      data: {
        userId: dto.userId,
        variantId: dto.variantId,
        imageUrl: dto.imageUrl,
        provider
      }
    });

    await this.queue.add("process-tryon", { tryOnRequestId: request.id });
    return request;
  }

  async process(id: string) {
    await this.processQueuedRequest(id);
    return this.get(id);
  }

  async processQueuedRequest(id: string) {
    const request = await this.prisma.tryOnRequest.findUnique({
      where: { id },
      include: {
        variant: { include: { product: true } }
      }
    });

    if (!request) {
      return null;
    }

    await this.prisma.tryOnRequest.update({
      where: { id },
      data: { status: "PROCESSING" }
    });

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

    await this.prisma.tryOnResult.upsert({
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

    await this.prisma.tryOnRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        processedAt: new Date()
      }
    });

    return this.get(id);
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
}

@ApiTags("try-on")
@Controller("try-on")
class TryOnController {
  constructor(private readonly service: TryOnService) {}

  @Get("requests")
  list(@Query("userId") userId?: string) {
    return this.service.list(userId);
  }

  @Get("requests/:id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Post("requests")
  create(@Body() dto: CreateTryOnRequestDto) {
    return this.service.create(dto);
  }

  @Post("requests/:id/process")
  process(@Param("id") id: string) {
    return this.service.process(id);
  }

  @Get("provider-configs")
  listProviderConfigs() {
    return this.service.listProviderConfigs();
  }

  @Put("provider-configs/:provider")
  updateProviderConfig(
    @Param("provider") provider: string,
    @Body() dto: UpdateProviderConfigDto
  ) {
    return this.service.updateProviderConfig(provider, dto);
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: TRYON_QUEUE })],
  controllers: [TryOnController],
  providers: [TryOnService, PrismaService],
  exports: [TryOnService]
})
export class TryOnModule {}
