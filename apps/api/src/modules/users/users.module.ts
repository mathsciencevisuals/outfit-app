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

    const dbUser: any = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { avatarUpload: true } }, measurements: true, savedLooks: { include: { items: { include: { product: true } } } } }
    } as any);

    if (!dbUser?.profile) {
      return null;
    }

    return {
      ...dbUser.profile,
      measurements: dbUser.measurements ?? [],
      savedLooks: dbUser.savedLooks ?? []
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
