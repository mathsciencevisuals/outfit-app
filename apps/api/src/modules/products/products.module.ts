import { Body, Controller, Get, Injectable, Module, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { inferOccasionTags, representativePriceForProduct, serializeProductCard } from "../catalog/catalog.utils";
import { FitModule, FitService } from "../fit/fit.module";
import { SocialModule, SocialService } from "../social/social.module";

class VariantDto {
  @IsString()
  sku!: string;

  @IsString()
  sizeLabel!: string;

  @IsString()
  color!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class ProductDto {
  @IsString()
  brandId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;

  @IsString()
  baseColor!: string;

  @IsArray()
  secondaryColors!: string[];

  @IsArray()
  materials!: string[];

  @IsArray()
  styleTags!: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}

type TrendSource = "pinterest" | "internal" | "hybrid" | "affiliate";

type PersonalizedTrendItem = {
  name: string;
  score: number;
  source: TrendSource;
  image: string | null;
  cta: string;
  reasons: string[];
  recommendationReasons?: string[];
  product: any;
};

type PersonalizedTrendingResponse = {
  trendingForYou: PersonalizedTrendItem[];
  popularInApp: PersonalizedTrendItem[];
  globalTrends: PersonalizedTrendItem[];
};

const TREND_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const trendCache = new Map<string, { expiresAt: number; data: PersonalizedTrendingResponse }>();
const discoverFeedCache = new Map<string, { expiresAt: number; data: DiscoverFeedResponse }>();

type DiscoverFeedResponse = {
  forYou: PersonalizedTrendItem[];
  trendingForYou: PersonalizedTrendItem[];
  popularNearYou: PersonalizedTrendItem[];
  underYourBudget: PersonalizedTrendItem[];
  recentlySavedInspired: PersonalizedTrendItem[];
  fallbackUsed: boolean;
  cachedAt: string;
};

function normalizedToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedTokens(values: unknown[]) {
  return Array.from(new Set(values.map(normalizedToken).filter(Boolean)));
}

function extractStyleStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  return [
    ...extractStyleStrings(record.preferredStyles),
    ...extractStyleStrings(record.styles),
    ...extractStyleStrings(record.vibes),
    ...extractStyleStrings(record.occasions)
  ];
}

function productTokens(product: any) {
  return normalizedTokens([
    product.name,
    product.category,
    product.baseColor,
    ...(product.secondaryColors ?? []),
    ...(product.styleTags ?? []),
    ...inferOccasionTags(product)
  ]);
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}

function trendImage(product: any) {
  return product.imageUrl ?? product.variants?.[0]?.imageUrl ?? null;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

@Injectable()
class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialService: SocialService
  ) {}

  list(category?: string) {
    return this.prisma.product.findMany({
      where: category ? { category } : undefined,
      include: {
        brand: true,
        variants: {
          include: {
            inventoryOffers: { include: { shop: true } },
            sizeChartEntries: true
          }
        }
      }
    });
  }

  trending(limit: number) {
    return this.prisma.product.findMany({
      orderBy: [{ lookRatings: { _count: "desc" } }, { createdAt: "desc" }],
      include: {
        brand: true,
        variants: {
          include: {
            inventoryOffers: { include: { shop: true } },
            sizeChartEntries: true
          }
        }
      },
      take: limit
    });
  }

  async personalizedTrending(userId: string, limit: number): Promise<PersonalizedTrendingResponse> {
    const cacheKey = `${userId}:${limit}`;
    const cached = trendCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const empty: PersonalizedTrendingResponse = { trendingForYou: [], popularInApp: [], globalTrends: [] };

    let tryOnRequestsResult: any[] = [];
    try {
      tryOnRequestsResult = await (this.prisma.tryOnRequest as any).findMany({
        where: { userId },
        include: { variant: { include: { product: true } } },
        orderBy: { requestedAt: "desc" },
        take: 25
      });
    } catch {
      // tryOnRequest relation may not be available; continue with no try-on history
    }

    let profile: any = null;
    let savedLooks: any[] = [];
    let products: any[] = [];
    let pins: any[] = [];
    try {
      [profile, savedLooks, products, pins] = await Promise.all([
        this.prisma.profile.findUnique({ where: { userId } }),
        this.prisma.savedLook.findMany({
          where: { userId },
          include: { items: { include: { product: true } } },
          orderBy: { updatedAt: "desc" },
          take: 25
        }),
        this.prisma.product.findMany({
          include: {
            brand: true,
            variants: {
              include: {
                inventoryOffers: { include: { shop: true } },
                sizeChartEntries: true,
                _count: { select: { tryOnRequests: true } }
              }
            },
            _count: { select: { savedLookItems: true, lookRatings: true } }
          }
        }),
        this.socialService.getTrendSignals(Math.max(limit, 8))
      ]);
    } catch (err) {
      console.error("[FitMe] personalizedTrending data fetch failed:", err);
      return empty;
    }

    const savedProducts = savedLooks.flatMap((look) => look.items.map((item: any) => item.product));
    const triedProducts = tryOnRequestsResult.map((request: any) => request.variant?.product).filter(Boolean);
    const userStyles = normalizedTokens([
      ...extractStyleStrings(profile?.stylePreference),
      ...savedProducts.flatMap((product) => product.styleTags ?? []),
      ...triedProducts.flatMap((product: any) => product.styleTags ?? [])
    ]);
    const userColors = normalizedTokens([
      ...(profile?.preferredColors ?? []),
      ...savedProducts.flatMap((product) => [product.baseColor, ...(product.secondaryColors ?? [])]),
      ...triedProducts.flatMap((product: any) => [product.baseColor, ...(product.secondaryColors ?? [])])
    ]);
    const userCategories = normalizedTokens([
      ...savedProducts.map((product) => product.category),
      ...triedProducts.map((product: any) => product.category)
    ]);
    const hasUserSignals = userStyles.length > 0 || userColors.length > 0 || userCategories.length > 0;

    const pinText = pins
      .map((pin) => `${pin.title} ${pin.description} ${pin.boardName}`)
      .join(" ")
      .toLowerCase();
    const maxInternal = Math.max(
      1,
      ...products.map((product: any) =>
        (product._count?.savedLookItems ?? 0) +
        (product._count?.lookRatings ?? 0) +
        (product.variants ?? []).reduce((sum: number, variant: any) => sum + (variant._count?.tryOnRequests ?? 0), 0)
      )
    );

    const ranked = products
      .map((product: any) => {
        const tokens = productTokens(product);
        const styleHits = overlapCount(tokens, userStyles);
        const colorHits = overlapCount(tokens, userColors);
        const categoryHits = userCategories.includes(normalizedToken(product.category)) ? 1 : 0;
        const internalCount =
          (product._count?.savedLookItems ?? 0) +
          (product._count?.lookRatings ?? 0) +
          (product.variants ?? []).reduce((sum: number, variant: any) => sum + (variant._count?.tryOnRequests ?? 0), 0);
        const pinHits = tokens.filter((token) => pinText.includes(token)).length;
        const popularityScore = Math.min(20, Math.round((internalCount / maxInternal) * 14) + Math.min(6, pinHits * 2));
        const score = clampScore(
          Math.min(40, styleHits * 18) +
          Math.min(20, colorHits * 10) +
          (categoryHits ? 20 : 0) +
          popularityScore
        );
        const source: TrendSource =
          internalCount > 0 && pinHits > 0 ? "hybrid" :
          internalCount > 0 ? "internal" :
          pinHits > 0 ? "pinterest" : "internal";
        const reasons = [
          styleHits > 0 ? "Matches your saved style signals" : null,
          colorHits > 0 ? "Fits your preferred color palette" : null,
          categoryHits > 0 ? "Similar to items you saved or tried on" : null,
          internalCount > 0 ? "Popular with Outfit App users" : null,
          pinHits > 0 ? "Aligned with Pinterest trend seeds" : null
        ].filter(Boolean) as string[];
        const serialized = serializeProductCard(product);

        return {
          name: product.name,
          score: hasUserSignals ? score : clampScore(popularityScore),
          source,
          image: trendImage(serialized),
          cta: "Try this look",
          reasons: reasons.length ? reasons : ["Trending from current product activity"],
          recommendationReasons: [
            ...(reasons.length ? reasons : ["Trending on Pinterest"]),
            serialized.offerSummary?.offerCount > 0 ? "Available nearby" : null,
            serialized.offerSummary?.lowestPrice != null ? "Best price found" : null
          ].filter((reason): reason is string => Boolean(reason)),
          product: serialized
        };
      })
      .sort((left, right) => right.score - left.score);

    const popularInApp = [...ranked]
      .filter((item) => item.source === "internal" || item.source === "hybrid")
      .slice(0, limit);
    const globalTrends = [...ranked]
      .sort((left, right) => {
        const leftInternal =
          (left.product._count?.savedLookItems ?? 0) +
          (left.product._count?.lookRatings ?? 0);
        const rightInternal =
          (right.product._count?.savedLookItems ?? 0) +
          (right.product._count?.lookRatings ?? 0);
        return rightInternal - leftInternal || right.score - left.score;
      })
      .slice(0, limit);

    const data = {
      trendingForYou: hasUserSignals ? ranked.slice(0, limit) : [],
      popularInApp: popularInApp.length ? popularInApp : ranked.slice(0, limit),
      globalTrends: globalTrends.length ? globalTrends : ranked.slice(0, limit)
    };

    trendCache.set(cacheKey, { expiresAt: Date.now() + TREND_CACHE_TTL_MS, data });
    return data;
  }

  async discoverFeed(userId: string, limit: number): Promise<DiscoverFeedResponse> {
    const cacheKey = `${userId}:${limit}`;
    const cached = discoverFeedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const now = new Date().toISOString();
    const [profileResult, savedLooksResult, tryOnRequestsResult, productsResult, pins] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }).catch(() => null),
      this.prisma.savedLook.findMany({
        where: { userId },
        include: { items: { include: { product: true } } },
        orderBy: { updatedAt: "desc" },
        take: 25
      }).catch(() => []),
      (this.prisma.tryOnRequest as any).findMany({
        where: { userId },
        include: { variant: { include: { product: true } } },
        orderBy: { requestedAt: "desc" },
        take: 25
      }).catch(() => []),
      this.prisma.product.findMany({
        include: {
          brand: true,
          variants: {
            include: {
              inventoryOffers: { include: { shop: true } },
              sizeChartEntries: true,
              _count: { select: { tryOnRequests: true } }
            }
          },
          _count: { select: { savedLookItems: true, lookRatings: true } }
        }
      }).catch(() => []),
      withTimeout(this.socialService.getTrendSignals(Math.max(limit, 8)), 1200, [] as any[])
    ]);

    const profile: any = profileResult;
    const savedLooks: any[] = savedLooksResult as any[];
    const tryOnRequests: any[] = tryOnRequestsResult as any[];
    const products: any[] = productsResult as any[];
    const savedProducts = savedLooks.flatMap((look) => look.items.map((item: any) => item.product).filter(Boolean));
    const triedProducts = tryOnRequests.map((request) => request.variant?.product).filter(Boolean);
    const userStyles = normalizedTokens([
      ...extractStyleStrings(profile?.stylePreference),
      ...savedProducts.flatMap((product) => product.styleTags ?? []),
      ...triedProducts.flatMap((product) => product.styleTags ?? [])
    ]);
    const userColors = normalizedTokens([
      ...(profile?.preferredColors ?? []),
      ...savedProducts.flatMap((product) => [product.baseColor, ...(product.secondaryColors ?? [])]),
      ...triedProducts.flatMap((product) => [product.baseColor, ...(product.secondaryColors ?? [])])
    ]);
    const savedCategories = normalizedTokens(savedProducts.map((product) => product.category));
    const triedCategories = normalizedTokens(triedProducts.map((product) => product.category));
    const userCategories = normalizedTokens([...savedCategories, ...triedCategories]);
    const hasUserSignals = userStyles.length > 0 || userColors.length > 0 || userCategories.length > 0;
    const pinText = pins.map((pin: any) => `${pin.title} ${pin.description} ${pin.boardName}`).join(" ").toLowerCase();
    const maxInternal = Math.max(
      1,
      ...products.map((product: any) =>
        (product._count?.savedLookItems ?? 0) +
        (product._count?.lookRatings ?? 0) +
        (product.variants ?? []).reduce((sum: number, variant: any) => sum + (variant._count?.tryOnRequests ?? 0), 0)
      )
    );

    const ranked = products
      .map((product) => {
        const serialized = serializeProductCard(product);
        const tokens = productTokens(product);
        const styleHits = overlapCount(tokens, userStyles);
        const colorHits = overlapCount(tokens, userColors);
        const savedCategoryHit = savedCategories.includes(normalizedToken(product.category));
        const triedCategoryHit = triedCategories.includes(normalizedToken(product.category));
        const internalCount =
          (product._count?.savedLookItems ?? 0) +
          (product._count?.lookRatings ?? 0) +
          (product.variants ?? []).reduce((sum: number, variant: any) => sum + (variant._count?.tryOnRequests ?? 0), 0);
        const pinHits = tokens.filter((token) => pinText.includes(token)).length;
        const offerSummary = serialized.offerSummary;
        const price = offerSummary?.lowestPrice ?? representativePriceForProduct(serialized);
        const withinBudget =
          profile?.budgetMax != null ? price <= profile.budgetMax :
          profile?.budgetMin != null ? price >= profile.budgetMin :
          false;
        const popularityScore = Math.min(20, Math.round((internalCount / maxInternal) * 14) + Math.min(6, pinHits * 2));
        const source: TrendSource =
          internalCount > 0 && pinHits > 0 ? "hybrid" :
          pinHits > 0 ? "pinterest" :
          internalCount > 0 ? "internal" :
          offerSummary?.offerCount > 0 ? "affiliate" : "internal";
        const score = clampScore(
          Math.min(36, styleHits * 14) +
          Math.min(24, colorHits * 9) +
          (savedCategoryHit ? 18 : 0) +
          (triedCategoryHit ? 12 : 0) +
          (withinBudget ? 12 : 0) +
          (offerSummary?.shopCount > 0 ? 8 : 0) +
          popularityScore
        );
        const reasons = [
          styleHits > 0 ? "Matches your style" : null,
          colorHits > 0 ? "Matches color preference" : null,
          withinBudget ? "Fits your budget" : null,
          savedCategoryHit ? "Similar to saved looks" : null,
          triedCategoryHit ? "Inspired by your try-ons" : null,
          pinHits > 0 ? "Trending on Pinterest" : null,
          offerSummary?.shopCount > 0 ? "Available nearby" : null,
          offerSummary?.lowestPrice != null ? "Best price found" : null
        ].filter((reason): reason is string => Boolean(reason));

        return {
          name: product.name,
          score: hasUserSignals ? score : clampScore(popularityScore),
          source,
          image: trendImage(serialized),
          cta: "Try this look",
          reasons: reasons.length ? reasons : ["Trending on Pinterest"],
          recommendationReasons: reasons.length ? reasons : ["Trending on Pinterest"],
          product: serialized,
          price,
          withinBudget,
          savedCategoryHit,
          pinHits,
          shopCount: offerSummary?.shopCount ?? 0
        };
      })
      .sort((left, right) => right.score - left.score);

    const fallbackRanked = [...ranked].sort((left, right) => {
      const rightTrend = right.pinHits + (right.source === "pinterest" || right.source === "hybrid" ? 2 : 0);
      const leftTrend = left.pinHits + (left.source === "pinterest" || left.source === "hybrid" ? 2 : 0);
      return rightTrend - leftTrend || right.score - left.score;
    });
    const forYou = hasUserSignals ? ranked.slice(0, limit) : fallbackRanked.slice(0, limit);
    const trendingForYou = fallbackRanked
      .filter((item) => item.pinHits > 0 || item.source === "pinterest" || item.source === "hybrid")
      .slice(0, limit);
    const popularNearYou = ranked.filter((item) => item.shopCount > 0).slice(0, limit);
    const underYourBudget = ranked.filter((item) => item.withinBudget).slice(0, limit);
    const recentlySavedInspired = ranked.filter((item) => item.savedCategoryHit).slice(0, limit);

    const stripInternal = (items: typeof ranked) => items.map(({ price, withinBudget, savedCategoryHit, pinHits, shopCount, ...item }) => item);
    const data: DiscoverFeedResponse = {
      forYou: stripInternal(forYou),
      trendingForYou: stripInternal(trendingForYou.length ? trendingForYou : fallbackRanked.slice(0, limit)),
      popularNearYou: stripInternal(popularNearYou),
      underYourBudget: stripInternal(underYourBudget),
      recentlySavedInspired: stripInternal(recentlySavedInspired),
      fallbackUsed: !hasUserSignals,
      cachedAt: now
    };

    discoverFeedCache.set(cacheKey, { expiresAt: Date.now() + TREND_CACHE_TTL_MS, data });
    return data;
  }

  get(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        variants: { include: { inventoryOffers: { include: { shop: true } }, sizeChartEntries: true } }
      }
    });
  }

  create(dto: ProductDto) {
    const { variants, ...productData } = dto;
    return this.prisma.product.create({
      data: {
        ...productData,
        variants: variants
          ? {
              create: variants.map((variant) => ({
                ...variant,
                price: new Prisma.Decimal(variant.price),
                currency: variant.currency ?? "USD"
              }))
            }
          : undefined
      },
      include: { variants: true, brand: true }
    });
  }

  async update(id: string, dto: ProductDto) {
    const { variants, ...productData } = dto;

    if (variants) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        variants: variants
          ? {
              create: variants.map((variant) => ({
                ...variant,
                price: new Prisma.Decimal(variant.price),
                currency: variant.currency ?? "USD"
              }))
            }
          : undefined
      },
      include: { variants: true, brand: true }
    });
  }
}

