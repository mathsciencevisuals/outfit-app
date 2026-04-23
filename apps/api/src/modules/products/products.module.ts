import { Body, Controller, Get, Injectable, Module, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { FitModule, FitService } from "../fit/fit.module";

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

@Injectable()
class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
    private readonly fitService: FitService
  ) {}

  @Get()
  list(@Query("category") category?: string) {
    return this.service.list(category);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
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
  imports: [FitModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
  exports: [ProductsService]
})
export class ProductsModule {}
