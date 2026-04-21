import { z } from "zod";

export const measurementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  chestCm: z.number().nullable().optional(),
  waistCm: z.number().nullable().optional(),
  hipsCm: z.number().nullable().optional(),
  inseamCm: z.number().nullable().optional(),
  shoulderCm: z.number().nullable().optional(),
  footLengthCm: z.number().nullable().optional(),
  source: z.string()
});

export type Measurement = z.infer<typeof measurementSchema>;
