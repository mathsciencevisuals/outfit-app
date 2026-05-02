import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { IsArray, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

import { FileInterceptor } from "@nestjs/platform-express";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";
import { UploadsModule, UploadsService } from "../uploads/uploads.module";

const { memoryStorage } = require("multer") as { memoryStorage: () => unknown };

class UpdateProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  avatarUploadId?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @IsNumber()
  age?: number | null;

  @IsOptional()
  @IsNumber()
  heightCm?: number | null;

  @IsOptional()
  @IsNumber()
  weightKg?: number | null;

  @IsOptional()
  @IsString()
  bodyShape?: string | null;

  @IsOptional()
  @IsIn(["slim", "regular", "relaxed"])
  fitPreference?: "slim" | "regular" | "relaxed" | null;

  @IsOptional()
  @IsNumber()
  budgetMin?: number | null;

  @IsOptional()
  @IsNumber()
  budgetMax?: number | null;

  @IsOptional()
  @IsString()
  budgetLabel?: string | null;

  @IsOptional()
  @IsString()
  closetStatus?: string | null;

  @IsOptional()
  stylePreference?: Record<string, unknown> | null;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  avoidedColors!: string[];
}

type SafeProfileRow = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUploadId: string | null;
  avatarUrl: string | null;
  gender: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyShape: string | null;
  fitPreference: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetLabel: string | null;
  closetStatus: string | null;
  stylePreference: Prisma.JsonValue | null;
  preferredColors: string[] | null;
  avoidedColors: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

const OPTIONAL_PROFILE_COLUMNS = [
  "avatarUploadId",
  "avatarUrl",
  "fitPreference",
  "budgetMin",
  "budgetMax",
  "budgetLabel",
  "closetStatus"
] as const;

type OptionalProfileColumn = (typeof OPTIONAL_PROFILE_COLUMNS)[number];

const OPTIONAL_SAVED_LOOK_COLUMNS = ["isWishlist"] as const;
type OptionalSavedLookColumn = (typeof OPTIONAL_SAVED_LOOK_COLUMNS)[number];

