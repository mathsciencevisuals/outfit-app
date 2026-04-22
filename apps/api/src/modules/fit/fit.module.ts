import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { computeFit } from "@fitme/fit-engine";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class FitAssessmentDto {
  @IsString()
  userId!: string;

  @IsString()
  productId!: string;
}

@Injectable()
class FitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these fit assessments");

    return this.prisma.fitAssessment.findMany({
      where: { userId: targetUserId },
      include: { product: true, user: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async assess(user: AuthenticatedUser, dto: FitAssessmentDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this fit assessment");

    const latestMeasurement = await this.prisma.measurement.findFirst({
      where: { userId: dto.userId },
      orderBy: { createdAt: "desc" }
    });

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        variants: {
          include: {
            sizeChartEntries: true
          }
        }
      }
    });

    if (!latestMeasurement || !product) {
      return null;
    }

    const sizeRanges = product.variants.flatMap((variant) =>
      variant.sizeChartEntries.map((entry) => ({
        sizeLabel: `${variant.sizeLabel}/${entry.sizeLabel}`,
        chestMinCm: entry.chestMinCm,
        chestMaxCm: entry.chestMaxCm,
        waistMinCm: entry.waistMinCm,
        waistMaxCm: entry.waistMaxCm,
        hipsMinCm: entry.hipsMinCm,
        hipsMaxCm: entry.hipsMaxCm,
        inseamMinCm: entry.inseamMinCm,
        inseamMaxCm: entry.inseamMaxCm
      }))
    );

    const fit = computeFit(latestMeasurement, sizeRanges);
    if (!fit) {
      return null;
    }

    return this.prisma.fitAssessment.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        score: fit.score,
        confidence: fit.confidence,
        verdict: fit.verdict,
        notes: `${fit.sizeLabel}: ${fit.notes}`
      }
    });
  }
}

@ApiBearerAuth()
@ApiTags("fit")
@Controller("fit")
class FitController {
  constructor(private readonly service: FitService) {}

  @Get("assessments")
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post("assessments")
  assess(@CurrentUser() user: AuthenticatedUser, @Body() dto: FitAssessmentDto) {
    return this.service.assess(user, dto);
  }
}

@Module({
  controllers: [FitController],
  providers: [FitService, PrismaService],
  exports: [FitService]
})
export class FitModule {}
