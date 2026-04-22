import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { PrismaService } from "../prisma.service";
import { AuthenticatedUser, JwtSessionPayload } from "./auth.types";
import { IS_PUBLIC_ROUTE } from "./public.decorator";

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    let payload: JwtSessionPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtSessionPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        issuer: this.configService.getOrThrow<string>("JWT_ISSUER"),
        audience: this.configService.getOrThrow<string>("JWT_AUDIENCE")
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    if (payload.type !== "access" || !payload.sub) {
      throw new UnauthorizedException("Invalid access token payload");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role as AuthenticatedUser["role"]
    };

    return true;
  }

  private extractBearerToken(request: Request) {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return token;
  }
}