@Injectable()
class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService,
    private readonly uploadsService: UploadsService
  ) {}

  listUsers() {
    return this.prisma.user.findMany({ include: { profile: true } } as any);
  }

  getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, measurements: true, savedLooks: true }
    } as any);
  }

  async getProfile(user: AuthenticatedUser, userId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot access this profile");

    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!exists) {
      return null;
    }

    const [profile, measurements, savedLooks] = await Promise.all([
      this.getSafeProfile(userId),
      this.prisma.measurement.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      } as any),
      this.getSafeSavedLooks(userId)
    ]);

    if (!profile) {
      return null;
    }

    return {
      ...profile,
      measurements: measurements ?? [],
      savedLooks: savedLooks ?? []
    };
  }

  async updateProfile(user: AuthenticatedUser, userId: string, dto: UpdateProfileDto) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot update this profile");

    const existingProfile = await this.getSafeProfile(userId);

    let avatarUploadId: string | null =
      dto.avatarUploadId === undefined ? existingProfile?.avatarUploadId ?? null : dto.avatarUploadId ?? null;
    let avatarUrl: string | null =
      dto.avatarUrl === undefined ? existingProfile?.avatarUrl ?? null : dto.avatarUrl ?? null;
    const fitPreference = dto.fitPreference ?? existingProfile?.fitPreference ?? "regular";

    if (avatarUploadId) {
      const [upload] = await this.prisma.$queryRaw<
        Array<{ id: string; userId: string; publicUrl: string }>
      >(Prisma.sql`
        SELECT id, "userId", "publicUrl"
        FROM "Upload"
        WHERE id = ${avatarUploadId}
        LIMIT 1
      `);

      if (!upload || upload.userId !== userId) {
        throw new BadRequestException("Profile image upload is invalid for this user");
      }

      avatarUploadId = upload.id;
      avatarUrl = upload.publicUrl;
    } else if (avatarUrl == null) {
      avatarUrl = null;
    }

    const [profile] = await this.prisma.$queryRaw<Array<SafeProfileRow>>(Prisma.sql`
      INSERT INTO "Profile" (
        id,
        "userId",
        "firstName",
        "lastName",
        "avatarUploadId",
        "avatarUrl",
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
        "fitPreference",
        "budgetMin",
        "budgetMax",
        "budgetLabel",
        "closetStatus",
        "stylePreference",
        "preferredColors",
        "avoidedColors",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${dto.firstName},
        ${dto.lastName},
        ${avatarUploadId},
        ${avatarUrl},
        ${dto.gender ?? null},
        ${dto.age ?? null},
        ${dto.heightCm ?? null},
        ${dto.weightKg ?? null},
        ${dto.bodyShape ?? null},
        ${fitPreference},
        ${dto.budgetMin ?? null},
        ${dto.budgetMax ?? null},
        ${dto.budgetLabel ?? null},
        ${dto.closetStatus ?? "COMING_SOON"},
        CAST(${JSON.stringify(dto.stylePreference ?? null)} AS jsonb),
        ${this.toTextArray(dto.preferredColors)},
        ${this.toTextArray(dto.avoidedColors)},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "avatarUploadId" = EXCLUDED."avatarUploadId",
        "avatarUrl" = EXCLUDED."avatarUrl",
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        "heightCm" = EXCLUDED."heightCm",
        "weightKg" = EXCLUDED."weightKg",
        "bodyShape" = EXCLUDED."bodyShape",
        "fitPreference" = EXCLUDED."fitPreference",
        "budgetMin" = EXCLUDED."budgetMin",
        "budgetMax" = EXCLUDED."budgetMax",
        "budgetLabel" = EXCLUDED."budgetLabel",
        "closetStatus" = EXCLUDED."closetStatus",
        "stylePreference" = EXCLUDED."stylePreference",
        "preferredColors" = EXCLUDED."preferredColors",
        "avoidedColors" = EXCLUDED."avoidedColors",
        "updatedAt" = NOW()
      RETURNING
        id,
        "userId",
        "firstName",
        "lastName",
        "avatarUploadId",
        "avatarUrl",
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
        "fitPreference",
        "budgetMin",
        "budgetMax",
        "budgetLabel",
        "closetStatus",
        "stylePreference",
        "preferredColors",
        "avoidedColors",
        "createdAt",
        "updatedAt"
    `);

    const completionSignals = [
      profile.firstName,
      profile.lastName,
      profile.avatarUrl,
      profile.heightCm,
      profile.bodyShape,
      profile.preferredColors?.length ? "palette" : null
    ].filter(Boolean).length;

    if (completionSignals >= 6) {
      await this.rewardsService.awardProfileCompletion(userId);
    }

    return {
      ...profile,
      fitPreference: profile.fitPreference ?? "regular",
      preferredColors: profile.preferredColors ?? [],
      avoidedColors: profile.avoidedColors ?? [],
      closetStatus: profile.closetStatus ?? "COMING_SOON"
    };
  }

  async getStats(user: AuthenticatedUser, userId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot access these stats");

    const [userData, tryOnCount, savedLooksCount, recs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      this.prisma.tryOnRequest.count({ where: { userId } }),
      this.prisma.savedLook.count({ where: { userId, isWishlist: false } }),
      this.prisma.recommendation.findMany({ where: { userId }, select: { score: true } })
    ]);

    const styleMatchPct =
      recs.length > 0
        ? Math.round(recs.reduce((sum, r) => sum + (r.score ?? 0), 0) / recs.length * 100)
        : 0;

    return {
      tryOnsCount: tryOnCount,
      savedCount: savedLooksCount,
      styleMatchPct: Math.min(styleMatchPct, 100),
      totalOrders: 0,
      memberSince: userData?.createdAt ?? null
    };
  }

  async getSavedProducts(user: AuthenticatedUser, userId: string): Promise<string[]> {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot access these saved products");

    const wishlist = await this.prisma.savedLook.findFirst({
      where: { userId, isWishlist: true },
      include: { items: { select: { productId: true } } }
    });

    return (wishlist?.items ?? []).map((item) => item.productId);
  }

  async saveSavedProduct(user: AuthenticatedUser, userId: string, productId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot save products for this user");

    const wishlist = await this.prisma.savedLook.upsert({
      where: { id: (await this.prisma.savedLook.findFirst({ where: { userId, isWishlist: true }, select: { id: true } }))?.id ?? "" },
      create: { userId, name: "Wishlist", isWishlist: true, items: { create: { productId } } },
      update: {},
      include: { items: { select: { productId: true } } }
    });

    const alreadySaved = wishlist.items.some((item) => item.productId === productId);
    if (!alreadySaved) {
      await this.prisma.savedLookItem.create({ data: { savedLookId: wishlist.id, productId } });
    }

    return { saved: true, productId };
  }

  async removeSavedProduct(user: AuthenticatedUser, userId: string, productId: string) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot modify saved products for this user");

    const wishlist = await this.prisma.savedLook.findFirst({ where: { userId, isWishlist: true }, select: { id: true } });
    if (!wishlist) {
      throw new NotFoundException("No wishlist found for this user");
    }

    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: wishlist.id, productId } });
    return { saved: false, productId };
  }

  async uploadProfilePhoto(
    user: AuthenticatedUser,
    userId: string,
    file: { buffer?: Buffer; mimetype?: string; size?: number; originalname?: string }
  ) {
    this.authorizationService.assertSelfOrPrivileged(user, userId, "You cannot upload a photo for this user");

    const uploadSession = await this.uploadsService.create(user, {
      userId,
      mimeType: file.mimetype ?? "image/jpeg",
      purpose: "avatar"
    });

    const uploaded = await this.uploadsService.uploadFile(user, uploadSession.upload.id, { userId }, file);
    const avatarUrl = uploaded.publicUrl;

    await this.prisma.$executeRaw`
      UPDATE "Profile" SET "avatarUrl" = ${avatarUrl}, "updatedAt" = NOW()
      WHERE "userId" = ${userId}
    `;

    return { avatarUrl };
  }

  private async getSafeProfile(userId: string) {
    const availableColumns = await this.getProfileColumns();
    const optionalSelects: Record<OptionalProfileColumn, string> = {
      avatarUploadId: availableColumns.has("avatarUploadId")
        ? `"avatarUploadId"`
        : `NULL::text AS "avatarUploadId"`,
      avatarUrl: availableColumns.has("avatarUrl")
        ? `"avatarUrl"`
        : `NULL::text AS "avatarUrl"`,
      fitPreference: availableColumns.has("fitPreference")
        ? `"fitPreference"`
        : `NULL::text AS "fitPreference"`,
      budgetMin: availableColumns.has("budgetMin")
        ? `"budgetMin"`
        : `NULL::double precision AS "budgetMin"`,
      budgetMax: availableColumns.has("budgetMax")
        ? `"budgetMax"`
        : `NULL::double precision AS "budgetMax"`,
      budgetLabel: availableColumns.has("budgetLabel")
        ? `"budgetLabel"`
        : `NULL::text AS "budgetLabel"`,
      closetStatus: availableColumns.has("closetStatus")
        ? `"closetStatus"`
        : `'COMING_SOON'::text AS "closetStatus"`
    };

    const rows = await this.prisma.$queryRawUnsafe<Array<SafeProfileRow>>(
      `
      SELECT
        id,
        "userId",
        "firstName",
        "lastName",
        ${optionalSelects.avatarUploadId},
        ${optionalSelects.avatarUrl},
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
        ${optionalSelects.fitPreference},
        ${optionalSelects.budgetMin},
        ${optionalSelects.budgetMax},
        ${optionalSelects.budgetLabel},
        ${optionalSelects.closetStatus},
        "stylePreference",
        "preferredColors",
        "avoidedColors",
        "createdAt",
        "updatedAt"
      FROM "Profile"
      WHERE "userId" = $1
      LIMIT 1
    `,
      userId
    );

    const profile = rows[0];
    if (!profile) {
      return null;
    }

    return {
      ...profile,
      fitPreference: profile.fitPreference ?? "regular",
      preferredColors: profile.preferredColors ?? [],
      avoidedColors: profile.avoidedColors ?? [],
      closetStatus: profile.closetStatus ?? "COMING_SOON"
    };
  }

  private async getProfileColumns() {
    const rows = await this.prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Profile'
    `);

    return new Set(rows.map((row) => row.column_name));
  }

  private async getSafeSavedLooks(userId: string) {
    const savedLookColumns = await this.getSavedLookColumns();
    const optionalSelects: Record<OptionalSavedLookColumn, string> = {
      isWishlist: savedLookColumns.has("isWishlist") ? `"isWishlist"` : `FALSE AS "isWishlist"`
    };

    const looks = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        userId: string;
        name: string;
        note: string | null;
        isWishlist: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(
      `
      SELECT id, "userId", name, note, ${optionalSelects.isWishlist}, "createdAt", "updatedAt"
      FROM "SavedLook"
      WHERE "userId" = $1
      ORDER BY "updatedAt" DESC
    `,
      userId
    );

    if (looks.length === 0) {
      return [];
    }

    const items = await this.prisma.savedLookItem.findMany({
      where: { savedLookId: { in: looks.map((look) => look.id) } },
      include: { product: true }
    });

    return looks.map((look) => ({
      ...look,
      items: items.filter((item) => item.savedLookId === look.id)
    }));
  }

  private async getSavedLookColumns() {
    const rows = await this.prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'SavedLook'
    `);

    return new Set(rows.map((row) => row.column_name));
  }

  private toTextArray(values: string[]) {
    if (values.length === 0) {
      return Prisma.sql`ARRAY[]::text[]`;
    }

    return Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;
  }
}

