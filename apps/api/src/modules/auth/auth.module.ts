import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { compare, hash } from "bcryptjs";
import { IsEmail, IsString, MinLength } from "class-validator";

import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { Public } from "../../common/auth/public.decorator";
import { PrismaService } from "../../common/prisma.service";

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash
      }
    });

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Profile" (
        id,
        "userId",
        "firstName",
        "lastName",
        "preferredColors",
        "avoidedColors",
        "fitPreference",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${dto.firstName},
        ${dto.lastName},
        ARRAY[]::text[],
        ARRAY[]::text[],
        ${"regular"},
        NOW(),
        NOW()
      )
    `);

    const profile = await this.getSafeProfile(user.id);
    return this.issueAuthResponse({ ...user, profile });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const profile = await this.getSafeProfile(user.id);
    return this.issueAuthResponse({ ...user, profile });
  }

  async session(user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      throw new UnauthorizedException("Account no longer exists");
    }

    const profile = await this.getSafeProfile(dbUser.id);

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        profile
      }
    };
  }

  private async getSafeProfile(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<SafeProfileRow>>(Prisma.sql`
      SELECT
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
      fitPreference: profile.fitPreference ?? "regular",
      preferredColors: profile.preferredColors ?? [],
      avoidedColors: profile.avoidedColors ?? [],
      closetStatus: profile.closetStatus ?? "COMING_SOON"
    };
  }

  private issueAuthResponse(user: { id: string; email: string; role: string; profile: unknown }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access"
    });

    return {
      accessToken,
      expiresIn: this.configService.getOrThrow<string>("ACCESS_TOKEN_TTL"),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    };
  }
}

@ApiTags("auth")
@Controller("auth")
class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get("session")
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.session(user);
  }
}

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService]
})
export class AuthModule {}
