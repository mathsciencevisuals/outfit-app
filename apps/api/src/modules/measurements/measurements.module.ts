import { Body, Controller, Delete, Get, Injectable, Module, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class MeasurementDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

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
  shouldersCm?: number;

  @IsOptional()
  @IsNumber()
  footLengthCm?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

@Injectable()
class MeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these measurements");

    return Promise.all([
      this.prisma.measurement.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" }
      }),
      (this.prisma.profile as any).findUnique({
        where: { userId: targetUserId },
        select: { heightCm: true }
      })
    ]).then(([measurements, profile]) =>
      measurements.map((measurement) => ({
        ...measurement,
        heightCm: profile?.heightCm ?? null,
        shouldersCm: measurement.shoulderCm ?? null
      }))
    );
  }

  async create(user: AuthenticatedUser, dto: MeasurementDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create these measurements");

    if (dto.heightCm != null) {
      await (this.prisma.profile as any).upsert({
        where: { userId: dto.userId },
        update: { heightCm: dto.heightCm },
        create: {
          userId: dto.userId,
          firstName: "FitMe",
          lastName: "Member",
          heightCm: dto.heightCm
        }
      });
    }

    const latestMeasurement = await this.prisma.measurement.findFirst({
      where: { userId: dto.userId },
      orderBy: { createdAt: "desc" }
    });

    const measurementData = {
      userId: dto.userId,
      chestCm: dto.chestCm,
      waistCm: dto.waistCm,
      hipsCm: dto.hipsCm,
      inseamCm: dto.inseamCm,
      shoulderCm: dto.shouldersCm ?? dto.shoulderCm,
      footLengthCm: dto.footLengthCm,
      source: dto.source
    };

    if (latestMeasurement) {
      return this.prisma.measurement.update({
        where: { id: latestMeasurement.id },
        data: measurementData
      });
    }

    return this.prisma.measurement.create({ data: measurementData });
  }

  async update(user: AuthenticatedUser, id: string, dto: MeasurementDto) {
    const existing = await this.prisma.measurement.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot update these measurements");
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot reassign these measurements");
    return this.prisma.measurement.update({ where: { id }, data: dto });
  }

  async delete(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.measurement.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot delete these measurements");
    return this.prisma.measurement.delete({ where: { id } });
  }
}

@ApiBearerAuth()
@ApiTags("measurements")
@Controller("measurements")
class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.measurementsService.list(user, userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: MeasurementDto) {
    return this.measurementsService.create(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: MeasurementDto) {
    return this.measurementsService.update(user, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.measurementsService.delete(user, id);
  }
}

@Module({
  controllers: [MeasurementsController],
  providers: [MeasurementsService, PrismaService],
  exports: [MeasurementsService]
})
export class MeasurementsModule {}
