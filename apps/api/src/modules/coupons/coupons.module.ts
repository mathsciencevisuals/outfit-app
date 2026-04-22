import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";

class UpsertCouponDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type!: string;

  @IsInt()
  discountValue!: number;

  @IsOptional()
  @IsInt()
  rewardCostPoints?: number;

  @IsOptional()
  @IsInt()
  unlockThreshold?: number;

  @IsOptional()
  @IsInt()
  minSpend?: number;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;
}

function parseDate(value?: string) {
  return value ? new Date(value) : null;
}

@Injectable()
class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService
  ) {}

  async list(user: AuthenticatedUser) {
    const now = new Date();
    return (this.prisma as any).coupon.findMany({
      where: this.authorizationService.isPrivileged(user)
        ? undefined
        : {
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
          },
      include: {
        campaign: true,
        redemptions: this.authorizationService.isPrivileged(user)
          ? true
          : {
              where: { userId: user.id }
            }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  listRedemptions(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot access these coupon redemptions");

    return (this.prisma as any).couponRedemption.findMany({
      where: { userId: targetUserId },
      include: { coupon: { include: { campaign: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async unlock(user: AuthenticatedUser, couponId: string) {
    const coupon = await (this.prisma as any).coupon.findUnique({ where: { id: couponId } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException("Coupon is not available");
    }

    const existing = await (this.prisma as any).couponRedemption.findFirst({
      where: { couponId, userId: user.id }
    });
    if (existing) {
      return existing;
    }

    const wallet = await this.rewardsService.getWallet(user);
    if (coupon.unlockThreshold && wallet.balancePoints < coupon.unlockThreshold) {
      throw new BadRequestException("Reward threshold not reached for this coupon");
    }

    let pointsSpent = 0;
    if (coupon.rewardCostPoints && coupon.rewardCostPoints > 0) {
      pointsSpent = coupon.rewardCostPoints;
      await this.rewardsService.spendPoints({
        userId: user.id,
        amountPoints: pointsSpent,
        reason: "COUPON_UNLOCK",
        description: `Unlocked coupon ${coupon.code}`,
        referenceKey: `coupon:unlock:${coupon.id}:${user.id}`
      });
    }

    return (this.prisma as any).couponRedemption.create({
      data: {
        couponId,
        userId: user.id,
        walletId: wallet.id,
        status: "UNLOCKED",
        pointsSpent
      },
      include: { coupon: true }
    });
  }

  async redeem(user: AuthenticatedUser, couponId: string) {
    const redemption = await (this.prisma as any).couponRedemption.findFirst({
      where: { couponId, userId: user.id },
      include: { coupon: true }
    });

    if (!redemption) {
      throw new BadRequestException("Coupon must be unlocked before redemption");
    }

    if (redemption.status === "REDEEMED") {
      return redemption;
    }

    await this.rewardsService.awardPoints({
      userId: user.id,
      amountPoints: 0,
      reason: "COUPON_REDEEM",
      description: `Redeemed coupon ${redemption.coupon.code}`,
      referenceKey: `coupon:redeem:${couponId}:${user.id}`
    });

    return (this.prisma as any).couponRedemption.update({
      where: { id: redemption.id },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date()
      },
      include: { coupon: { include: { campaign: true } } }
    });
  }

  async upsert(user: AuthenticatedUser, id: string | null, dto: UpsertCouponDto) {
    this.authorizationService.assertRoles(user, ["ADMIN", "OPERATOR"], "You cannot manage coupons");

    const data = {
      campaignId: dto.campaignId ?? null,
      code: dto.code,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type as any,
      discountValue: dto.discountValue,
      rewardCostPoints: dto.rewardCostPoints ?? null,
      unlockThreshold: dto.unlockThreshold ?? null,
      minSpend: dto.minSpend ?? null,
      isActive: dto.isActive,
      startsAt: parseDate(dto.startsAt),
      endsAt: parseDate(dto.endsAt)
    };

    if (!id) {
      return (this.prisma as any).coupon.create({
        data,
        include: { campaign: true, redemptions: true }
      });
    }

    return (this.prisma as any).coupon.update({
      where: { id },
      data,
      include: { campaign: true, redemptions: true }
    });
  }
}

@ApiBearerAuth()
@ApiTags("coupons")
@Controller("coupons")
class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get("redemptions")
  listRedemptions(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.listRedemptions(user, userId);
  }

  @Post(":id/unlock")
  unlock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.unlock(user, id);
  }

  @Post(":id/redeem")
  redeem(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.redeem(user, id);
  }

  @Roles("ADMIN", "OPERATOR")
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertCouponDto) {
    return this.service.upsert(user, null, dto);
  }

  @Roles("ADMIN", "OPERATOR")
  @Put(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpsertCouponDto) {
    return this.service.upsert(user, id, dto);
  }
}

@Module({
  imports: [RewardsModule],
  controllers: [CouponsController],
  providers: [CouponsService, PrismaService]
})
export class CouponsModule {}
