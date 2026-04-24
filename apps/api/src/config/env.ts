import { z } from "zod";

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    JWT_ISSUER: z.string().default("fitme-api"),
    JWT_AUDIENCE: z.string().default("fitme-clients"),
    ACCESS_TOKEN_TTL: z.string().default("7d"),
    STORAGE_PROVIDER: z.enum(["gcs", "minio"]).default("gcs"),
    GCS_BUCKET: z.string().optional(),
    GCS_PROJECT_ID: z.string().optional(),
    GCS_PUBLIC_BASE_URL: z.string().url().optional(),
    MINIO_ENDPOINT: z.string().optional(),
    MINIO_PORT: z.coerce.number().optional(),
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().optional(),
    MINIO_REGION: z.string().default("us-east-1"),
    MINIO_USE_SSL: z.coerce.boolean().default(false),
    MINIO_PUBLIC_URL: z.string().url().optional(),
    TRYON_PROVIDER: z.enum(["mock", "http"]).default("mock"),
    TRYON_HTTP_BASE_URL: z.string().optional()
  })
  .superRefine((config, ctx) => {
    if (config.STORAGE_PROVIDER === "gcs" && !config.GCS_BUCKET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GCS_BUCKET"], message: "GCS_BUCKET is required when STORAGE_PROVIDER=gcs" });
    }

    if (config.STORAGE_PROVIDER === "minio") {
      for (const key of ["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"] as const) {
        if (!config[key]) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required when STORAGE_PROVIDER=minio` });
        }
      }
      if (!config.MINIO_PORT) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MINIO_PORT"], message: "MINIO_PORT is required when STORAGE_PROVIDER=minio" });
      }
    }

    if (config.TRYON_PROVIDER === "http" && !config.TRYON_HTTP_BASE_URL) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["TRYON_HTTP_BASE_URL"], message: "TRYON_HTTP_BASE_URL is required when TRYON_PROVIDER=http" });
    }

    if (config.TRYON_HTTP_BASE_URL) {
      const result = z.string().url().safeParse(config.TRYON_HTTP_BASE_URL);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["TRYON_HTTP_BASE_URL"], message: "TRYON_HTTP_BASE_URL must be a valid URL" });
      }
    }
  });

export const envSchema = baseEnvSchema;

export type AppEnv = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>) => envSchema.parse(config);
