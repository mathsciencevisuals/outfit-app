import { Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsObject, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async get(user: AuthenticatedUser, userId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot view these style preferences");
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  update(user: AuthenticatedUser, userId: string, dto: Omit<StylePreferenceDto, "userId">) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot update these style preferences");
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

@ApiBearerAuth()
@ApiTags("style-preferences")
@Controller("style-preferences")
class StylePreferencesController {
  constructor(private readonly service: StylePreferencesService) {}

  @Get(":userId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.service.get(user, userId);
  }

  @Put(":userId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: Omit<StylePreferenceDto, "userId">
  ) {
    return this.service.update(user, userId, dto);
  }
}

@Module({
  controllers: [StylePreferencesController],
  providers: [StylePreferencesService, PrismaService],
  exports: [StylePreferencesService]
})
export class StylePreferencesModule {}
