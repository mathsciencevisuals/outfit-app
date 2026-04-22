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

@Injectable()
class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these recommendations");

    return this.prisma.recommendation.findMany({
      where: { userId: targetUserId },
      include: { product: { include: { brand: true, variants: true } } },
      orderBy: [{ rank: "asc" }, { score: "desc" }]
    });
  }

  async generate(user: AuthenticatedUser, dto: GenerateRecommendationsDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot generate these recommendations");

    const profile = await this.prisma.profile.findUnique({ where: { userId: dto.userId } });
    const fitAssessments = await this.prisma.fitAssessment.findMany({ where: { userId: dto.userId } });
    const products = await this.prisma.product.findMany({ include: { variants: true } });

    if (!profile) {
      return [];
    }

    const fitScores = new Map(fitAssessments.map((assessment) => [assessment.productId, assessment.score]));
    const stylePreference = (profile.stylePreference as Record<string, unknown> | null) ?? {};
    const preferredStyles = Array.isArray(stylePreference.preferredStyles)
      ? (stylePreference.preferredStyles as string[])
      : [];

    const ranked = rankProducts(
      products.map((product) => ({
        productId: product.id,
        styleTags: product.styleTags,
        colors: [product.baseColor, ...product.secondaryColors],
        fitScore: fitScores.get(product.id) ?? 60
      })),
      {
        preferredStyles,
        preferredColors: profile.preferredColors,
        avoidedColors: profile.avoidedColors
      }
    ).slice(0, 10);

    await this.prisma.recommendation.deleteMany({ where: { userId: dto.userId } });

    await this.prisma.recommendation.createMany({
      data: ranked.map((item, index) => ({
        userId: dto.userId,
        productId: item.productId,
        rank: index + 1,
        score: item.score,
        reason: index < 4 ? "FIT" : index < 7 ? "STYLE" : "COLOR",
        explanation: item.explanation
      }))
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
