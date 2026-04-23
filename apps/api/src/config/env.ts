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
    STORAGE_PROVIDER: z.enum(["cloudinary", "minio"]).default("cloudinary"),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default("fitme"),
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
    if (config.STORAGE_PROVIDER === "cloudinary") {
      if (!config.CLOUDINARY_CLOUD_NAME) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CLOUDINARY_CLOUD_NAME"], message: "CLOUDINARY_CLOUD_NAME is required when STORAGE_PROVIDER=cloudinary" });
      }
      if (!config.CLOUDINARY_API_KEY) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CLOUDINARY_API_KEY"], message: "CLOUDINARY_API_KEY is required when STORAGE_PROVIDER=cloudinary" });
      }
      if (!config.CLOUDINARY_API_SECRET) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CLOUDINARY_API_SECRET"], message: "CLOUDINARY_API_SECRET is required when STORAGE_PROVIDER=cloudinary" });
      }
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
