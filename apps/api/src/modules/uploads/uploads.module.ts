import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { randomUUID } from "crypto";
import { IsString } from "class-validator";

import { PrismaService } from "../../common/prisma.service";

class CreateUploadDto {
  @IsString()
  userId!: string;

  @IsString()
  mimeType!: string;
}

@Injectable()
class UploadsService {
  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {}

  list(userId?: string) {
    return this.prisma.upload.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" }
    });
  }

  async create(dto: CreateUploadDto) {
    const key = `uploads/${dto.userId}/${randomUUID()}`;
    const publicUrl = `http://${this.configService.getOrThrow<string>("MINIO_ENDPOINT")}:${this.configService.getOrThrow<number>("MINIO_PORT")}/${this.configService.getOrThrow<string>("MINIO_BUCKET")}/${key}`;

    return this.prisma.upload.create({
      data: {
        userId: dto.userId,
        mimeType: dto.mimeType,
        key,
        bucket: this.configService.getOrThrow<string>("MINIO_BUCKET"),
        publicUrl
      }
    });
  }
}

@ApiTags("uploads")
@Controller("uploads")
class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    return this.service.list(userId);
  }

  @Post("presign")
  create(@Body() dto: CreateUploadDto) {
    return this.service.create(dto);
  }
}

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, PrismaService],
  exports: [UploadsService]
})
export class UploadsModule {}
