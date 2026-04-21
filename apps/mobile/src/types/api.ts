export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  heightCm?: number;
  bodyShape?: string;
  preferredColors?: string[];
}

export interface Measurement {
  id: string;
  userId: string;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  inseamCm?: number;
}

export interface ProductVariant {
  id: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: { name: string };
  category: string;
  baseColor: string;
  variants?: ProductVariant[];
}

export interface Recommendation {
  id?: string;
  productId: string;
  product?: { name: string };
  score: number;
  explanation?: string;
}

export interface Shop {
  id: string;
  name: string;
  region: string;
  inventoryOffers?: unknown[];
}

export interface SavedLook {
  id: string;
  name: string;
  note?: string;
}

export interface TryOnRequest {
  id: string;
}

export interface TryOnResult {
  id: string;
  status: string;
  result?: {
    confidence: number;
    summary: string;
  };
}
