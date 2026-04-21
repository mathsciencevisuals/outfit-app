import { z } from "zod";

export const userRoleSchema = z.enum(["USER", "ADMIN"]);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  createdAt: z.string().datetime().optional()
});

export const profileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  bodyShape: z.string().nullable().optional(),
  stylePreference: z.record(z.any()).nullable().optional(),
  preferredColors: z.array(z.string()).default([]),
  avoidedColors: z.array(z.string()).default([])
});

export type User = z.infer<typeof userSchema>;
export type Profile = z.infer<typeof profileSchema>;
