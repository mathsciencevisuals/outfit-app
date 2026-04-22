import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";

class RewardAdjustmentDto {
  @IsString()
  userId!: string;

  @IsInt()
  @Min(1)
  amountPoints!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async getWallet(viewer: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? viewer.id;
    this.authorizationService.assertSelfOrPrivileged(viewer, targetUserId, "You cannot view this rewards wallet");
    return this.ensureWallet(targetUserId);
  }

  async listTransactions(viewer: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? viewer.id;
    this.authorizationService.assertSelfOrPrivileged(viewer, targetUserId, "You cannot view these reward transactions");
    const wallet = await this.ensureWallet(targetUserId);
    return (this.prisma as any).rewardTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async adminAdjust(dto: RewardAdjustmentDto) {
    return this.awardPoints({
      userId: dto.userId,
      amountPoints: dto.amountPoints,
      reason: "ADMIN_ADJUSTMENT",
      description: dto.description,
      metadata: dto.metadata,
      referenceKey: `admin-adjust:${dto.userId}:${Date.now()}`
    });
  }

  async awardPoints(input: {
    userId: string;
    amountPoints: number;
    reason: string;
    description: string;
    referenceKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (input.referenceKey) {
      const existing = await (this.prisma as any).rewardTransaction.findUnique({
        where: { referenceKey: input.referenceKey }
      });
      if (existing) {
        return existing;
      }
    }

    const wallet = await this.ensureWallet(input.userId);
    const balanceAfter = wallet.balancePoints + input.amountPoints;
    const updatedWallet = await (this.prisma as any).rewardWallet.update({
      where: { id: wallet.id },
      data: {
        balancePoints: balanceAfter,
        lifetimeEarned: wallet.lifetimeEarned + input.amountPoints,
        tierLabel: this.resolveTier(balanceAfter)
      }
    });

    const transaction = await (this.prisma as any).rewardTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: "EARN",
        reason: input.reason,
        amountPoints: input.amountPoints,
        balanceAfter,
        description: input.description,
        referenceKey: input.referenceKey,
        metadata: input.metadata
      }
    });

    return { wallet: updatedWallet, transaction };
  }

  async spendPoints(input: {
    userId: string;
    amountPoints: number;
    reason: string;
    description: string;
    referenceKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (input.referenceKey) {
      const existing = await (this.prisma as any).rewardTransaction.findUnique({
        where: { referenceKey: input.referenceKey }
      });
      if (existing) {
        return existing;
      }
    }

    const wallet = await this.ensureWallet(input.userId);
    if (wallet.balancePoints < input.amountPoints) {
      throw new Error("Not enough reward points");
    }

    const balanceAfter = wallet.balancePoints - input.amountPoints;
    const updatedWallet = await (this.prisma as any).rewardWallet.update({
      where: { id: wallet.id },
      data: {
        balancePoints: balanceAfter,
        lifetimeSpent: wallet.lifetimeSpent + input.amountPoints,
        tierLabel: this.resolveTier(balanceAfter)
      }
    });

    const transaction = await (this.prisma as any).rewardTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: "SPEND",
        reason: input.reason,
        amountPoints: input.amountPoints,
        balanceAfter,
        description: input.description,
        referenceKey: input.referenceKey,
        metadata: input.metadata
      }
    });

    return { wallet: updatedWallet, transaction };
  }

  async awardFirstTryOn(userId: string) {
    const count = await (this.prisma as any).tryOnRequest.count({ where: { userId } });
    if (count !== 1) {
      return null;
    }

    return this.awardPoints({
      userId,
      amountPoints: 120,
      reason: "FIRST_TRY_ON",
      description: "First try-on completed reward",
      referenceKey: `first-try-on:${userId}`
    });
  }

  async awardProfileCompletion(userId: string) {
    return this.awardPoints({
      userId,
      amountPoints: 80,
      reason: "PROFILE_COMPLETE",
      description: "Completed profile essentials",
      referenceKey: `profile-complete:${userId}`
    });
  }

  private async ensureWallet(userId: string) {
    const existing = await (this.prisma as any).rewardWallet.findUnique({
      where: { userId }
    });

    if (existing) {
      return existing;
    }

    return (this.prisma as any).rewardWallet.create({
      data: {
        userId
      }
    });
  }

  private resolveTier(balance: number) {
    if (balance >= 1000) {
      return "Campus Icon";
    }
    if (balance >= 500) {
      return "Trendsetter";
    }
    if (balance >= 200) {
      return "Insider";
    }
    return "Starter";
  }
}

@ApiBearerAuth()
@ApiTags("rewards")
@Controller("rewards")
class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get("wallet")
  wallet(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.rewardsService.getWallet(user, userId);
  }

  @Get("transactions")
  transactions(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.rewardsService.listTransactions(user, userId);
  }

  @Roles("ADMIN", "OPERATOR")
  @Post("transactions/adjust")
  adjust(@Body() dto: RewardAdjustmentDto) {
    return this.rewardsService.adminAdjust(dto);
  }
}

@Module({
  controllers: [RewardsController],
  providers: [RewardsService, PrismaService],
  exports: [RewardsService]
})
export class RewardsModule {}
