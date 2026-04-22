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

@Injectable()
class UploadsService {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService
  ) {
    const endpoint = this.configService.getOrThrow<string>("MINIO_ENDPOINT");
    const port = Number(this.configService.getOrThrow<number>("MINIO_PORT"));
    const useSsl = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;

    this.bucket = this.configService.getOrThrow<string>("MINIO_BUCKET");
    this.client = new S3Client({
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

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        key: string;
        mimeType: string;
        bucket: string;
        publicUrl: string;
        createdAt: Date;
      }>
    >(Prisma.sql`
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

    const [upload] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        key: string;
        mimeType: string;
        bucket: string;
        publicUrl: string;
        createdAt: Date;
      }>
    >(Prisma.sql`
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
    file?: { buffer?: Buffer; mimetype?: string; size?: number }
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("A file is required");
    }

    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot upload this file");

    const [upload] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        key: string;
        mimeType: string;
        bucket: string;
        publicUrl: string;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
      FROM "Upload"
      WHERE id = ${uploadId}
      LIMIT 1
    `);

    if (!upload || upload.userId !== dto.userId) {
      throw new BadRequestException("Upload session is invalid for this user");
    }

    try {
      await this.ensureBucketExists();
      await this.client.send(
        new PutObjectCommand({
          Bucket: upload.bucket,
          Key: upload.key,
          Body: file.buffer,
          ContentType: file.mimetype ?? upload.mimeType,
          ContentLength: file.size
        })
      );
    } catch (error: unknown) {
      throw new BadGatewayException(error instanceof Error ? error.message : "Upload storage is unavailable");
    }

    const [updated] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        key: string;
        mimeType: string;
        bucket: string;
        publicUrl: string;
        createdAt: Date;
      }>
    >(Prisma.sql`
      UPDATE "Upload"
      SET "mimeType" = ${file.mimetype ?? upload.mimeType},
          "publicUrl" = ${this.buildPublicUrl(upload.key)}
      WHERE id = ${upload.id}
      RETURNING id, "userId", key, "mimeType", bucket, "publicUrl", "createdAt"
    `);

    return updated;
  }

  private async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private buildPublicUrl(key: string) {
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
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string; size?: number }
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
