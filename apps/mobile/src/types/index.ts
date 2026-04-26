// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  colorHex?: string;
  imageUrl: string;
  inStock: boolean;
  price: number;
  currency: string;
}

export interface Product {
  id: string;
  name: string;
  brand: Brand;
  category: string;
  baseColor: string;
  description?: string;
  trending?: boolean;
  instagramLikes?: string;
  variants: ProductVariant[];
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
  heightCm?: number;
  bodyShape?: string;
  preferredColors?: string[];
  stylePreferences?: string[];
  defaultSize?: string;
}

export interface UserStats {
  tryOnsCount: number;
  savedCount: number;
  styleMatchPct: number;
  totalOrders: number;
  memberSince: string;
}

export interface Measurement {
  id: string;
  userId: string;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  inseamCm?: number;
  shouldersCm?: number;
  heightCm?: number;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  region: string;
  logoUrl?: string;
  websiteUrl?: string;
  inventoryOffers?: InventoryOffer[];
}

export interface InventoryOffer {
  id: string;
  shopId: string;
  variantId: string;
  price: number;
  currency: string;
  deliveryDays?: number;
}

// ─── Try-On Types ─────────────────────────────────────────────────────────────

export type TryOnStatus =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

export interface TryOnRequest {
  id: string;
  userId: string;
  variantId: string;
  status: TryOnStatus;
  createdAt: string;
}

export interface TryOnResult {
  id: string;
  status: TryOnStatus;
  resultImageUrl?: string;
  result?: {
    confidence: number;
    summary: string;
    fitNotes?: string[];
  };
}

// ─── Recommendation Types ──────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  productId: string;
  product?: Product;
  score: number;
  explanation: string;
}

// ─── Saved Look Types ─────────────────────────────────────────────────────────

export interface SavedLook {
  id: string;
  userId: string;
  name: string;
  note?: string;
  tryOnResultId?: string;
  tryOnImageUrl?: string;
  products: Product[];
  createdAt: string;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
