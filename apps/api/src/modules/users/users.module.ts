import { Body, Controller, Get, Injectable, Module, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

import { PrismaService } from "../../common/prisma.service";

class UpdateProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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
  stylePreference?: Record<string, unknown>;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  avoidedColors!: string[];
}

@Injectable()
class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({ include: { profile: true } });
  }

  getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, measurements: true, savedLooks: true }
    });
  }

  getProfile(userId: string) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    const data = {
      ...dto,
      stylePreference: dto.stylePreference as Prisma.InputJsonValue | undefined
    };

    return this.prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  }
}

@ApiTags("users")
@Controller("users")
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.getUser(id);
  }
}

@ApiTags("profile")
@Controller("profile")
class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":userId")
  getProfile(@Param("userId") userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put(":userId")
  updateProfile(@Param("userId") userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }
}

@Module({
  controllers: [UsersController, ProfileController],
  providers: [UsersService, PrismaService],
  exports: [UsersService]
})
export class UsersModule {}
