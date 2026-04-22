import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Roles } from "../../common/auth/roles.decorator";
import { PrismaService } from "../../common/prisma.service";
import { RewardsModule, RewardsService } from "../rewards/rewards.module";

class UpdateProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  avatarUploadId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsString()
  bodyShape?: string;

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsString()
  budgetLabel?: string;

  @IsOptional()
  @IsString()
  closetStatus?: string;

  @IsOptional()
  stylePreference?: Record<string, unknown>;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  avoidedColors!: string[];
}

@Injectable()
class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly rewardsService: RewardsService
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

    let avatarUrl: string | null = dto.avatarUrl ?? null;
    if (dto.avatarUploadId) {
      const [upload] = await this.prisma.$queryRaw<
        Array<{ id: string; userId: string; publicUrl: string }>
      >(Prisma.sql`
        SELECT id, "userId", "publicUrl"
        FROM "Upload"
        WHERE id = ${dto.avatarUploadId}
        LIMIT 1
      `);

      if (!upload || upload.userId !== userId) {
        throw new BadRequestException("Profile image upload is invalid for this user");
      }

      avatarUrl = upload.publicUrl;
    }

    const [profile] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        firstName: string;
        lastName: string;
        gender: string | null;
        age: number | null;
        heightCm: number | null;
        weightKg: number | null;
        bodyShape: string | null;
        stylePreference: Prisma.JsonValue | null;
        preferredColors: string[] | null;
        avoidedColors: string[] | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      INSERT INTO "Profile" (
        id,
        "userId",
        "firstName",
        "lastName",
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
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
        ${dto.gender ?? null},
        ${dto.age ?? null},
        ${dto.heightCm ?? null},
        ${dto.weightKg ?? null},
        ${dto.bodyShape ?? null},
        CAST(${JSON.stringify(dto.stylePreference ?? null)} AS jsonb),
        ${this.toTextArray(dto.preferredColors)},
        ${this.toTextArray(dto.avoidedColors)},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        "heightCm" = EXCLUDED."heightCm",
        "weightKg" = EXCLUDED."weightKg",
        "bodyShape" = EXCLUDED."bodyShape",
        "stylePreference" = EXCLUDED."stylePreference",
        "preferredColors" = EXCLUDED."preferredColors",
        "avoidedColors" = EXCLUDED."avoidedColors",
        "updatedAt" = NOW()
      RETURNING
        id,
        "userId",
        "firstName",
        "lastName",
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
        "stylePreference",
        "preferredColors",
        "avoidedColors",
        "createdAt",
        "updatedAt"
    `);

    const completionSignals = [
      profile.firstName,
      profile.lastName,
      avatarUrl,
      profile.heightCm,
      profile.bodyShape,
      profile.preferredColors?.length ? "palette" : null
    ].filter(Boolean).length;

    if (completionSignals >= 6) {
      await this.rewardsService.awardProfileCompletion(userId);
    }

    return profile;
  }

  private async getSafeProfile(userId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        firstName: string;
        lastName: string;
        gender: string | null;
        age: number | null;
        heightCm: number | null;
        weightKg: number | null;
        bodyShape: string | null;
        stylePreference: Prisma.JsonValue | null;
        preferredColors: string[] | null;
        avoidedColors: string[] | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        "userId",
        "firstName",
        "lastName",
        gender,
        age,
        "heightCm",
        "weightKg",
        "bodyShape",
        "stylePreference",
        "preferredColors",
        "avoidedColors",
        "createdAt",
        "updatedAt"
      FROM "Profile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `);

    const profile = rows[0];
    if (!profile) {
      return null;
    }

    return {
      ...profile,
      avatarUploadId: null,
      avatarUrl: null,
      budgetMin: null,
      budgetMax: null,
      budgetLabel: null,
      closetStatus: "COMING_SOON"
    };
  }

  private async getSafeSavedLooks(userId: string) {
    const looks = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        name: string;
        note: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT id, "userId", name, note, "createdAt", "updatedAt"
      FROM "SavedLook"
      WHERE "userId" = ${userId}
      ORDER BY "updatedAt" DESC
    `);

    if (looks.length === 0) {
      return [];
    }

    const items = await this.prisma.savedLookItem.findMany({
      where: { savedLookId: { in: looks.map((look) => look.id) } },
      include: { product: true }
    });

    return looks.map((look) => ({
      ...look,
      isWishlist: false,
      items: items.filter((item) => item.savedLookId === look.id)
    }));
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

  @Put(":userId")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user, userId, dto);
  }
}

@Module({
  imports: [RewardsModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, PrismaService],
  exports: [UsersService]
})
export class UsersModule {}
