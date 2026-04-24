import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { extname } from "path";
import { IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

const { memoryStorage } = require("multer") as { memoryStorage: () => unknown };

class CreateUploadDto {
  @IsString()
  userId!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

class UploadFileDto {
  @IsString()
  userId!: string;
}

type UploadRow = {
  id: string;
  userId: string;
  key: string;
  mimeType: string;
  bucket: string;
  publicUrl: string;
  createdAt: Date;
};

@Injectable()
class UploadsService {
  private readonly storageProvider: "gcs" | "minio";
  private readonly bucket: string;
  private readonly gcs?: Storage;
  private readonly s3Client?: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService
  ) {
    this.storageProvider = this.configService.get<"gcs" | "minio">("STORAGE_PROVIDER") ?? "gcs";

    if (this.storageProvider === "gcs") {
      const projectId = this.configService.get<string>("GCS_PROJECT_ID");
      this.bucket = this.configService.getOrThrow<string>("GCS_BUCKET");
      this.gcs = new Storage(projectId ? { projectId } : undefined);
      return;
    }

    this.bucket = this.configService.getOrThrow<string>("MINIO_BUCKET");

    const endpoint = this.configService.getOrThrow<string>("MINIO_ENDPOINT");
    const port = Number(this.configService.getOrThrow<number>("MINIO_PORT"));
    const useSsl = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;

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

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these uploads");

    return this.prisma.$queryRaw<Array<UploadRow>>(Prisma.sql`
      SELECT id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
      FROM "Upload"
      WHERE "userId" = ${targetUserId}
      ORDER BY "createdAt" DESC
    `);
  }

  async create(user: AuthenticatedUser, dto: CreateUploadDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this upload");

    const key = `${dto.purpose ?? "general"}/${dto.userId}/${randomUUID()}${this.resolveExtension(dto.mimeType, dto.fileName)}`;
    const id = randomUUID();
    const publicUrl = this.buildPublicUrl(key);

    const [upload] = await this.prisma.$queryRaw<Array<UploadRow>>(Prisma.sql`
      INSERT INTO "Upload" (id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt")
      VALUES (${id}, ${dto.userId}, ${key}, ${dto.mimeType}, ${this.bucket}, ${publicUrl}, NOW())
      RETURNING id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
    `);

    return {
      upload: { ...upload, purpose: dto.purpose ?? "general" },
      uploadPath: `/uploads/${upload.id}/file`,
      method: "POST" as const
    };
  }

  async uploadFile(
    user: AuthenticatedUser,
    uploadId: string,
    dto: UploadFileDto,
    file?: { buffer?: Buffer; mimetype?: string; size?: number; originalname?: string }
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("A file is required");
    }

    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot upload this file");

    const [upload] = await this.prisma.$queryRaw<Array<UploadRow>>(Prisma.sql`
      SELECT id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
      FROM "Upload"
      WHERE id = ${uploadId}
      LIMIT 1
    `);

    if (!upload || upload.userId !== dto.userId) {
      throw new BadRequestException("Upload session is invalid for this user");
    }

    try {
      const publicUrl =
        this.storageProvider === "gcs"
          ? await this.uploadToGcs(upload, file)
          : await this.uploadToMinio(upload, file);

      const [updated] = await this.prisma.$queryRaw<Array<UploadRow>>(Prisma.sql`
        UPDATE "Upload"
        SET "mimeType" = ${file.mimetype ?? upload.mimeType},
            "publicUrl" = ${publicUrl}
        WHERE id = ${upload.id}
        RETURNING id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
      `);

      return updated;
    } catch (error: unknown) {
      throw new BadGatewayException(error instanceof Error ? error.message : "Upload storage is unavailable");
    }
  }

  private async uploadToGcs(
    upload: UploadRow,
    file: { buffer?: Buffer; mimetype?: string }
  ) {
    if (!this.gcs) {
      throw new Error("GCS client is not configured");
    }

    const bucket = this.gcs.bucket(upload.bucket);
    const object = bucket.file(upload.key);

    await object.save(file.buffer as Buffer, {
      resumable: false,
      contentType: file.mimetype ?? upload.mimeType,
      metadata: {
        cacheControl: "public, max-age=31536000"
      }
    });

    return this.buildPublicUrl(upload.key);
  }

  private async uploadToMinio(
    upload: UploadRow,
    file: { buffer?: Buffer; mimetype?: string; size?: number }
  ) {
    if (!this.s3Client) {
      throw new Error("MinIO client is not configured");
    }

    await this.ensureBucketExists();
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: upload.bucket,
        Key: upload.key,
        Body: file.buffer,
        ContentType: file.mimetype ?? upload.mimeType,
        ContentLength: file.size
      })
    );

    return this.buildPublicUrl(upload.key);
  }

  private async ensureBucketExists() {
    if (!this.s3Client) {
      return;
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private buildPublicUrl(key: string) {
    if (this.storageProvider === "gcs") {
      const configuredBase = this.configService.get<string>("GCS_PUBLIC_BASE_URL");
      const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");

      if (configuredBase) {
        return `${configuredBase.replace(/\/$/, "")}/${encodedKey}`;
      }

      return `https://storage.googleapis.com/${this.bucket}/${encodedKey}`;
    }

    const configuredBase = this.configService.get<string>("MINIO_PUBLIC_URL");
    if (configuredBase) {
      return `${configuredBase.replace(/\/$/, "")}/${this.bucket}/${key}`;
    }

    const endpoint = this.configService.getOrThrow<string>("MINIO_ENDPOINT");
    const port = Number(this.configService.getOrThrow<number>("MINIO_PORT"));
    const useSsl = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;
    return `${useSsl ? "https" : "http"}://${endpoint}:${port}/${this.bucket}/${key}`;
  }

  private resolveExtension(mimeType: string, fileName?: string) {
    const explicitExtension = fileName ? extname(fileName).trim().toLowerCase() : "";
    if (explicitExtension) {
      return explicitExtension;
    }

    if (mimeType === "image/png") {
      return ".png";
    }
    if (mimeType === "image/webp") {
      return ".webp";
    }
    if (mimeType === "image/heic" || mimeType === "image/heif") {
      return ".heic";
    }

    return ".jpg";
  }
}

@ApiBearerAuth()
@ApiTags("uploads")
@Controller("uploads")
class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post("presign")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUploadDto) {
    return this.service.create(user, dto);
  }

  @Post(":id/file")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }
    })
  )
  uploadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UploadFileDto,
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string; size?: number; originalname?: string }
  ) {
    return this.service.uploadFile(user, id, dto, file);
  }
}

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, PrismaService],
  exports: [UploadsService]
})
export class UploadsModule {}
