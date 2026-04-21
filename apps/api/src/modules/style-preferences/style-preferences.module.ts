import { Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsObject, IsString } from "class-validator";

import { PrismaService } from "../../common/prisma.service";

class StylePreferenceDto {
  @IsString()
  userId!: string;

  @IsObject()
  stylePreference!: Record<string, unknown>;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  avoidedColors!: string[];
}

@Injectable()
class StylePreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  update(userId: string, dto: Omit<StylePreferenceDto, "userId">) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        stylePreference: dto.stylePreference as Prisma.InputJsonValue,
        preferredColors: dto.preferredColors,
        avoidedColors: dto.avoidedColors
      }
    });
  }
}

@ApiTags("style-preferences")
@Controller("style-preferences")
class StylePreferencesController {
  constructor(private readonly service: StylePreferencesService) {}

  @Get(":userId")
  get(@Param("userId") userId: string) {
    return this.service.get(userId);
  }

  @Put(":userId")
  update(@Param("userId") userId: string, @Body() dto: Omit<StylePreferenceDto, "userId">) {
    return this.service.update(userId, dto);
  }
}

@Module({
  controllers: [StylePreferencesController],
  providers: [StylePreferencesService, PrismaService],
  exports: [StylePreferencesService]
})
export class StylePreferencesModule {}
