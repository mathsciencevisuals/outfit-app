import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";

class BrandDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  countryCode!: string;

  @IsOptional()
  @IsString()
  sizingNotes?: string;
}

@Injectable()
class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.brand.findMany({ include: { products: true, sizeCharts: true } });
  }

  get(id: string) {
    return this.prisma.brand.findUnique({ where: { id }, include: { products: true, sizeCharts: true } });
  }

  create(dto: BrandDto) {
    return this.prisma.brand.create({ data: dto });
  }

  update(id: string, dto: BrandDto) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }
}

@ApiBearerAuth()
@ApiTags("brands")
@Controller("brands")
class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Roles("ADMIN", "OPERATOR")
  @Get()
  list() {
    return this.service.list();
  }

  @Roles("ADMIN", "OPERATOR")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Roles("ADMIN")
  @Post()
  create(@Body() dto: BrandDto) {
    return this.service.create(dto);
  }

  @Roles("ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: BrandDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService],
  exports: [BrandsService]
})
export class BrandsModule {}
