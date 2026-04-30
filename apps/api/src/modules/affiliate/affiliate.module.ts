import { Controller, Get, Injectable, Module, NotFoundException, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class AffiliateService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  convertUrl(url: string): string {
    const sourceId = this.configService.get<string>("CUELINKS_SOURCE_ID");
    if (!sourceId || !url) return url;
    return `https://linksredirect.com/?source_id=${sourceId}&type=link&url=${encodeURIComponent(url)}`;
  }

  async productLink(productId: string): Promise<{
    affiliateUrl: string;
    shopName: string | null;
    price: number | null;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: {
            inventoryOffers: {
              include: { shop: true },
              orderBy: { price: "asc" },
            },
          },
        },
      },
    });

    if (!product) throw new NotFoundException("Product not found");

    const allOffers = product.variants.flatMap((v: any) => v.inventoryOffers as any[]);
    const cheapest = allOffers.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0] ?? null;

    const rawUrl =
      cheapest?.externalUrl ??
      `https://www.google.com/search?q=${encodeURIComponent(product.name + " buy online India")}`;

    return {
      affiliateUrl: this.convertUrl(rawUrl),
      shopName: cheapest?.shop?.name ?? null,
      price: cheapest ? Number(cheapest.price) : null,
    };
  }
}

@ApiBearerAuth()
@ApiTags("affiliate")
@Controller("affiliate")
class AffiliateController {
  constructor(private readonly service: AffiliateService) {}

  @Get("product-link")
  productLink(@Query("productId") productId: string) {
    return this.service.productLink(productId);
  }
}

@Module({
  controllers: [AffiliateController],
  providers: [AffiliateService, PrismaService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
