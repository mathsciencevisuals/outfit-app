import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { randomUUID } from "crypto";
import { Type } from "class-transformer";

import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { representativePriceForProduct, serializeInventoryOffer, serializeProductCard, summarizeOffers } from "../catalog/catalog.utils";
import { FitModule, FitService } from "../fit/fit.module";

class OfferDto {
  @IsString()
  variantId!: string;

  @IsString()
  externalUrl!: string;

  @IsNumber()
  stock!: number;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

class ShopDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  url!: string;

  @IsString()
  region!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDto)
  inventoryOffers?: OfferDto[];
}

@Injectable()
class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.shop.findMany({
      include: {
        inventoryOffers: { include: { variant: { include: { product: true } }, shop: true } }
      }
    });
  }

  get(id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        inventoryOffers: { include: { variant: { include: { product: true } }, shop: true } }
      }
    });
  }

  create(dto: ShopDto) {
    return this.prisma.shop.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        url: dto.url,
        region: dto.region,
        inventoryOffers: dto.inventoryOffers
          ? {
              create: dto.inventoryOffers.map((offer) => ({
                ...offer,
                price: new Prisma.Decimal(offer.price),
                currency: offer.currency ?? "USD"
              }))
            }
          : undefined
      },
      include: { inventoryOffers: true }
    });
  }

  update(id: string, dto: ShopDto) {
    return this.prisma.shop.update({
      where: { id },
      data: { name: dto.name, slug: dto.slug, url: dto.url, region: dto.region }
    });
  }
}

@ApiBearerAuth()
@ApiTags("shops")
@Controller("shops")
class ShopsController {
  constructor(
    private readonly service: ShopsService,
    private readonly prisma: PrismaService,
    private readonly fitService: FitService
  ) {}

  @Get()
  async list() {
    const shops = await this.service.list();
    return shops.map((shop) => ({
      ...shop,
      inventoryOffers: (shop.inventoryOffers ?? []).map(serializeInventoryOffer).filter(Boolean)
    }));
  }

  @Get("compare")
  async compare(
    @CurrentUser() user: AuthenticatedUser,
    @Query("productId") productId?: string,
    @Query("variantId") variantId?: string
  ) {
    let product = null as any;
    if (productId) {
      product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          brand: true,
          variants: {
            include: {
              sizeChartEntries: true,
              inventoryOffers: { include: { shop: true } }
            }
          }
        }
      });
    } else if (variantId) {
      product = await this.prisma.product.findFirst({
        where: { variants: { some: { id: variantId } } },
        include: {
          brand: true,
          variants: {
            include: {
              sizeChartEntries: true,
              inventoryOffers: { include: { shop: true } }
            }
          }
        }
      });
    }

    if (!product) {
      return {
        productId: null,
        productName: null,
        offers: [],
        bestOffer: null,
        lowestPrice: null,
        highestPrice: null,
        badges: []
      };
    }

    const serializedProduct = serializeProductCard(product);
    const fitPreview = await this.fitService.previewForProduct(user, product.id, {
      variantId,
      chosenSizeLabel: variantId ? product.variants.find((candidate: any) => candidate.id === variantId)?.sizeLabel : undefined
    });
    const safeFitPreview = fitPreview ?? {
      recommendedSize: null,
      fitLabel: "regular"
    };
    const recommendedVariant =
      serializedProduct.variants?.find((variant: any) => variant.sizeLabel === safeFitPreview.recommendedSize) ??
      serializedProduct.variants?.find((variant: any) => variant.id === variantId) ??
      serializedProduct.variants?.[0];
    const scopedOffers = variantId
      ? (recommendedVariant?.inventoryOffers ?? []).map(serializeInventoryOffer).filter(Boolean)
      : recommendedVariant
        ? (recommendedVariant.inventoryOffers ?? []).map(serializeInventoryOffer).filter(Boolean)
        : serializedProduct.variants?.flatMap((variant: any) => (variant.inventoryOffers ?? []).map(serializeInventoryOffer)).filter(Boolean) ?? [];
    const summary = summarizeOffers(scopedOffers);

    const categoryAlternatives = await this.prisma.product.findMany({
      where: { category: product.category, id: { not: product.id } },
      include: {
        brand: true,
        variants: {
          include: {
            inventoryOffers: { include: { shop: true } },
            sizeChartEntries: true
          }
        }
      },
      take: 6
    });

    const cheaperAlternative = categoryAlternatives
      .map((candidate: any) => serializeProductCard(candidate))
      .filter((candidate) => (candidate.offerSummary?.lowestPrice ?? Number.MAX_SAFE_INTEGER) < (summary.lowestPrice ?? Number.MAX_SAFE_INTEGER))
      .sort((left, right) => (left.offerSummary?.lowestPrice ?? 0) - (right.offerSummary?.lowestPrice ?? 0))[0] ?? null;

    return {
      productId: product.id,
      productName: product.name,
      variantId: recommendedVariant?.id ?? null,
      recommendedSize: safeFitPreview.recommendedSize ?? recommendedVariant?.sizeLabel ?? null,
      fitLabel: safeFitPreview.fitLabel,
      offers: scopedOffers,
      bestOffer: summary.bestOffer,
      lowestPrice: summary.lowestPrice,
      highestPrice: summary.highestPrice,
      badges: uniqueStrings([
        ...(summary.badges ?? []),
        safeFitPreview.recommendedSize ? "Best Fit" : null,
        cheaperAlternative ? "Cheaper Alternative" : null
      ]),
      cheaperAlternative,
      bestFitAlternative: categoryAlternatives
        .map((candidate) => ({
          product: serializeProductCard(candidate),
          fit: safeFitPreview.recommendedSize
        }))
        .sort((left, right) => representativePriceForProduct(left.product) - representativePriceForProduct(right.product))[0] ?? null
    };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const shop = await this.service.get(id);
    if (!shop) {
      return null;
    }

    return {
      ...shop,
      inventoryOffers: (shop.inventoryOffers ?? []).map(serializeInventoryOffer).filter(Boolean)
    };
  }

  @Get(":id/offers")
  async offers(@Param("id") id: string) {
    return this.get(id);
  }

  @Roles("ADMIN")
  @Post()
  create(@Body() dto: ShopDto) {
    return this.service.create(dto);
  }

  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: ShopDto) {
    return this.service.update(id, dto);
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

class InstantCheckoutDto {
  @IsString()
  userId!: string;

  @IsString()
  variantId!: string;

  @IsOptional()
  @IsString()
  shopId?: string;
}

@ApiBearerAuth()
@ApiTags("checkout")
@Controller("checkout")
class CheckoutController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("instant")
  async instantCheckout(@Body() dto: InstantCheckoutDto) {
    const offer = await this.prisma.inventoryOffer.findFirst({
      where: {
        variantId: dto.variantId,
        ...(dto.shopId ? { shopId: dto.shopId } : {}),
        stock: { gt: 0 }
      },
      orderBy: { price: "asc" }
    });

    if (!offer) {
      throw new NotFoundException("No available offer for this variant");
    }

    return {
      orderId: randomUUID(),
      checkoutUrl: offer.externalUrl,
      price: Number(offer.price),
      currency: offer.currency
    };
  }
}

@Module({
  imports: [FitModule],
  controllers: [ShopsController, CheckoutController],
  providers: [ShopsService, PrismaService],
  exports: [ShopsService]
})
export class ShopsModule {}
