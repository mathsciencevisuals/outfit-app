import { Body, Controller, Get, Injectable, Module, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";

class ReferralEventDto {
  @IsString()
  eventType!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  referredUserId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

@Injectable()
class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService
  ) {}

  async getCode(user: AuthenticatedUser) {
    const existing = await (this.prisma as any).referralCode.findUnique({
      where: { userId: user.id },
      include: { events: true }
    });

    if (existing) {
      return existing;
    }

    const code = `FIT-${user.id.slice(-5).toUpperCase()}`;
    const created = await (this.prisma as any).referralCode.create({
      data: {
        userId: user.id,
        code
      },
      include: { events: true }
    });

    await (this.prisma as any).referralEvent.create({
      data: {
        referralCodeId: created.id,
        referrerUserId: user.id,
        eventType: "CODE_CREATED",
        rewardPoints: 0
      }
    });

    return created;
  }

  async listEvents(viewer: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? viewer.id;
    this.authorizationService.assertSelfOrPrivileged(viewer, targetUserId, "You cannot view these referral events");
    return (this.prisma as any).referralEvent.findMany({
      where: { referrerUserId: targetUserId },
      include: { referralCode: true, referredUser: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async createEvent(user: AuthenticatedUser, dto: ReferralEventDto) {
    const referralCode = dto.code
      ? await (this.prisma as any).referralCode.findUnique({ where: { code: dto.code } })
      : await this.getCode(user);

    if (!referralCode) {
      throw new Error("Referral code not found");
    }

    const referrerUserId = referralCode.userId;
    const event = await (this.prisma as any).referralEvent.create({
      data: {
        referralCodeId: referralCode.id,
        referrerUserId,
        referredUserId: dto.referredUserId,
        eventType: dto.eventType,
        rewardPoints: dto.eventType === "INVITE_SENT" ? 40 : dto.eventType === "CONVERTED" ? 150 : 0,
        metadata: dto.metadata
      }
    });

    if (dto.eventType === "INVITE_SENT") {
      await this.rewardsService.awardPoints({
        userId: referrerUserId,
        amountPoints: 40,
        reason: "REFERRAL_INVITE",
        description: "Sent a referral invite",
        referenceKey: `referral-invite:${event.id}`
      });
    }

    if (dto.eventType === "CONVERTED") {
      await this.rewardsService.awardPoints({
        userId: referrerUserId,
        amountPoints: 150,
        reason: "REFERRAL_SUCCESS",
        description: "Referral converted into a new student user",
        referenceKey: `referral-success:${event.id}`
      });
    }

    return event;
  }
}

@ApiBearerAuth()
@ApiTags("referrals")
@Controller("referrals")
class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get("code")
  code(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getCode(user);
  }

  @Get("events")
  events(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.referralsService.listEvents(user, userId);
  }

  @Post("events")
  createEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReferralEventDto) {
    return this.referralsService.createEvent(user, dto);
  }
}

@Module({
  imports: [RewardsModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
  exports: [ReferralsService]
})
export class ReferralsModule {}
