import {
  BadRequestException, Body, Controller, Delete, ForbiddenException,
  Get, Injectable, Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsNumber, IsOptional, IsString, Min } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

// ── DTOs ─────────────────────────────────────────────────────────────────────

class RegisterShopDto {
  @IsString() name!: string;
  @IsString() url!: string;
  @IsString() region!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() slug?: string;
}

class UpdateShopDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() description?: string;
}

class CreateOfferDto {
  @IsString()  variantId!: string;
  @IsString()  externalUrl!: string;
  @IsNumber() @Min(0) price!: number;
  @IsNumber() @Min(0) stock!: number;
  @IsOptional() @IsString() currency?: string;
}

class PublishListingDto {
  @IsString() title!: string;
  @IsString() category!: string;
  @IsNumber() @Min(0) price!: number;
  @IsArray() sizes!: string[];
  @IsString() location!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() externalUrl?: string;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsString() currency?: string;
}

class UpdateOfferDto {
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsString() externalUrl?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class MerchantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async registerShop(user: AuthenticatedUser, dto: RegisterShopDto) {
    const existing = await (this.prisma.shop as any).findUnique({ where: { ownerUserId: user.id } });
    if (existing) throw new BadRequestException("You already have a registered shop");

    const slug = dto.slug ?? dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slugExists = await (this.prisma.shop as any).findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const shop = await (this.prisma.shop as any).create({
      data: {
        name: dto.name,
        slug: finalSlug,
        url: dto.url,
        region: dto.region,
        description: dto.description ?? null,
        ownerUserId: user.id,
      },
    });

    // Promote user to MERCHANT role
    await (this.prisma.user as any).update({
      where: { id: user.id },
      data: { role: "MERCHANT" },
    });

    return shop;
  }

  async getOwnShop(user: AuthenticatedUser) {
    const shop = await (this.prisma.shop as any).findUnique({
      where: { ownerUserId: user.id },
      include: {
        inventoryOffers: {
          include: { variant: { include: { product: { include: { brand: true } } } } },
          orderBy: { price: "asc" },
        },
      },
    });
    if (!shop) throw new NotFoundException("You do not have a registered shop");
    return shop;
  }

