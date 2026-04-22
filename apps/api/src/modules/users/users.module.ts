import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
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
      (this.prisma.savedLook as any).findMany({
        where: { userId },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" }
      })
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

    const upload = dto.avatarUploadId
      ? await (this.prisma.upload as any).findUnique({ where: { id: dto.avatarUploadId } })
      : null;

    if (dto.avatarUploadId && (!upload || upload.userId !== userId)) {
      throw new BadRequestException("Profile image upload is invalid for this user");
    }

    const data = {
      ...dto,
      avatarUploadId: upload?.id ?? dto.avatarUploadId ?? null,
      avatarUrl: upload?.publicUrl ?? dto.avatarUrl ?? null,
      stylePreference: dto.stylePreference as Prisma.InputJsonValue | undefined
    };

    const profile = await (this.prisma.profile as any).upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data
      },
      include: { avatarUpload: true }
    });

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
