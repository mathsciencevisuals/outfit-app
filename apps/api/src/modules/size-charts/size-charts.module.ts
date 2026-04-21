import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { PrismaService } from "../../common/prisma.service";

class SizeChartEntryDto {
  @IsString()
  sizeLabel!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsNumber()
  chestMinCm?: number;

  @IsOptional()
  @IsNumber()
  chestMaxCm?: number;

  @IsOptional()
  @IsNumber()
  waistMinCm?: number;

  @IsOptional()
  @IsNumber()
  waistMaxCm?: number;

  @IsOptional()
  @IsNumber()
  hipsMinCm?: number;

  @IsOptional()
  @IsNumber()
  hipsMaxCm?: number;

  @IsOptional()
  @IsNumber()
  inseamMinCm?: number;

  @IsOptional()
  @IsNumber()
  inseamMaxCm?: number;
}

class SizeChartDto {
  @IsString()
  brandId!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeChartEntryDto)
  entries!: SizeChartEntryDto[];
}

@Injectable()
class SizeChartsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.sizeChart.findMany({ include: { brand: true, entries: true } });
  }

  get(id: string) {
    return this.prisma.sizeChart.findUnique({ where: { id }, include: { brand: true, entries: true } });
  }

  create(dto: SizeChartDto) {
    return this.prisma.sizeChart.create({
      data: {
        brandId: dto.brandId,
        category: dto.category,
        notes: dto.notes,
        entries: { create: dto.entries }
      },
      include: { brand: true, entries: true }
    });
  }

  async update(id: string, dto: SizeChartDto) {
    await this.prisma.sizeChartEntry.deleteMany({ where: { sizeChartId: id } });
    return this.prisma.sizeChart.update({
      where: { id },
      data: {
        brandId: dto.brandId,
        category: dto.category,
        notes: dto.notes,
        entries: { create: dto.entries }
      },
      include: { brand: true, entries: true }
    });
  }
}

@ApiTags("size-charts")
@Controller("size-charts")
class SizeChartsController {
  constructor(private readonly service: SizeChartsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: SizeChartDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: SizeChartDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [SizeChartsController],
  providers: [SizeChartsService, PrismaService],
  exports: [SizeChartsService]
})
export class SizeChartsModule {}
