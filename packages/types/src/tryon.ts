import { z } from "zod";

export const tryOnRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  variantId: z.string(),
  provider: z.string(),
  imageUrl: z.string().url(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
});

export const tryOnResultSchema = z.object({
  requestId: z.string(),
  outputImageUrl: z.string().url(),
  overlayImageUrl: z.string().url().nullable().optional(),
  confidence: z.number(),
  summary: z.string()
});

export type TryOnRequest = z.infer<typeof tryOnRequestSchema>;
export type TryOnResult = z.infer<typeof tryOnResultSchema>;
