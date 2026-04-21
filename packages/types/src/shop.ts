import { z } from "zod";

export const inventoryOfferSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  variantId: z.string(),
  externalUrl: z.string().url(),
  stock: z.number(),
  price: z.number(),
  currency: z.string()
});

export const shopSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  url: z.string().url(),
  region: z.string()
});

export type Shop = z.infer<typeof shopSchema>;
export type InventoryOffer = z.infer<typeof inventoryOfferSchema>;
