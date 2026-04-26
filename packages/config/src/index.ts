import { z } from "zod";

export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).optional().default("false")
});

export const adminEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url()
});

export const parseMobileEnv = (input: Record<string, unknown>) => mobileEnvSchema.parse(input);
export const parseAdminEnv = (input: Record<string, unknown>) => adminEnvSchema.parse(input);