@ApiBearerAuth()
@ApiTags("products")
@Controller("products")
class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly fitService: FitService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @Get()
  async list(@Query("category") category?: string) {
    const products = await this.service.list(category);
    return products.map((product) => serializeProductCard(product));
  }

  @Get("trending")
  async trending(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit = "4",
    @Query("userId") userId?: string
  ) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 4, 1), 20);
    if (userId) {
      this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot view these personalized trends");
      return this.service.personalizedTrending(userId, parsedLimit);
    }

    const products = await this.service.trending(parsedLimit);
    return products.map((product) => serializeProductCard(product));
  }

  @Get("discover-feed")
  async discoverFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit = "8",
    @Query("userId") userId?: string
  ) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view this discover feed");
    const parsedLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
    return this.service.discoverFeed(targetUserId, parsedLimit);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const [product, allProducts] = await Promise.all([this.service.get(id), this.service.list()]);
    if (!product) {
      return null;
    }

    const serialized = serializeProductCard(product);
    const fitPreview = await this.fitService.previewForProduct(user, id, {});
    const similarProducts = allProducts
      .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
      .map((candidate) => serializeProductCard(candidate))
      .sort((left, right) => {
        const leftOverlap = (left.styleTags ?? []).filter((tag: string) => (serialized.styleTags ?? []).includes(tag)).length;
        const rightOverlap = (right.styleTags ?? []).filter((tag: string) => (serialized.styleTags ?? []).includes(tag)).length;
        return rightOverlap - leftOverlap;
      })
      .slice(0, 3);
    const cheaperAlternatives = allProducts
      .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
      .map((candidate) => serializeProductCard(candidate))
      .filter((candidate) => (candidate.offerSummary?.lowestPrice ?? Number.MAX_SAFE_INTEGER) < (serialized.offerSummary?.lowestPrice ?? Number.MAX_SAFE_INTEGER))
      .sort((left, right) => (left.offerSummary?.lowestPrice ?? 0) - (right.offerSummary?.lowestPrice ?? 0))
      .slice(0, 3);
    const completeTheLook = allProducts
      .filter((candidate) => candidate.id !== product.id && candidate.category !== product.category)
      .map((candidate) => serializeProductCard(candidate))
      .sort((left, right) => {
        const leftOccasion = inferOccasionTags(left).filter((tag) => serialized.occasionTags?.includes(tag)).length;
        const rightOccasion = inferOccasionTags(right).filter((tag) => serialized.occasionTags?.includes(tag)).length;
        const leftStyle = (left.styleTags ?? []).filter((tag: string) => (serialized.styleTags ?? []).includes(tag)).length;
        const rightStyle = (right.styleTags ?? []).filter((tag: string) => (serialized.styleTags ?? []).includes(tag)).length;
        return rightOccasion + rightStyle - (leftOccasion + leftStyle);
      })
      .slice(0, 4);

    return {
      ...serialized,
      fitPreview,
      similarProducts,
      cheaperAlternatives,
      completeTheLook,
      priceAnchor: representativePriceForProduct(product)
    };
  }

  @Get(":id/fit-preview")
  getFitPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("variantId") variantId?: string,
    @Query("chosenSizeLabel") chosenSizeLabel?: string,
    @Query("fitPreference") fitPreference?: "slim" | "regular" | "relaxed"
  ) {
    return this.fitService.previewForProduct(user, id, { variantId, chosenSizeLabel, fitPreference });
  }

  @Roles("ADMIN")
  @Post()
  create(@Body() dto: ProductDto) {
    return this.service.create(dto);
  }

  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: ProductDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  imports: [FitModule, SocialModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
  exports: [ProductsService]
})
export class ProductsModule {}
