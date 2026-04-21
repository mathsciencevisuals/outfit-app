import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../common/prisma.service";

@Injectable()
class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      timestamp: new Date().toISOString()
    };
  }
}

@ApiTags("health")
@Controller("health")
class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  status() {
    return this.service.status();
  }
}

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaService]
})
export class HealthModule {}