@ApiBearerAuth()
@ApiTags("users")
@Controller("users")
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles("ADMIN")
  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Roles("ADMIN")
  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.getUser(id);
  }
}

@ApiBearerAuth()
@ApiTags("profile")
@Controller("profile")
class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":userId")
  getProfile(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.usersService.getProfile(user, userId);
  }

  @Get(":userId/stats")
  getStats(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.usersService.getStats(user, userId);
  }

  @Put(":userId")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user, userId, dto);
  }

  @Post(":userId/photo")
  @UseInterceptors(FileInterceptor("photo", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @UploadedFile() file: { buffer?: Buffer; mimetype?: string; size?: number; originalname?: string }
  ) {
    return this.usersService.uploadProfilePhoto(user, userId, file);
  }
}

class SaveProductDto {
  @IsString()
  productId!: string;
}

@ApiBearerAuth()
@ApiTags("users")
@Controller("users")
class SavedProductsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":userId/saved-products")
  getSavedProducts(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string) {
    return this.usersService.getSavedProducts(user, userId);
  }

  @Post(":userId/saved-products")
  saveSavedProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: SaveProductDto
  ) {
    return this.usersService.saveSavedProduct(user, userId, dto.productId);
  }

  @Delete(":userId/saved-products/:productId")
  removeSavedProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Param("productId") productId: string
  ) {
    return this.usersService.removeSavedProduct(user, userId, productId);
  }
}

@Module({
  imports: [RewardsModule, UploadsModule],
  controllers: [UsersController, ProfileController, SavedProductsController],
  providers: [UsersService, PrismaService],
  exports: [UsersService]
})
export class UsersModule {}
