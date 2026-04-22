import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

import { AuthorizationService } from "../../common/auth/authorization.service";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { PrismaService } from "../../common/prisma.service";

class SavedLookDto {
  @IsString()
  userId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  productIds!: string[];
}

@Injectable()
class SavedLooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these saved looks");

    return this.prisma.savedLook.findMany({
      where: { userId: targetUserId },
      include: { items: { include: { product: true } }, user: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  create(user: AuthenticatedUser, dto: SavedLookDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this saved look");
    return this.prisma.savedLook.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        note: dto.note,
        items: {
          create: dto.productIds.map((productId) => ({ productId }))
        }
      },
      include: { items: { include: { product: true } } }
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: SavedLookDto) {
    const existing = await this.prisma.savedLook.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot update this saved look");
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot reassign this saved look");

    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: id } });
    return this.prisma.savedLook.update({
      where: { id },
      data: {
        name: dto.name,
        note: dto.note,
        items: {
          create: dto.productIds.map((productId) => ({ productId }))
        }
      },
      include: { items: { include: { product: true } } }
    });
  }

  async delete(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.savedLook.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot delete this saved look");
    return this.prisma.savedLook.delete({ where: { id } });
  }
}

@ApiBearerAuth()
@ApiTags("saved-looks")
@Controller("saved-looks")
class SavedLooksController {
  constructor(private readonly service: SavedLooksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.service.list(user, userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SavedLookDto) {
    return this.service.create(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SavedLookDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.delete(user, id);
  }
}

@Module({
  controllers: [SavedLooksController],
  providers: [SavedLooksService, PrismaService],
  exports: [SavedLooksService]
})
export class SavedLooksModule {}
