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
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

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

  @IsOptional()
  @IsBoolean()
  isWishlist?: boolean;

  @IsArray()
  productIds!: string[];
}

@Injectable()
class SavedLooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  async list(user: AuthenticatedUser, userId?: string) {
    const targetUserId = userId ?? user.id;
    this.authorizationService.assertSelfOrPrivileged(user, targetUserId, "You cannot view these saved looks");

    return this.readLooks(targetUserId);
  }

  async create(user: AuthenticatedUser, dto: SavedLookDto) {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot create this saved look");
    const lookId = randomUUID();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SavedLook" (id, "userId", name, note, "createdAt", "updatedAt")
      VALUES (${lookId}, ${dto.userId}, ${dto.name}, ${dto.note ?? null}, NOW(), NOW())
    `);

    if (dto.productIds.length > 0) {
      await this.prisma.savedLookItem.createMany({
        data: dto.productIds.map((productId) => ({
          id: randomUUID(),
          savedLookId: lookId,
          productId
        }))
      });
    }

    return this.readLook(lookId);
  }

  async update(user: AuthenticatedUser, id: string, dto: SavedLookDto) {
    const existing = await this.readLookRecord(id);
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot update this saved look");
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "You cannot reassign this saved look");

    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: id } });
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "SavedLook"
      SET name = ${dto.name},
          note = ${dto.note ?? null},
          "updatedAt" = NOW()
      WHERE id = ${id}
    `);

    if (dto.productIds.length > 0) {
      await this.prisma.savedLookItem.createMany({
        data: dto.productIds.map((productId) => ({
          id: randomUUID(),
          savedLookId: id,
          productId
        }))
      });
    }

    return this.readLook(id);
  }

  async delete(user: AuthenticatedUser, id: string) {
    const existing = await this.readLookRecord(id);
    if (!existing) {
      return null;
    }

    this.authorizationService.assertSelfOrPrivileged(user, existing.userId, "You cannot delete this saved look");
    await this.prisma.savedLookItem.deleteMany({ where: { savedLookId: id } });
    await this.prisma.$executeRaw(Prisma.sql`DELETE FROM "SavedLook" WHERE id = ${id}`);
    return { id };
  }

  private async readLookRecord(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; name: string; note: string | null; createdAt: Date; updatedAt: Date }>
    >(Prisma.sql`
      SELECT id, "userId", name, note, "createdAt", "updatedAt"
      FROM "SavedLook"
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async readLook(id: string) {
    const look = await this.readLookRecord(id);
    if (!look) {
      return null;
    }

    const items = await this.prisma.savedLookItem.findMany({
      where: { savedLookId: id },
      include: { product: true }
    });

    return {
      ...look,
      isWishlist: false,
      items
    };
  }

  private async readLooks(userId: string) {
    const looks = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string; name: string; note: string | null; createdAt: Date; updatedAt: Date }>
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
