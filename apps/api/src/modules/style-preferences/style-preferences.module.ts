import { Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class StylePreferenceDto {
  @IsObject()
  stylePreference!: Record<string, unknown>;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  avoidedColors!: string[];

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsString()
  budgetLabel?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  defaultSize?: string;
}

@Injectable()
class StylePreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async get(user: AuthenticatedUser, userId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot view these style preferences");
    return (this.prisma.profile as any).findUnique({ where: { userId } });
  }

  update(user: AuthenticatedUser, userId: string, dto: StylePreferenceDto) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot update these style preferences");
    const profileData = {
      stylePreference: dto.stylePreference as Prisma.InputJsonValue,
      preferredColors: dto.preferredColors,
      avoidedColors: dto.avoidedColors,
      budgetMin:   dto.budgetMin   ?? null,
      budgetMax:   dto.budgetMax   ?? null,
      budgetLabel: dto.budgetLabel ?? null,
      ...(dto.gender      !== undefined && { gender: dto.gender }),
      ...(dto.defaultSize !== undefined && { defaultSize: dto.defaultSize }),
    };
    return (this.prisma.profile as any).upsert({
      where:  { userId },
      update: profileData,
      create: { userId, firstName: "FitMe", lastName: "Member", ...profileData },
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
    @Body() dto: StylePreferenceDto
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
