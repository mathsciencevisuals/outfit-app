import { Body, Controller, Get, Injectable, Module, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

import {
  BrandSizeChartOption,
  FitPreference,
  assessFit,
  buildFitProfileSummary,
  normalizeMeasurementInput
} from "@fitme/fit-engine";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class FitAssessmentDto {
  @IsString()
  userId!: string;

  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  chosenSizeLabel?: string;

  @IsOptional()
  @IsIn(["slim", "regular", "relaxed"])
  fitPreference?: FitPreference;
}

@Injectable()
export class FitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these fit assessments");

    return (this.prisma.fitAssessment as any).findMany({
      where: { userId: targetUserId },
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async getFitProfile(user: AuthenticatedUser) {
    const [profile, latestMeasurement] = await Promise.all([
      (this.prisma.profile as any).findUnique({ where: { userId: user.id } }),
      this.prisma.measurement.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const body = normalizeMeasurementInput({
      heightCm: profile?.heightCm ?? null,
      weightKg: profile?.weightKg ?? null,
      chestCm: latestMeasurement?.chestCm ?? null,
      waistCm: latestMeasurement?.waistCm ?? null,
      hipsCm: latestMeasurement?.hipsCm ?? null,
      inseamCm: latestMeasurement?.inseamCm ?? null,
      shoulderCm: latestMeasurement?.shoulderCm ?? null,
      footLengthCm: latestMeasurement?.footLengthCm ?? null
    });
    const summary = buildFitProfileSummary(body, (profile?.fitPreference as FitPreference | null | undefined) ?? "regular");

    return {
      userId: user.id,
      fitPreference: summary.fitPreference,
      completenessScore: summary.completenessScore,
      providedMeasurements: summary.providedMeasurements,
      relevantMeasurements: summary.relevantMeasurements,
      guidance: summary.guidance,
      profile,
      latestMeasurement
    };
  }

  async previewForProduct(
    user: AuthenticatedUser,
    productId: string,
    options?: { variantId?: string; chosenSizeLabel?: string; fitPreference?: FitPreference }
  ) {
    this.authorizationService.assertSelfOrPrivileged(user, user.id, "You cannot preview this fit profile");
    return this.previewForUserId(user.id, productId, options);
  }

  async previewForUserId(
    userId: string,
    productId: string,
    options?: { variantId?: string; chosenSizeLabel?: string; fitPreference?: FitPreference }
  ) {
    const [profile, latestMeasurement, product] = await Promise.all([
      (this.prisma.profile as any).findUnique({ where: { userId } }),
      this.prisma.measurement.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.product.findUnique({
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
      })
    ]);

    if (!product) {
      return null;
    }

    const fitPreference = options?.fitPreference ?? (profile?.fitPreference as FitPreference | null | undefined) ?? "regular";
    const body = normalizeMeasurementInput({
      heightCm: profile?.heightCm ?? null,
      weightKg: profile?.weightKg ?? null,
      chestCm: latestMeasurement?.chestCm ?? null,
      waistCm: latestMeasurement?.waistCm ?? null,
      hipsCm: latestMeasurement?.hipsCm ?? null,
      inseamCm: latestMeasurement?.inseamCm ?? null,
      shoulderCm: latestMeasurement?.shoulderCm ?? null,
      footLengthCm: latestMeasurement?.footLengthCm ?? null
    });

    const selectedVariant =
      product.variants.find((variant) => variant.id === options?.variantId) ??
      product.variants.find((variant) => variant.sizeLabel === options?.chosenSizeLabel);
    const sizeOptions = this.buildSizeOptions(product.variants);
    const assessment = assessFit({
      body,
      fitPreference,
      garmentCategory: product.category,
      sizeOptions,
      selectedVariantId: selectedVariant?.id ?? options?.variantId ?? null,
      selectedSizeLabel: selectedVariant?.sizeLabel ?? options?.chosenSizeLabel ?? null
    });

    return {
      userId,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id ?? options?.variantId ?? null,
      selectedSizeLabel: selectedVariant?.sizeLabel ?? options?.chosenSizeLabel ?? null,
      fitPreference,
      measurementProfile: buildFitProfileSummary(body, fitPreference, product.category),
      ...assessment
    };
  }

  async assess(user: AuthenticatedUser, dto: FitAssessmentDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this fit assessment");

    const preview = await this.previewForUserId(dto.userId, dto.productId, {
      variantId: dto.variantId,
      chosenSizeLabel: dto.chosenSizeLabel,
      fitPreference: dto.fitPreference
    });

    if (!preview) {
      return null;
    }

    const assessment = await (this.prisma.fitAssessment as any).create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        variantId: preview.variantId,
        chosenSizeLabel: preview.selectedSizeLabel,
        recommendedSize: preview.recommendedSize,
        fitLabel: preview.fitLabel,
        score: preview.fitScore,
        confidence: preview.confidenceScore,
        verdict: preview.fitLabel,
        notes: preview.explanation,
        issues: preview.issues.map((issue) => issue.code),
        explanation: preview.explanation,
        metadata: {
          alternatives: preview.alternatives,
          sizeComparisons: preview.sizeComparisons,
          fitPreference: preview.fitPreference,
          measurementProfile: preview.measurementProfile
        }
      }
    });

    return {
      ...preview,
      assessmentId: assessment.id
    };
  }

  private buildSizeOptions(variants: Array<any>): BrandSizeChartOption[] {
    return variants.flatMap((variant) => {
      if (variant.sizeChartEntries.length === 0) {
        return [
          {
            variantId: variant.id,
            sizeLabel: variant.sizeLabel,
            displayLabel: variant.sizeLabel
          }
        ];
      }

      return variant.sizeChartEntries.map((entry: any) => ({
        variantId: variant.id,
        sizeLabel: variant.sizeLabel ?? entry.sizeLabel,
        displayLabel: `${variant.sizeLabel ?? entry.sizeLabel}`,
        chest: { minCm: entry.chestMinCm, maxCm: entry.chestMaxCm },
        waist: { minCm: entry.waistMinCm, maxCm: entry.waistMaxCm },
        hips: { minCm: entry.hipsMinCm, maxCm: entry.hipsMaxCm },
        inseam: { minCm: entry.inseamMinCm, maxCm: entry.inseamMaxCm },
        shoulder: { minCm: entry.shoulderMinCm, maxCm: entry.shoulderMaxCm },
        footLength: { minCm: entry.footLengthMinCm, maxCm: entry.footLengthMaxCm }
      }));
    });
  }
}

@ApiBearerAuth()
@ApiTags("fit")
@Controller("fit")
class FitController {
  constructor(private readonly service: FitService) {}

  @Get("assessments")
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post("assess")
  assess(@CurrentUser() user: AuthenticatedUser, @Body() dto: FitAssessmentDto) {
    return this.service.assess(user, dto);
  }

  @Post("assessments")
  assessLegacy(@CurrentUser() user: AuthenticatedUser, @Body() dto: FitAssessmentDto) {
    return this.service.assess(user, dto);
  }
}

@ApiBearerAuth()
@ApiTags("users")
@Controller("users")
class FitProfileController {
  constructor(private readonly service: FitService) {}

  @Get("me/fit-profile")
  getFitProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getFitProfile(user);
  }
}

class CompareDto {
  @IsString()
  userId!: string;

  @IsArray()
  @IsString({ each: true })
  productIds!: string[];
}

@ApiBearerAuth()
@ApiTags("compare")
@Controller("compare")
class CompareController {
  constructor(private readonly service: FitService) {}

  @Post()
  async compare(@Body() dto: CompareDto) {
    const previews = await Promise.all(
      dto.productIds.slice(0, 3).map((productId) =>
        this.service.previewForUserId(dto.userId, productId)
      )
    );
    return previews
      .filter((p) => p !== null)
      .map((p) => ({
        productId: p!.productId,
        fitNote: p!.explanation ?? "No fit data available",
        recommended: (p!.fitScore ?? 0) >= 60
      }));
  }
}

@Module({
  controllers: [FitController, FitProfileController, CompareController],
  providers: [FitService, PrismaService],
  exports: [FitService]
})
export class FitModule {}
