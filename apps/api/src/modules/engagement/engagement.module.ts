import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";
import { randomUUID } from "crypto";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";

class CreateLookRatingDto {
  @IsOptional()
  @IsString()
  savedLookId?: string;

  @IsOptional()
  @IsString()
  tryOnRequestId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

class CreateShareEventDto {
  @IsOptional()
  @IsString()
  savedLookId?: string;

  @IsOptional()
  @IsString()
  tryOnRequestId?: string;

  @IsString()
  channel!: string;
}

class TrackAppEventDto {
  @IsString()
  eventName!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Injectable()
class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService
  ) {}

  async listChallenges(user: AuthenticatedUser) {
    const campaigns = await (this.prisma as any).campaign.findMany({
      where: {
        status: "ACTIVE",
        targetAudience: "students"
      },
      include: {
        banners: { where: { isActive: true }, orderBy: { position: "asc" } },
        challengeParticipations: { where: { userId: user.id } }
      },
      orderBy: { createdAt: "desc" }
    });

    return campaigns.map((campaign: any) => ({
      ...campaign,
      participation: campaign.challengeParticipations?.[0] ?? null
    }));
  }

  listParticipation(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot access challenge participation");
    return (this.prisma as any).challengeParticipation.findMany({
      where: { userId: targetUserId },
      include: { campaign: { include: { banners: { orderBy: { position: "asc" } } } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async joinChallenge(user: AuthenticatedUser, campaignId: string) {
    const campaign = await (this.prisma as any).campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== "ACTIVE") {
      throw new BadRequestException("Challenge is not active");
    }

    const existing = await (this.prisma as any).challengeParticipation.findFirst({
      where: { userId: user.id, campaignId }
    });

    if (existing) {
      return existing;
    }

    return (this.prisma as any).challengeParticipation.create({
      data: {
        userId: user.id,
        campaignId,
        challengeName: campaign.title,
        rewardPoints: 40,
        status: "JOINED"
      },
      include: { campaign: { include: { banners: true } } }
    });
  }

  async completeChallenge(user: AuthenticatedUser, campaignId: string) {
    const participation = await (this.prisma as any).challengeParticipation.findFirst({
      where: { userId: user.id, campaignId },
      include: { campaign: true }
    });
    if (!participation) {
      throw new BadRequestException("Challenge must be joined first");
    }

    if (participation.status !== "CLAIMED") {
      await this.rewardsService.awardPoints({
        userId: user.id,
        amountPoints: participation.rewardPoints || 40,
        reason: "CHALLENGE_PARTICIPATION",
        description: `Completed challenge ${participation.challengeName}`,
        referenceKey: `challenge:${campaignId}:${user.id}`
      });
    }

    return (this.prisma as any).challengeParticipation.update({
      where: { id: participation.id },
      data: {
        status: "CLAIMED",
        completedAt: new Date()
      },
      include: { campaign: { include: { banners: true } } }
    });
  }

  async createRating(user: AuthenticatedUser, dto: CreateLookRatingDto) {
    return (this.prisma as any).lookRating.create({
      data: {
        userId: user.id,
        savedLookId: dto.savedLookId ?? null,
        tryOnRequestId: dto.tryOnRequestId ?? null,
        productId: dto.productId ?? null,
        rating: dto.rating,
        comment: dto.comment ?? null
      }
    });
  }

  async createShareEvent(user: AuthenticatedUser, dto: CreateShareEventDto) {
    const rewardReference = `share:${user.id}:${dto.savedLookId ?? "none"}:${dto.tryOnRequestId ?? "none"}:${dto.channel}`;
    await this.rewardsService.awardPoints({
      userId: user.id,
      amountPoints: 10,
      reason: "LOOK_SHARE",
      description: `Shared a look via ${dto.channel}`,
      referenceKey: rewardReference
    });

    return (this.prisma as any).shareEvent.create({
      data: {
        userId: user.id,
        savedLookId: dto.savedLookId ?? null,
        tryOnRequestId: dto.tryOnRequestId ?? null,
        channel: dto.channel,
        rewardGranted: 10
      }
    });
  }

  async trackEvent(user: AuthenticatedUser, dto: TrackAppEventDto) {
    return (this.prisma as any).appEvent.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        eventName: dto.eventName,
        metadata: dto.metadata ?? {}
      }
    });
  }

  async analyticsSummary() {
    const [
      tryOns,
      saves,
      merchantRegistrations,
      eventCounts,
      shareEvents
    ] = await Promise.all([
      (this.prisma as any).tryOnRequest.count(),
      (this.prisma as any).savedLook.count(),
      (this.prisma as any).shop.count({ where: { ownerUserId: { not: null } } }),
      (this.prisma as any).appEvent.groupBy({
        by: ["eventName"],
        where: {
          eventName: {
            in: [
              "affiliate_link_opened",
              "shop_link_opened",
              "share_completed",
              "merchant_registered"
            ]
          }
        },
        _count: { _all: true }
      }),
      (this.prisma as any).shareEvent.count()
    ]);

    const eventCount = (eventName: string) =>
      eventCounts.find((row: any) => row.eventName === eventName)?._count?._all ?? 0;

    return {
      tryOns,
      saves,
      affiliateClicks: eventCount("affiliate_link_opened"),
      shopClicks: eventCount("shop_link_opened"),
      shares: Math.max(shareEvents, eventCount("share_completed")),
      merchantRegistrations: Math.max(merchantRegistrations, eventCount("merchant_registered"))
    };
  }
}

@ApiBearerAuth()
@ApiTags("engagement")
@Controller("engagement")
class EngagementController {
  constructor(private readonly service: EngagementService) {}

  @Get("challenges")
  listChallenges(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listChallenges(user);
  }

  @Get("challenges/participation")
  listParticipation(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.listParticipation(user, userId);
  }

  @Post("challenges/:campaignId/join")
  joinChallenge(@CurrentUser() user: AuthenticatedUser, @Param("campaignId") campaignId: string) {
    return this.service.joinChallenge(user, campaignId);
  }

  @Post("challenges/:campaignId/complete")
  completeChallenge(@CurrentUser() user: AuthenticatedUser, @Param("campaignId") campaignId: string) {
    return this.service.completeChallenge(user, campaignId);
  }

  @Post("look-ratings")
  createRating(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLookRatingDto) {
    return this.service.createRating(user, dto);
  }

  @Post("share-events")
  createShareEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShareEventDto) {
    return this.service.createShareEvent(user, dto);
  }

  @Post("events")
  trackEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: TrackAppEventDto) {
    return this.service.trackEvent(user, dto);
  }

  @Roles("ADMIN", "OPERATOR")
  @Get("analytics-summary")
  analyticsSummary() {
    return this.service.analyticsSummary();
  }
}

@Module({
  imports: [RewardsModule],
  controllers: [EngagementController],
  providers: [EngagementService, PrismaService]
})
export class EngagementModule {}
