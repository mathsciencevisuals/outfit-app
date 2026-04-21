import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sku: z.string(),
  sizeLabel: z.string(),
  color: z.string(),
  price: z.number(),
  currency: z.string()
});

export const productSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  description: z.string(),
  baseColor: z.string(),
  secondaryColors: z.array(z.string()),
  materials: z.array(z.string()),
  styleTags: z.array(z.string()),
  variants: z.array(productVariantSchema).default([])
});

export const sizeChartEntrySchema = z.object({
  sizeLabel: z.string(),
  chestMinCm: z.number().nullable().optional(),
  chestMaxCm: z.number().nullable().optional(),
  waistMinCm: z.number().nullable().optional(),
  waistMaxCm: z.number().nullable().optional(),
  hipsMinCm: z.number().nullable().optional(),
  hipsMaxCm: z.number().nullable().optional(),
  inseamMinCm: z.number().nullable().optional(),
  inseamMaxCm: z.number().nullable().optional()
});

export type Product = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type SizeChartEntry = z.infer<typeof sizeChartEntrySchema>;
