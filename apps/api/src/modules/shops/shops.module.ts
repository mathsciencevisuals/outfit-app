import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";

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
        inventoryOffers: { include: { variant: { include: { product: true } } } }
      }
    });
  }

  get(id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        inventoryOffers: { include: { variant: { include: { product: true } } } }
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
  constructor(private readonly service: ShopsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Get(":id/offers")
  offers(@Param("id") id: string) {
    return this.service.get(id);
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

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, PrismaService],
  exports: [ShopsService]
})
export class ShopsModule {}