  async updateShop(user: AuthenticatedUser, dto: UpdateShopDto) {
    await this.getOwnShop(user); // asserts ownership
    return (this.prisma.shop as any).update({
      where: { ownerUserId: user.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.region && { region: dto.region }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async createOffer(user: AuthenticatedUser, dto: CreateOfferDto) {
    const shop = await this.getOwnShop(user);

    const variant = await (this.prisma.productVariant as any).findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new NotFoundException("Product variant not found");

    return (this.prisma.inventoryOffer as any).create({
      data: {
        shopId: shop.id,
        variantId: dto.variantId,
        externalUrl: dto.externalUrl,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
        currency: dto.currency ?? "INR",
      },
      include: { variant: { include: { product: true } } },
    });
  }

  private slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "listing";
  }

  private async uniqueSlug(model: "brand" | "product", base: string) {
    const slug = this.slugify(base);
    const existing = await (this.prisma[model] as any).findUnique({ where: { slug } });
    return existing ? `${slug}-${Date.now()}` : slug;
  }

  private async merchantBrand(shop: any) {
    const name = shop.name;
    const existing = await (this.prisma.brand as any).findUnique({ where: { name } });
    if (existing) {
      return existing;
    }

    return (this.prisma.brand as any).create({
      data: {
        name,
        slug: await this.uniqueSlug("brand", name),
        countryCode: "IN",
        sizingNotes: "Merchant-provided boutique sizing"
      }
    });
  }

  async publishListing(user: AuthenticatedUser, dto: PublishListingDto) {
    const shop = await this.getOwnShop(user);
    const brand = await this.merchantBrand(shop);
    const sizeLabels = dto.sizes.length > 0 ? dto.sizes : ["Free Size"];
    const primarySize = sizeLabels[0] ?? "Free Size";
    const color = dto.color?.trim() || "Assorted";
    const stock = dto.stock ?? Math.max(sizeLabels.length, 1);
    const externalUrl = dto.externalUrl?.trim() || shop.url;

    const product = await (this.prisma.product as any).create({
      data: {
        brandId: brand.id,
        name: dto.title.trim(),
        slug: await this.uniqueSlug("product", `${shop.slug}-${dto.title}`),
        category: dto.category.trim(),
        description: dto.description?.trim() || `Boutique listing from ${shop.name} in ${dto.location}.`,
        baseColor: color,
        secondaryColors: [],
        materials: [],
        styleTags: ["merchant", "boutique", dto.category.trim().toLowerCase()],
        imageUrl: dto.imageUrl?.trim() || null,
        variants: {
          create: {
            sku: `${shop.slug}-${Date.now()}-${primarySize}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
            sizeLabel: sizeLabels.join(", "),
            color,
            price: new Prisma.Decimal(dto.price),
            currency: dto.currency ?? "INR",
            imageUrl: dto.imageUrl?.trim() || null
          }
        }
      },
      include: { variants: true, brand: true }
    });

    const variant = product.variants[0];
    const offer = await (this.prisma.inventoryOffer as any).create({
      data: {
        shopId: shop.id,
        variantId: variant.id,
        externalUrl,
        price: new Prisma.Decimal(dto.price),
        stock,
        currency: dto.currency ?? "INR"
      },
      include: { variant: { include: { product: { include: { brand: true } } } }, shop: true }
    });

    return { product, offer };
  }

  async updateOffer(user: AuthenticatedUser, offerId: string, dto: UpdateOfferDto) {
    const shop = await this.getOwnShop(user);
    const offer = await (this.prisma.inventoryOffer as any).findUnique({ where: { id: offerId } });
    if (!offer || offer.shopId !== shop.id) throw new ForbiddenException("Offer not found in your shop");

    return (this.prisma.inventoryOffer as any).update({
      where: { id: offerId },
      data: {
        ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.externalUrl && { externalUrl: dto.externalUrl }),
      },
    });
  }

  async deleteOffer(user: AuthenticatedUser, offerId: string) {
    const shop = await this.getOwnShop(user);
    const offer = await (this.prisma.inventoryOffer as any).findUnique({ where: { id: offerId } });
    if (!offer || offer.shopId !== shop.id) throw new ForbiddenException("Offer not found in your shop");
    return (this.prisma.inventoryOffer as any).delete({ where: { id: offerId } });
  }

  async getAnalytics(user: AuthenticatedUser) {
    const shop = await this.getOwnShop(user);
    const productIds = [
      ...new Set(
        (shop.inventoryOffers as any[]).map((o: any) => o.variant?.product?.id).filter(Boolean) as string[]
      ),
    ];

    const variantIds = (shop.inventoryOffers as any[]).map((o: any) => o.variantId);
    const tryOnCount = await (this.prisma.tryOnRequest as any).count({
      where: { variantId: { in: variantIds } },
    });

    const completedTryOns = await (this.prisma.tryOnRequest as any).count({
      where: {
        variantId: { in: variantIds },
        status: "COMPLETED",
      },
    });

    const [shopClicks, affiliateClicks] = await Promise.all([
      (this.prisma as any).appEvent.count({
        where: {
          eventName: "shop_link_opened",
          metadata: { path: ["shopId"], equals: shop.id }
        }
      }).catch(() => 0),
      (this.prisma as any).appEvent.count({
        where: {
          eventName: "affiliate_link_opened",
          metadata: { path: ["shopName"], equals: shop.name }
        }
      }).catch(() => 0)
    ]);

    const topTriedRows = variantIds.length > 0
      ? await (this.prisma.tryOnRequest as any).groupBy({
          by: ["variantId"],
          where: { variantId: { in: variantIds } },
          _count: { _all: true },
          orderBy: { _count: { variantId: "desc" } },
          take: 5
        }).catch(() => [])
      : [];
    const variantProductMap = new Map(
      (shop.inventoryOffers as any[]).map((offer: any) => [
        offer.variantId,
        offer.variant?.product?.name ?? "Garment"
      ])
    );

    return {
      shopId: shop.id,
      shopName: shop.name,
      productCount: productIds.length,
      offerCount: (shop.inventoryOffers as any[]).length,
      tryOnCount,
      completedTryOns,
      shopClicks,
      leadsGenerated: shopClicks + affiliateClicks,
      topTriedGarments: topTriedRows.map((row: any) => ({
        variantId: row.variantId,
        name: variantProductMap.get(row.variantId) ?? "Garment",
        tryOns: row._count?._all ?? 0
      })),
      conversionRate: tryOnCount > 0 ? Math.round((completedTryOns / tryOnCount) * 100) : 0,
    };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiBearerAuth()
@ApiTags("merchant")
@Controller("merchant")
class MerchantController {
  constructor(private readonly service: MerchantService) {}

  @Post("register")
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterShopDto) {
    return this.service.registerShop(user, dto);
  }

  @Get("shop")
  getShop(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getOwnShop(user);
  }

  @Put("shop")
  updateShop(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateShopDto) {
    return this.service.updateShop(user, dto);
  }

  @Post("offers")
  createOffer(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOfferDto) {
    return this.service.createOffer(user, dto);
  }

  @Post("listings")
  publishListing(@CurrentUser() user: AuthenticatedUser, @Body() dto: PublishListingDto) {
    return this.service.publishListing(user, dto);
  }

  @Put("offers/:id")
  updateOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.service.updateOffer(user, id, dto);
  }

  @Delete("offers/:id")
  deleteOffer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.deleteOffer(user, id);
  }

  @Get("analytics")
  getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getAnalytics(user);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [MerchantController],
  providers: [MerchantService, PrismaService],
})
export class MerchantModule {}
