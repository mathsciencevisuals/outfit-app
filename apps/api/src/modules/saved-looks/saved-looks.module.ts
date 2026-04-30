import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";
import { inferOccasionTags, representativePriceForProduct, serializeProductCard } from "../catalog/catalog.utils";

class SavedLookDto {
  @IsString()
  userId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isWishlist?: boolean;

  @IsOptional()
  @IsString()
  tryOnResultId?: string;

  @IsOptional()
  @IsString()
  tryOnImageUrl?: string;

  @IsArray()
  productIds!: string[];
}

@Injectable()
class SavedLooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these saved looks");

    return this.readLooks(targetUserId);
  }

  async create(user: AuthenticatedUser, dto: SavedLookDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this saved look");
    const lookId = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SavedLook" (id, "userId", name, note, "isWishlist", "tryOnResultId", "tryOnImageUrl", "createdAt", "updatedAt")
      VALUES (${lookId}, ${dto.userId}, ${dto.name}, ${dto.note ?? null}, ${dto.isWishlist ?? false}, ${dto.tryOnResultId ?? null}, ${dto.tryOnImageUrl ?? null}, NOW(), NOW())
    `);

    if (dto.productIds.length > 0) {
      await this.prisma.savedLookItem.createMany({
        data: dto.productIds.map((productId) => ({
          id: randomUUID(),
          savedLookId: lookId,
          productId
        }))
      });
    }

    return this.readLook(lookId);
  }

  async update(user: AuthenticatedUser, id: string, dto: SavedLookDto) {
    const existing = await this.readLookRecord(id);
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot update this saved look");
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot reassign this saved look");

    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: id } });
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "SavedLook"
      SET name = ${dto.name},
          note = ${dto.note ?? null},
          "isWishlist" = ${dto.isWishlist ?? false},
          "tryOnResultId" = ${dto.tryOnResultId ?? null},
          "tryOnImageUrl" = ${dto.tryOnImageUrl ?? null},
          "updatedAt" = NOW()
      WHERE id = ${id}
    `);

    if (dto.productIds.length > 0) {
      await this.prisma.savedLookItem.createMany({
        data: dto.productIds.map((productId) => ({
          id: randomUUID(),
          savedLookId: id,
          productId
        }))
      });
    }

    return this.readLook(id);
  }

  async delete(user: AuthenticatedUser, id: string) {
    const existing = await this.readLookRecord(id);
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot delete this saved look");
    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: id } });
    await this.prisma.$executeRaw(Prisma.sql`DELETE FROM "SavedLook" WHERE id = ${id}`);
    return { id };
  }

  private async readLookRecord(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; name: string; note: string | null; isWishlist: boolean; tryOnResultId: string | null; tryOnImageUrl: string | null; createdAt: Date; updatedAt: Date }>
    >(Prisma.sql`
      SELECT id, "userId", name, note, "isWishlist", "tryOnResultId", "tryOnImageUrl", "createdAt", "updatedAt"
      FROM "SavedLook"
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async enrichLook(look: { id: string; userId: string; name: string; note: string | null; isWishlist: boolean; tryOnResultId: string | null; tryOnImageUrl: string | null; createdAt: Date; updatedAt: Date }) {
    const items = await this.prisma.savedLookItem.findMany({
      where: { savedLookId: look.id },
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
    });

    const serializedItems = items.map((item) => ({
      ...item,
      product: item.product ? serializeProductCard(item.product) : item.product
    }));
    const products = serializedItems.map((item) => item.product).filter(Boolean);
    const lookCategories = new Set(serializedItems.map((item) => item.product?.category).filter(Boolean));
    const allProducts = await this.prisma.product.findMany({
      include: {
        brand: true,
        variants: {
          include: {
            inventoryOffers: { include: { shop: true } },
            sizeChartEntries: true
          }
        }
      },
      take: 20
    });
    const complementary = allProducts
      .filter((product) => !serializedItems.some((item) => item.productId === product.id) && !lookCategories.has(product.category))
      .map((product) => serializeProductCard(product))
      .sort((left, right) => {
        const leftOccasions = inferOccasionTags(left).filter((tag) =>
          serializedItems.some((item) => item.product?.occasionTags?.includes(tag))
        ).length;
        const rightOccasions = inferOccasionTags(right).filter((tag) =>
          serializedItems.some((item) => item.product?.occasionTags?.includes(tag))
        ).length;
        return rightOccasions - leftOccasions;
      })
      .slice(0, 3);

    const allOffers = serializedItems.flatMap((item) => item.product?.variants?.flatMap((variant: any) => variant.inventoryOffers ?? []) ?? []);
    const lowestTotal = serializedItems.reduce(
      (sum, item) => sum + (item.product ? representativePriceForProduct(item.product) : 0),
      0
    );

    return {
      ...look,
      items: serializedItems,
      products,
      offerSummary: {
        offerCount: allOffers.length,
        shopCount: new Set(allOffers.map((offer: any) => offer.shop?.id).filter(Boolean)).size,
        lowestPrice: lowestTotal,
        highestPrice: lowestTotal,
        bestOffer: allOffers[0] ?? null,
        availabilityLabel: allOffers.length > 0 ? "Shop-ready look" : "No live offers",
        badges: [allOffers.length > 0 ? "Buy Now" : "Needs Offers"].filter(Boolean)
      },
      recommendedProducts: complementary,
      occasionTags: Array.from(
        new Set(serializedItems.flatMap((item) => item.product?.occasionTags ?? []))
      )
    };
  }

  private async readLook(id: string) {
    const look = await this.readLookRecord(id);
    if (!look) {
      return null;
    }

    return this.enrichLook(look);
  }

  private async readLooks(userId: string) {
    const looks = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; name: string; note: string | null; isWishlist: boolean; tryOnResultId: string | null; tryOnImageUrl: string | null; createdAt: Date; updatedAt: Date }>
    >(Prisma.sql`
      SELECT id, "userId", name, note, "isWishlist", "tryOnResultId", "tryOnImageUrl", "createdAt", "updatedAt"
      FROM "SavedLook"
      WHERE "userId" = ${userId}
      ORDER BY "updatedAt" DESC
    `);

    return Promise.all(looks.map((look) => this.enrichLook(look)));
  }
}

@ApiBearerAuth()
@ApiTags("saved-looks")
@Controller("saved-looks")
class SavedLooksController {
  constructor(private readonly service: SavedLooksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SavedLookDto) {
    return this.service.create(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SavedLookDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.delete(user, id);
  }
}

@Module({
  controllers: [SavedLooksController],
  providers: [SavedLooksService, PrismaService],
  exports: [SavedLooksService]
})
export class SavedLooksModule {}
