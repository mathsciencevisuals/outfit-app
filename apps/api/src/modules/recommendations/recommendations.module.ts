import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { rankProducts } from "@fitme/recommendation-engine";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";
import { FitModule, FitService } from "../fit/fit.module";

class GenerateRecommendationsDto {
  @IsString()
  userId!: string;
}

function colorBreakdown(
  product: {
    baseColor: string;
    secondaryColors: string[];
  },
  profile: { preferredColors: string[]; avoidedColors: string[] }
) {
  const productColors = [product.baseColor, ...product.secondaryColors].filter(Boolean);
  const normalizedPreferred = profile.preferredColors.map((color) => color.toLowerCase());
  const normalizedAvoided = profile.avoidedColors.map((color) => color.toLowerCase());
  const matchingColors = productColors.filter((color) => normalizedPreferred.includes(color.toLowerCase()));
  const incompatibleColors = productColors.filter((color) => normalizedAvoided.includes(color.toLowerCase()));
  return { matchingColors, incompatibleColors };
}

function recommendationReasonFromFit(
  fitPreview:
    | {
        fitScore?: number;
        confidenceScore?: number;
        issues?: Array<{ severity?: string }>;
      }
    | null
    | undefined
) {
  if (!fitPreview) {
    return "STYLE";
  }

  const highIssues = (fitPreview.issues ?? []).filter((issue) => issue.severity === "high").length;
  if ((fitPreview.fitScore ?? 0) >= 82 && (fitPreview.confidenceScore ?? 0) >= 0.7 && highIssues === 0) {
    return "FIT";
  }

  return null;
}

@Injectable()
class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly fitService: FitService
  ) {}

  async list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these recommendations");

    const [recommendations, profile] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { userId: targetUserId },
        include: {
          product: {
            include: {
              brand: true,
              variants: { include: { sizeChartEntries: true, inventoryOffers: { include: { shop: true } } } }
            }
          }
        },
        orderBy: [{ rank: "asc" }, { score: "desc" }]
      }),
      (this.prisma.profile as any).findUnique({ where: { userId: targetUserId } })
    ]);

    if (!profile) {
      return recommendations;
    }

    const fitPreviewEntries = await Promise.all(
      recommendations.map(async (recommendation) => [
        recommendation.productId,
        await this.fitService.previewForUserId(targetUserId, recommendation.productId)
      ] as const)
    );
    const fitPreviewMap = new Map(fitPreviewEntries);

    return recommendations.map((recommendation) => {
      const breakdown = colorBreakdown(recommendation.product, profile);
      const fitPreview = fitPreviewMap.get(recommendation.productId) ?? null;
      const explanationParts = [recommendation.explanation];

      if (fitPreview?.recommendedSize) {
        explanationParts.push(
          `Best size ${fitPreview.recommendedSize} with ${Math.round(fitPreview.confidenceScore * 100)}% confidence.`
        );
      }
      if (fitPreview?.issues?.length) {
        explanationParts.push(`Main watchout: ${fitPreview.issues[0]?.message}`);
      }
      if (breakdown.matchingColors.length > 0) {
        explanationParts.push(`Matches your colors: ${breakdown.matchingColors.join(", ")}.`);
      }
      if (breakdown.incompatibleColors.length > 0) {
        explanationParts.push(`Watch for clashes with: ${breakdown.incompatibleColors.join(", ")}.`);
      }

      return {
        ...recommendation,
        fitResult: fitPreview,
        bestSizeLabel: fitPreview?.recommendedSize ?? null,
        bestFitLabel: fitPreview?.fitLabel ?? null,
        fitWarning: fitPreview?.issues?.[0]?.message ?? null,
        matchingColors: breakdown.matchingColors,
        incompatibleColors: breakdown.incompatibleColors,
        explanation: explanationParts.filter(Boolean).join(" ")
      };
    });
  }

  async generate(user: AuthenticatedUser, dto: GenerateRecommendationsDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot generate these recommendations");

    const [profile, products] = await Promise.all([
      (this.prisma.profile as any).findUnique({ where: { userId: dto.userId } }),
      this.prisma.product.findMany({
        include: {
          variants: { include: { sizeChartEntries: true } },
          brand: true
        }
      })
    ]);

    if (!profile) {
      return [];
    }

    const stylePreference = (profile.stylePreference as Record<string, unknown> | null) ?? {};
    const preferredStyles = Array.isArray(stylePreference.preferredStyles)
      ? (stylePreference.preferredStyles as string[])
      : [];

    const fitPreviewEntries = await Promise.all(
      products.map(async (product) => [product.id, await this.fitService.previewForUserId(dto.userId, product.id)] as const)
    );
    const fitPreviewMap = new Map(fitPreviewEntries);

    const ranked = rankProducts(
      products.map((product) => {
        const breakdown = colorBreakdown(product, profile);
        const fitPreview = fitPreviewMap.get(product.id);
        const colorBonus = breakdown.matchingColors.length * 6 - breakdown.incompatibleColors.length * 12;

        return {
          productId: product.id,
          styleTags: product.styleTags,
          colors: [product.baseColor, ...product.secondaryColors],
          fitScore: Math.max(16, Math.min(100, (fitPreview?.fitScore ?? 48) + colorBonus)),
          fitConfidenceScore: fitPreview?.confidenceScore ?? 0.3,
          issueCount: fitPreview?.issues?.length ?? 0,
          severeIssueCount: fitPreview?.issues?.filter((issue) => issue.severity === "high").length ?? 0,
          hasRecommendedSize: Boolean(fitPreview?.recommendedSize)
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
        const fitPreview = fitPreviewMap.get(item.productId);
        const breakdown = colorBreakdown(product, profile);
        const fitReason = recommendationReasonFromFit(fitPreview);
        const explanation = [
          item.explanation,
          fitPreview?.recommendedSize
            ? `Recommended size ${fitPreview.recommendedSize} with ${Math.round((fitPreview.confidenceScore ?? 0) * 100)}% confidence.`
            : "Structured size guidance is still limited for this item.",
          fitPreview?.explanation ?? "",
          fitPreview?.issues?.length ? `Main watchout: ${fitPreview.issues[0]?.message}` : "",
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
          reason: fitReason ?? (breakdown.matchingColors.length > 0 ? "COLOR" : "STYLE"),
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
  imports: [FitModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, PrismaService],
  exports: [RecommendationsService]
})
export class RecommendationsModule {}
