import { Body, Controller, Delete, Get, Injectable, Module, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

import { PrismaService } from "../../common/prisma.service";

class MeasurementDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsNumber()
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  hipsCm?: number;

  @IsOptional()
  @IsNumber()
  inseamCm?: number;

  @IsOptional()
  @IsNumber()
  shoulderCm?: number;

  @IsOptional()
  @IsNumber()
  footLengthCm?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

@Injectable()
class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId?: string) {
    return this.prisma.measurement.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" }
    });
  }

  create(dto: MeasurementDto) {
    return this.prisma.measurement.create({ data: dto });
  }

  update(id: string, dto: MeasurementDto) {
    return this.prisma.measurement.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.measurement.delete({ where: { id } });
  }
}

@ApiTags("measurements")
@Controller("measurements")
class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    return this.measurementsService.list(userId);
  }

  @Post()
  create(@Body() dto: MeasurementDto) {
    return this.measurementsService.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: MeasurementDto) {
    return this.measurementsService.update(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.measurementsService.delete(id);
  }
}

@Module({
  controllers: [MeasurementsController],
  providers: [MeasurementsService, PrismaService],
  exports: [MeasurementsService]
})
export class MeasurementsModule {}
