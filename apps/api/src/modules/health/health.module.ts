import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import Redis from "ioredis";

import { Public } from "../../common/auth/public.decorator";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
class HealthService {
  private readonly redis: Redis;
  private readonly storageProvider: "cloudinary" | "minio";
  private readonly bucket?: string;
  private readonly storageClient?: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.redis = new Redis(this.configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    this.storageProvider = this.configService.get<"cloudinary" | "minio">("STORAGE_PROVIDER") ?? "cloudinary";

    if (this.storageProvider === "minio") {
      const endpoint = this.configService.getOrThrow<string>("MINIO_ENDPOINT");
      const port = Number(this.configService.getOrThrow<number>("MINIO_PORT"));
      const useSsl = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;

      this.bucket = this.configService.getOrThrow<string>("MINIO_BUCKET");
      this.storageClient = new S3Client({
        region: this.configService.get<string>("MINIO_REGION") ?? "us-east-1",
        endpoint: `${useSsl ? "https" : "http"}://${endpoint}:${port}`,
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.configService.getOrThrow<string>("MINIO_ACCESS_KEY"),
          secretAccessKey: this.configService.getOrThrow<string>("MINIO_SECRET_KEY")
        }
      });
    }
  }

  async status() {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage()
    ]);

    return {
      ok: database.ok && redis.ok && storage.ok,
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
        storage
      }
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : "Database unavailable" };
    }
  }

  private async checkRedis() {
    try {
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }
      await this.redis.ping();
      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, error: error instanceof Error ? error.message : "Redis unavailable" };
    } finally {
      if (this.redis.status !== "end") {
        this.redis.disconnect();
      }
    }
  }

  private async checkStorage() {
    if (this.storageProvider === "cloudinary") {
      const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
      const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
      const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");

      if (!cloudName || !apiKey || !apiSecret) {
        return { ok: false, provider: "cloudinary", error: "Cloudinary credentials are missing" };
      }

      return { ok: true, provider: "cloudinary" };
    }

    if (!this.storageClient || !this.bucket) {
      return { ok: false, provider: "minio", error: "MinIO client is not configured" };
    }

    try {
      await this.storageClient.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, provider: "minio" };
    } catch (headError: unknown) {
      try {
        await this.storageClient.send(new CreateBucketCommand({ Bucket: this.bucket }));
        return { ok: true, provider: "minio", created: true };
      } catch (createError: unknown) {
        return {
          ok: false,
          provider: "minio",
          error:
            createError instanceof Error
              ? createError.message
              : headError instanceof Error
                ? headError.message
                : "Storage unavailable"
        };
      }
    }
  }
}

@Public()
@ApiTags("health")
@Controller("health")
class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  status() {
    return this.service.status();
  }
}

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaService]
})
export class HealthModule {}
