import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ISSUER: z.string().default("fitme-api"),
  JWT_AUDIENCE: z.string().default("fitme-clients"),
  ACCESS_TOKEN_TTL: z.string().default("7d"),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  MINIO_REGION: z.string().default("us-east-1"),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_PUBLIC_URL: z.string().url().optional(),
  TRYON_PROVIDER: z.enum(["mock", "http"]).default("mock"),
  TRYON_HTTP_BASE_URL: z.string().url()
});

export type AppEnv = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>) => envSchema.parse(config);
