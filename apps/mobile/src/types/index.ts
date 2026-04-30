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
  secondaryColors?: string[];
  materials?: string[];
  styleTags?: string[];
  occasionTags?: string[];
  description?: string;
  imageUrl?: string | null;
  trending?: boolean;
  instagramLikes?: string;
  variants: ProductVariant[];
}

export interface UserProfile {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyShape?: string | null;
  fitPreference?: 'slim' | 'regular' | 'relaxed' | null;
  preferredColors?: string[];
  avoidedColors?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetLabel?: string | null;
  closetStatus?: string | null;
  stylePreference?: Record<string, unknown> | null;
  stylePreferences?: string[];
  defaultSize?: string;
  measurements?: Measurement[];
  savedLooks?: SavedLook[];
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
  shoulderCm?: number;
  shouldersCm?: number;
  heightCm?: number;
  footLengthCm?: number;
  source?: string;
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

export type ViewAngle = 'front' | 'back' | 'side_left' | 'side_right';

export const VIEW_ANGLE_LABELS: Record<ViewAngle, string> = {
  front:      'Front',
  back:       'Back',
  side_left:  'Left',
  side_right: 'Right',
};

export interface TryOnRequest {
  id: string;
  userId: string;
  variantId: string;
  status: TryOnStatus;
  createdAt: string;
}

export interface TryOnResult {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | TryOnStatus;
  result?: {
    id: string;
    outputImageUrl: string;
    overlayImageUrl?: string;
    confidence: number;
    summary: string;
    metadata?: {
      views?: Partial<Record<ViewAngle, string>>;
      [key: string]: unknown;
    };
  } | null;
}

// ─── Recommendation Types ──────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  productId: string;
  product?: Product;
  score: number;
  explanation: string;
}

export type TrendSource = 'pinterest' | 'internal' | 'hybrid';

export interface PersonalizedTrendItem {
  name: string;
  score: number;
  source: TrendSource;
  image: string | null;
  cta: string;
  reasons: string[];
  product: Product;
}

export interface PersonalizedTrendingResponse {
  trendingForYou: PersonalizedTrendItem[];
  popularInApp: PersonalizedTrendItem[];
  globalTrends: PersonalizedTrendItem[];
}

// ─── Saved Look Types ─────────────────────────────────────────────────────────

export interface SavedLookItem {
  id: string;
  productId: string;
  product?: Product;
}

export interface SavedLook {
  id: string;
  userId: string;
  name: string;
  note?: string;
  tryOnResultId?: string;
  tryOnImageUrl?: string;
  products?: Product[];
  items?: SavedLookItem[];
  createdAt: string;
}

// ─── Social / Trending ────────────────────────────────────────────────────────

export interface TrendingPin {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  sourceUrl: string;
  boardName: string;
  pinCount: number;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
