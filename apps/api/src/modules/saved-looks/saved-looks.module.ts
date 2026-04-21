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
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

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
  constructor(private readonly prisma: PrismaService) {}

  list(userId?: string) {
    return this.prisma.savedLook.findMany({
      where: userId ? { userId } : undefined,
      include: { items: { include: { product: true } }, user: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  create(dto: SavedLookDto) {
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

  async update(id: string, dto: SavedLookDto) {
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

  delete(id: string) {
    return this.prisma.savedLook.delete({ where: { id } });
  }
}

@ApiTags("saved-looks")
@Controller("saved-looks")
class SavedLooksController {
  constructor(private readonly service: SavedLooksService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    return this.service.list(userId);
  }

  @Post()
  create(@Body() dto: SavedLookDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: SavedLookDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}

@Module({
  controllers: [SavedLooksController],
  providers: [SavedLooksService, PrismaService],
  exports: [SavedLooksService]
})
export class SavedLooksModule {}
