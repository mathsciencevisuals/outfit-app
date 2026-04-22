import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";

class CampaignBannerDto {
  @IsString()
  title!: string;

  @IsString()
  subtitle!: string;

  @IsString()
  ctaLabel!: string;

  @IsString()
  ctaRoute!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  themeTone?: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsInt()
  position?: number;
}

class UpsertCampaignDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  theme!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  budgetLabel?: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsArray()
  banners!: CampaignBannerDto[];
}

function parseDate(value?: string) {
  return value ? new Date(value) : null;
}

@Injectable()
class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async list(user: AuthenticatedUser) {
    const now = new Date();

    return (this.prisma as any).campaign.findMany({
      where: this.authorizationService.isPrivileged(user)
        ? undefined
        : {
            status: "ACTIVE",
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
          },
      include: {
        banners: { where: this.authorizationService.isPrivileged(user) ? undefined : { isActive: true }, orderBy: { position: "asc" } },
        coupons: true,
        challengeParticipations: this.authorizationService.isPrivileged(user) ? true : false
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async upsert(user: AuthenticatedUser, id: string | null, dto: UpsertCampaignDto) {
    this.authorizationService.assertRoles(user, ["ADMIN", "OPERATOR"], "You cannot manage campaigns");

    const data = {
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      theme: dto.theme as any,
      status: dto.status as any,
      targetAudience: dto.targetAudience ?? "students",
      budgetLabel: dto.budgetLabel ?? null,
      startsAt: parseDate(dto.startsAt),
      endsAt: parseDate(dto.endsAt)
    };

    if (!id) {
      return (this.prisma as any).campaign.create({
        data: {
          ...data,
          banners: {
            create: dto.banners.map((banner, index) => ({
              title: banner.title,
              subtitle: banner.subtitle,
              ctaLabel: banner.ctaLabel,
              ctaRoute: banner.ctaRoute,
              imageUrl: banner.imageUrl ?? null,
              themeTone: banner.themeTone ?? null,
              isActive: banner.isActive,
              position: banner.position ?? index
            }))
          }
        },
        include: { banners: { orderBy: { position: "asc" } }, coupons: true, challengeParticipations: true }
      });
    }

    await (this.prisma as any).campaignBanner.deleteMany({ where: { campaignId: id } });

    return (this.prisma as any).campaign.update({
      where: { id },
      data: {
        ...data,
        banners: {
          create: dto.banners.map((banner, index) => ({
            title: banner.title,
            subtitle: banner.subtitle,
            ctaLabel: banner.ctaLabel,
            ctaRoute: banner.ctaRoute,
            imageUrl: banner.imageUrl ?? null,
            themeTone: banner.themeTone ?? null,
            isActive: banner.isActive,
            position: banner.position ?? index
          }))
        }
      },
      include: { banners: { orderBy: { position: "asc" } }, coupons: true, challengeParticipations: true }
    });
  }
}

@ApiBearerAuth()
@ApiTags("campaigns")
@Controller("campaigns")
class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Roles("ADMIN", "OPERATOR")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertCampaignDto) {
    return this.service.upsert(user, null, dto);
  }

  @Roles("ADMIN", "OPERATOR")
  @Put(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpsertCampaignDto) {
    return this.service.upsert(user, id, dto);
  }
}

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, PrismaService],
  exports: [CampaignsService]
})
export class CampaignsModule {}
