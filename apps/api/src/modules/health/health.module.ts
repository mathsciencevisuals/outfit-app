import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";
import Redis from "ioredis";

import { Public } from "../../common/auth/public.decorator";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
class HealthService {
  private readonly redis: Redis;
  private readonly storageProvider: "gcs" | "minio";
  private readonly bucket?: string;
  private readonly gcs?: Storage;
  private readonly s3Client?: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.redis = new Redis(this.configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    this.storageProvider = this.configService.get<"gcs" | "minio">("STORAGE_PROVIDER") ?? "gcs";

    if (this.storageProvider === "gcs") {
      const projectId = this.configService.get<string>("GCS_PROJECT_ID");
      this.bucket = this.configService.getOrThrow<string>("GCS_BUCKET");
      this.gcs = new Storage(projectId ? { projectId } : undefined);
      return;
    }

    const endpoint = this.configService.getOrThrow<string>("MINIO_ENDPOINT");
    const port = Number(this.configService.getOrThrow<number>("MINIO_PORT"));
    const useSsl = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;

    this.bucket = this.configService.getOrThrow<string>("MINIO_BUCKET");
    this.s3Client = new S3Client({
      region: this.configService.get<string>("MINIO_REGION") ?? "us-east-1",
      endpoint: `${useSsl ? "https" : "http"}://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>("MINIO_ACCESS_KEY"),
        secretAccessKey: this.configService.getOrThrow<string>("MINIO_SECRET_KEY")
      }
    });
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
    if (this.storageProvider === "gcs") {
      if (!this.gcs || !this.bucket) {
        return { ok: false, provider: "gcs", error: "GCS bucket is not configured" };
      }

      try {
        const [exists] = await this.gcs.bucket(this.bucket).exists();
        if (!exists) {
          return { ok: false, provider: "gcs", error: `Bucket ${this.bucket} does not exist` };
        }

        return { ok: true, provider: "gcs", bucket: this.bucket };
      } catch (error: unknown) {
        return { ok: false, provider: "gcs", error: error instanceof Error ? error.message : "GCS unavailable" };
      }
    }

    if (!this.s3Client || !this.bucket) {
      return { ok: false, provider: "minio", error: "MinIO client is not configured" };
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, provider: "minio" };
    } catch (headError: unknown) {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
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
