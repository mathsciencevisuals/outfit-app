import { Body, Controller, Get, Injectable, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { IsIn, IsOptional, IsString } from "class-validator";

import { Occasion, rankProducts } from "@fitme/recommendation-engine";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";
import { serializeProductCard, representativePriceForProduct, summarizeOffers } from "../catalog/catalog.utils";
import { FitModule, FitService } from "../fit/fit.module";

class RecommendationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  savedLookId?: string;

  @IsOptional()
  @IsIn(["casual", "streetwear", "formal", "college", "interview", "date", "fest"])
  occasion?: Occasion;
}

class AfterTryOnDto {
  @IsString()
  userId!: string;

  @IsString()
  tryOnRequestId!: string;
}

class GenerateRecommendationsDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  savedLookId?: string;

  @IsOptional()
  @IsIn(["casual", "streetwear", "formal", "college", "interview", "date", "fest"])
  occasion?: Occasion;
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

function flattenSavedPreferences(savedLooks: any[]) {
  const styles = new Set<string>();
  const colors = new Set<string>();
  const categories = new Set<string>();

  for (const look of savedLooks) {
    for (const item of look.items ?? []) {
      if (!item.product) {
        continue;
      }
      categories.add(item.product.category);
      for (const tag of item.product.styleTags ?? []) {
        styles.add(tag);
      }
      for (const color of [item.product.baseColor, ...(item.product.secondaryColors ?? [])]) {
        if (color) {
          colors.add(color);
        }
      }
    }
  }

  return {
    styleTags: Array.from(styles),
    colors: Array.from(colors),
    categories: Array.from(categories)
  };
}

function recommendationReasonFromSignals(item: {
  badges?: string[];
  reasons?: string[];
  colorInsight?: { matchingColors?: string[] };
}) {
  if ((item.badges ?? []).includes("Best Fit") || (item.reasons ?? []).some((reason) => reason.includes("fit"))) {
    return "FIT" as const;
  }
  if ((item.colorInsight?.matchingColors?.length ?? 0) > 0) {
    return "COLOR" as const;
  }
  return "STYLE" as const;
}

function buildExplanation(item: {
  reasons?: string[];
  colorInsight?: { explanation?: string };
  budgetLabel?: string;
  fitExplanation?: string | null;
  occasion?: Occasion;
  occasionMatch?: boolean;
  cheaperAlternativeName?: string | null;
}) {
  const lines = [
    (item.reasons ?? []).length > 0 ? `Why it ranks: ${(item.reasons ?? []).join(", ")}.` : null,
    item.fitExplanation ? item.fitExplanation : null,
    item.colorInsight?.explanation ?? null,
    item.budgetLabel && item.budgetLabel !== "Budget open" ? `${item.budgetLabel}.` : null,
    item.occasion && item.occasionMatch ? `This is a strong ${item.occasion} pick.` : null,
    item.cheaperAlternativeName ? `Cheaper alternative available: ${item.cheaperAlternativeName}.` : null
  ].filter(Boolean);

  return lines.join(" ");
}

@Injectable()
class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly fitService: FitService,
    private readonly configService: ConfigService,
  ) {}

  // ── Claude re-ranking ────────────────────────────────────────────────────────
  // Takes top results from the rule engine and re-scores them in one Claude call.
  // Returns original list unchanged if ANTHROPIC_API_KEY is not set.

  private async reRankWithClaude(
    candidates: { productId: string; product: any; score: number; explanation: string }[],
    profile: any,
  ): Promise<{ productId: string; score: number; reason: string }[] | null> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey || candidates.length === 0) return null;

    const budgetRange = profile?.budgetMin != null && profile?.budgetMax != null
      ? `₹${profile.budgetMin}–₹${profile.budgetMax}`
      : profile?.budgetLabel ?? 'open';

    const preferredStyles: string[] = Array.isArray(profile?.stylePreference?.preferredStyles)
      ? profile.stylePreference.preferredStyles
      : [];

    const candidateList = candidates
      .map((c, i) =>
        `${i + 1}. ID:${c.productId} | "${c.product.name}" | ${c.product.category} | ` +
        `₹${c.product.offerSummary?.lowestPrice ?? 0} | Tags: ${(c.product.styleTags ?? []).join(', ')}`
      )
      .join('\n');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are a fashion recommendation AI for Indian college students.

User profile:
- Style preferences: ${preferredStyles.join(', ') || 'not set'}
- Preferred colours: ${(profile?.preferredColors ?? []).join(', ') || 'none'}
- Budget: ${budgetRange}
- Body shape: ${profile?.bodyShape ?? 'not set'}

