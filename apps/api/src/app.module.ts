import { BullModule } from "@nestjs/bullmq";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { LoggerModule } from "nestjs-pino";

import { validateEnv } from "./config/env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformResponseInterceptor } from "./common/interceptors/transform-response.interceptor";
import { pinoLoggerConfig } from "./common/logger";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { PrismaService } from "./common/prisma.service";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { MeasurementsModule } from "./modules/measurements/measurements.module";
import { StylePreferencesModule } from "./modules/style-preferences/style-preferences.module";
import { ProductsModule } from "./modules/products/products.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { SizeChartsModule } from "./modules/size-charts/size-charts.module";
import { ShopsModule } from "./modules/shops/shops.module";
import { TryOnModule } from "./modules/tryon/tryon.module";
import { FitModule } from "./modules/fit/fit.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { SavedLooksModule } from "./modules/saved-looks/saved-looks.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { HealthModule } from "./modules/health/health.module";
import { TRYON_QUEUE } from "./jobs/queues/tryon.queue";
import { TryOnWorker } from "./jobs/workers/tryon.worker";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({ pinoHttp: pinoLoggerConfig }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" }
      })
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: { url: configService.getOrThrow<string>("REDIS_URL") }
      })
    }),
    BullModule.registerQueue({ name: TRYON_QUEUE }),
    AuthModule,
    UsersModule,
    MeasurementsModule,
    StylePreferencesModule,
    ProductsModule,
    BrandsModule,
    SizeChartsModule,
    ShopsModule,
    TryOnModule,
    FitModule,
    RecommendationsModule,
    SavedLooksModule,
    UploadsModule,
    HealthModule
  ],
  providers: [PrismaService, HttpExceptionFilter, TransformResponseInterceptor, TryOnWorker]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
