import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { rankProducts } from "@fitme/recommendation-engine";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class GenerateRecommendationsDto {
  @IsString()
  userId!: string;
}

function colorBreakdown(product: {
  baseColor: string;
  secondaryColors: string[];
}, profile: { preferredColors: string[]; avoidedColors: string[] }) {
  const productColors = [product.baseColor, ...product.secondaryColors].filter(Boolean);
  const normalizedPreferred = profile.preferredColors.map((color) => color.toLowerCase());
  const normalizedAvoided = profile.avoidedColors.map((color) => color.toLowerCase());
  const matchingColors = productColors.filter((color) => normalizedPreferred.includes(color.toLowerCase()));
  const incompatibleColors = productColors.filter((color) => normalizedAvoided.includes(color.toLowerCase()));
  return { matchingColors, incompatibleColors };
}

@Injectable()
class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these recommendations");

    const [recommendations, profile] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { userId: targetUserId },
        include: { product: { include: { brand: true, variants: true } } },
        orderBy: [{ rank: "asc" }, { score: "desc" }]
      }),
      (this.prisma.profile as any).findUnique({ where: { userId: targetUserId } })
    ]);

    if (!profile) {
      return recommendations;
    }

    return recommendations.map((recommendation) => {
      const breakdown = colorBreakdown(recommendation.product, profile);
      const explanationParts = [recommendation.explanation];

      if (breakdown.matchingColors.length > 0) {
        explanationParts.push(`Matches your colors: ${breakdown.matchingColors.join(", ")}.`);
      }
      if (breakdown.incompatibleColors.length > 0) {
        explanationParts.push(`Watch for clashes with: ${breakdown.incompatibleColors.join(", ")}.`);
      }

      return {
        ...recommendation,
        matchingColors: breakdown.matchingColors,
        incompatibleColors: breakdown.incompatibleColors,
        explanation: explanationParts.filter(Boolean).join(" ")
      };
    });
  }

  async generate(user: AuthenticatedUser, dto: GenerateRecommendationsDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot generate these recommendations");

    const profile = await (this.prisma.profile as any).findUnique({ where: { userId: dto.userId } });
    const fitAssessments = await this.prisma.fitAssessment.findMany({ where: { userId: dto.userId } });
    const products = await this.prisma.product.findMany({ include: { variants: true, brand: true } });

    if (!profile) {
      return [];
    }

    const fitScores = new Map(fitAssessments.map((assessment) => [assessment.productId, assessment.score]));
    const stylePreference = (profile.stylePreference as Record<string, unknown> | null) ?? {};
    const preferredStyles = Array.isArray(stylePreference.preferredStyles)
      ? (stylePreference.preferredStyles as string[])
      : [];

    const ranked = rankProducts(
      products.map((product) => {
        const breakdown = colorBreakdown(product, profile);
        const fitScore = fitScores.get(product.id) ?? 60;
        const colorBonus = breakdown.matchingColors.length * 8 - breakdown.incompatibleColors.length * 10;

        return {
          productId: product.id,
          styleTags: product.styleTags,
          colors: [product.baseColor, ...product.secondaryColors],
          fitScore: Math.max(20, Math.min(100, fitScore + colorBonus))
        };
      }),
      {
        preferredStyles,
        preferredColors: profile.preferredColors,
        avoidedColors: profile.avoidedColors
      }
    ).slice(0, 10);

    await this.prisma.recommendation.deleteMany({ where: { userId: dto.userId } });

    await this.prisma.recommendation.createMany({
      data: ranked.map((item, index) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const breakdown = colorBreakdown(product, profile);
        const explanation = [
          item.explanation,
          breakdown.matchingColors.length > 0 ? `Strong color affinity with ${breakdown.matchingColors.join(", ")}.` : "",
          breakdown.incompatibleColors.length > 0 ? `Less aligned because of ${breakdown.incompatibleColors.join(", ")}.` : ""
        ]
          .filter(Boolean)
          .join(" ");

        return {
          userId: dto.userId,
          productId: item.productId,
          rank: index + 1,
          score: item.score,
          reason: breakdown.matchingColors.length > 0 ? "COLOR" : index < 4 ? "FIT" : "STYLE",
          explanation
        };
      })
    });

    return this.list(user, dto.userId);
  }
}

@ApiBearerAuth()
@ApiTags("recommendations")
@Controller("recommendations")
class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post("generate")
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateRecommendationsDto) {
    return this.service.generate(user, dto);
  }
}

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, PrismaService],
  exports: [RecommendationsService]
})
export class RecommendationsModule {}