Score each product below for this user (0–100).
Consider: style compatibility, colour match, occasion fit, Indian fashion context, value for budget.

Products:
${candidateList}

Return ONLY a JSON array — no markdown, no explanation:
[{"productId":"ID","score":85,"reason":"one sentence why"},...]
Sort by score descending. Include all ${candidates.length} products.`,
          }],
        }),
      });

      if (!res.ok) return null;
      const data = await res.json() as { content?: Array<{ text?: string }> };
      const raw = data.content?.[0]?.text ?? '[]';
      try {
        return JSON.parse(raw);
      } catch {
        return JSON.parse(raw.replace(/```json?/g, '').replace(/```/g, '').trim());
      }
    } catch {
      return null;
    }
  }

  private async getContext(userId: string) {
    const [profile, products, savedLooks] = await Promise.all([
      (this.prisma.profile as any).findUnique({ where: { userId } }),
      this.prisma.product.findMany({
        include: {
          brand: true,
          variants: {
            include: {
              sizeChartEntries: true,
              inventoryOffers: { include: { shop: true } }
            }
          }
        }
      }),
      this.prisma.savedLook.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  brand: true,
                  variants: {
                    include: {
                      sizeChartEntries: true,
                      inventoryOffers: { include: { shop: true } }
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    return { profile, products, savedLooks };
  }

  private async buildRecommendations(userId: string, options: RecommendationQueryDto = {}) {
    const { profile, products, savedLooks } = await this.getContext(userId);
    if (!profile) {
      return [];
    }

    const anchorProduct =
      (options.productId
        ? products.find((product) => product.id === options.productId)
        : options.savedLookId
          ? savedLooks.find((look) => look.id === options.savedLookId)?.items?.[0]?.product
          : null) ?? null;

    const savedPreferenceSignals = flattenSavedPreferences(savedLooks);
    const fitPreviewEntries = await Promise.all(
      products.map(async (product) => [product.id, await this.fitService.previewForUserId(userId, product.id)] as const)
    );
    const fitPreviewMap = new Map(fitPreviewEntries);

    const ranked = rankProducts(
      products
        .filter((product) => !anchorProduct || product.id !== anchorProduct.id)
        .map((product) => {
          const serialized = serializeProductCard(product);
          const fitPreview = fitPreviewMap.get(product.id);
          const styleOverlap = serialized.styleTags?.filter((tag: string) => savedPreferenceSignals.styleTags.includes(tag)).length ?? 0;
          const categoryBoost =
            anchorProduct && anchorProduct.category !== product.category
              ? 10
              : anchorProduct && anchorProduct.category === product.category
                ? -6
                : 0;
          const colorBoost = anchorProduct
            ? colorBreakdown(product, {
                preferredColors: [anchorProduct.baseColor, ...(anchorProduct.secondaryColors ?? [])],
                avoidedColors: []
              }).matchingColors.length * 3
            : 0;

          return {
            productId: product.id,
            category: product.category,
            styleTags: product.styleTags,
            colors: [product.baseColor, ...(product.secondaryColors ?? [])],
            price: representativePriceForProduct(product),
            fitScore: fitPreview?.fitScore ?? 48,
            fitConfidenceScore: fitPreview?.confidenceScore ?? 0.3,
            issueCount: fitPreview?.issues?.length ?? 0,
            severeIssueCount: fitPreview?.issues?.filter((issue) => issue.severity === "high").length ?? 0,
            hasRecommendedSize: Boolean(fitPreview?.recommendedSize),
            occasionTags: serialized.occasionTags,
            savedSignal: styleOverlap * 3 + (savedPreferenceSignals.categories.includes(product.category) ? 2 : 0),
            anchorComplementScore: categoryBoost + colorBoost,
            popularityScore: Math.min(
              10,
              summarizeOffers(serialized.variants?.flatMap((variant: any) => variant.inventoryOffers ?? []) ?? []).offerCount
            )
          };
        }),
      {
        preferredStyles: Array.isArray(profile.stylePreference?.preferredStyles)
          ? (profile.stylePreference?.preferredStyles as string[])
          : [],
        preferredColors: profile.preferredColors,
        avoidedColors: profile.avoidedColors,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        occasion: options.occasion ?? null,
        anchorCategory: anchorProduct?.category ?? null,
        anchorColors: anchorProduct ? [anchorProduct.baseColor, ...(anchorProduct.secondaryColors ?? [])] : [],
        savedStyleTags: savedPreferenceSignals.styleTags,
        savedColors: savedPreferenceSignals.colors
      }
    );

    const serializedProducts = new Map(products.map((product) => [product.id, serializeProductCard(product)]));

    const baseResults = ranked.slice(0, 12).map((item, index) => {
      const product = serializedProducts.get(item.productId)!;
      const fitPreview = fitPreviewMap.get(item.productId) ?? null;
      const breakdown = colorBreakdown(product, profile);
      const sameCategoryCheaper = products
        .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
        .map((candidate) => serializeProductCard(candidate))
        .filter(
          (candidate) =>
            candidate.offerSummary?.lowestPrice != null &&
            product.offerSummary?.lowestPrice != null &&
            candidate.offerSummary.lowestPrice < product.offerSummary.lowestPrice
        )
        .sort((left, right) => (left.offerSummary?.lowestPrice ?? 0) - (right.offerSummary?.lowestPrice ?? 0))[0] ?? null;

      return {
        id: `${userId}-${item.productId}-${index + 1}`,
        productId: item.productId,
        product,
        score: item.score,
        explanation: buildExplanation({
          reasons: item.reasons,
          colorInsight: item.colorInsight,
          budgetLabel: item.budgetLabel,
          fitExplanation: fitPreview?.explanation ?? null,
          occasion: options.occasion,
          occasionMatch: item.occasionMatch,
          cheaperAlternativeName: sameCategoryCheaper?.name ?? null
        }),
        matchingColors: item.colorInsight.matchingColors,
        complementaryColors: item.colorInsight.complementaryColors,
        incompatibleColors: item.colorInsight.poorMatches.length > 0 ? item.colorInsight.poorMatches : breakdown.incompatibleColors,
        fitResult: fitPreview,
        bestSizeLabel: fitPreview?.recommendedSize ?? null,
        bestFitLabel: fitPreview?.fitLabel ?? null,
        fitWarning: fitPreview?.issues?.[0]?.message ?? null,
        reasonTags: item.reasons,
        rankingBadges: item.badges,
        occasionTags: product.occasionTags,
        budgetLabel: item.budgetLabel,
        colorInsight: item.colorInsight,
        offerSummary: product.offerSummary,
        cheaperAlternative: sameCategoryCheaper
      };
    });

    // Re-rank with Claude if API key is available
    const claudeScores = await this.reRankWithClaude(baseResults, profile);
    if (!claudeScores) return baseResults;

    const scoreMap = new Map(claudeScores.map(s => [s.productId, s]));
    return [...baseResults]
      .sort((a, b) => (scoreMap.get(b.productId)?.score ?? b.score) - (scoreMap.get(a.productId)?.score ?? a.score))
      .map(item => {
        const claudeItem = scoreMap.get(item.productId);
        if (!claudeItem) return item;
        return {
          ...item,
          score: claudeItem.score,
          explanation: claudeItem.reason || item.explanation,
        };
      });
  }

  async list(user: AuthenticatedUser, query: RecommendationQueryDto) {
    const targetUserId = query.userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these recommendations");
    return this.buildRecommendations(targetUserId, query);
  }

  async afterTryOn(user: AuthenticatedUser, dto: AfterTryOnDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot get these recommendations");

    const tryOnRequest = await (this.prisma.tryOnRequest as any).findUnique({
      where: { id: dto.tryOnRequestId },
      include: { variant: { include: { product: true } } },
    });

    const productId: string | undefined = tryOnRequest?.variant?.product?.id;
    return this.buildRecommendations(dto.userId, { productId });
  }

  async generate(user: AuthenticatedUser, dto: GenerateRecommendationsDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot generate these recommendations");

    const ranked = await this.buildRecommendations(dto.userId, dto);
    await this.prisma.recommendation.deleteMany({ where: { userId: dto.userId } });
    await this.prisma.recommendation.createMany({
      data: ranked.slice(0, 10).map((item, index) => ({
        userId: dto.userId,
        productId: item.productId,
        rank: index + 1,
        score: item.score,
        reason: recommendationReasonFromSignals(item),
        explanation: item.explanation ?? ""
      }))
    });

    return ranked;
  }
}

@ApiBearerAuth()
@ApiTags("recommendations")
@Controller("recommendations")
class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: RecommendationQueryDto) {
    return this.service.list(user, query);
  }

  @Post("generate")
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateRecommendationsDto) {
    return this.service.generate(user, dto);
  }

  @Post("after-tryon")
  afterTryOn(@CurrentUser() user: AuthenticatedUser, @Body() dto: AfterTryOnDto) {
    return this.service.afterTryOn(user, dto);
  }
}

@Module({
  imports: [FitModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, PrismaService, ConfigService],
  exports: [RecommendationsService]
})
export class RecommendationsModule {}
