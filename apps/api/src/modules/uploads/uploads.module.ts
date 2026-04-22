import {
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
import { randomUUID } from "crypto";
import { extname } from "path";
import { IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class CreateUploadDto {
  @IsString()
  userId!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsString()
  fileName?: string;
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
    const port = this.configService.getOrThrow<number>("MINIO_PORT");
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

    return this.prisma.upload.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(user: AuthenticatedUser, dto: CreateUploadDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this upload");

    const key = `uploads/${dto.userId}/${randomUUID()}${this.resolveExtension(dto.mimeType, dto.fileName)}`;
    const publicUrl = this.buildPublicUrl(key);
    const upload = await this.prisma.upload.create({
      data: {
        userId: dto.userId,
        mimeType: dto.mimeType,
        key,
        bucket: this.bucket,
        publicUrl
      }
    });

    return {
      upload,
      uploadPath: `/uploads/${upload.id}/file`,
      method: "POST" as const
    };
  }

  async uploadFile(
    user: AuthenticatedUser,
    uploadId: string,
    dto: UploadFileDto,
    file?: { buffer?: Buffer; mimetype?: string }
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("A file is required");
    }

    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot upload this file");

    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId }
    });

    if (!upload || upload.userId !== dto.userId) {
      throw new BadRequestException("Upload session is invalid for this user");
    }

    await this.ensureBucketExists();
    await this.client.send(
      new PutObjectCommand({
        Bucket: upload.bucket,
        Key: upload.key,
        Body: file.buffer,
        ContentType: upload.mimeType || file.mimetype
      })
    );

    return upload;
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
    const port = this.configService.getOrThrow<number>("MINIO_PORT");
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
  @UseInterceptors(FileInterceptor("file"))
  uploadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UploadFileDto,
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string }
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
