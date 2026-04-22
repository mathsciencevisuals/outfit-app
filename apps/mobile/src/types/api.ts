export type UserRole = "USER" | "ADMIN" | "OPERATOR";

export type RewardReason =
  | "FIRST_TRY_ON"
  | "LOOK_SHARE"
  | "REFERRAL_INVITE"
  | "REFERRAL_SUCCESS"
  | "PROFILE_COMPLETE"
  | "CHALLENGE_PARTICIPATION"
  | "COUPON_UNLOCK"
  | "COUPON_REDEEM"
  | "ADMIN_ADJUSTMENT";

export type RewardTransactionType = "EARN" | "SPEND" | "ADJUSTMENT";
export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "BONUS";
export type CouponRedemptionStatus = "UNLOCKED" | "REDEEMED" | "EXPIRED";
export type CampaignTheme = "CAMPUS_CASUAL" | "INTERVIEW_READY" | "FEST_LOOK" | "BUDGET_UNDER_999";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ChallengeStatus = "JOINED" | "COMPLETED" | "CLAIMED";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyShape?: string | null;
  preferredColors?: string[];
  avoidedColors?: string[];
  stylePreference?: Record<string, unknown> | null;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: string;
  user: SessionUser;
}

export interface SessionResponse {
  user: SessionUser;
}

export interface Measurement {
  id: string;
  userId: string;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  inseamCm?: number | null;
  shoulderCm?: number | null;
  footLengthCm?: number | null;
  source?: string;
}

export interface InventoryOffer {
  id: string;
  externalUrl: string;
  stock: number;
  price: number;
  currency: string;
  variant?: ProductVariant & {
    product?: Product;
  };
}

export interface ProductVariant {
  id: string;
  sizeLabel?: string;
  color?: string;
  imageUrl?: string | null;
  price?: number;
  currency?: string;
  inventoryOffers?: InventoryOffer[];
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  baseColor: string;
  secondaryColors?: string[];
  materials?: string[];
  styleTags?: string[];
  imageUrl?: string | null;
  brand?: { name: string };
  variants?: ProductVariant[];
}

export interface Recommendation {
  id?: string;
  productId: string;
  product?: Product;
  score: number;
  explanation?: string;
}

export interface Shop {
  id: string;
  name: string;
  region: string;
  url?: string;
  inventoryOffers?: InventoryOffer[];
}

export interface SavedLookItem {
  id: string;
  productId: string;
  product?: Product;
}

export interface SavedLook {
  id: string;
  name: string;
  note?: string | null;
  items?: SavedLookItem[];
}

export interface UploadAsset {
  id: string;
  key: string;
  mimeType: string;
  bucket: string;
  publicUrl: string;
  createdAt: string;
}

export interface UploadSession {
  upload: UploadAsset;
  uploadPath: string;
  method: "POST";
}

export interface TryOnExecutionResult {
  id: string;
  requestId: string;
  outputImageUrl: string;
  overlayImageUrl?: string | null;
  confidence: number;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

export interface TryOnRequest {
  id: string;
  userId: string;
  variantId: string;
  provider: string;
  imageUrl: string;
  sourceUploadId?: string | null;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  statusMessage?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  sourceUpload?: UploadAsset | null;
  result?: TryOnExecutionResult | null;
  variant?: ProductVariant & { product?: Product };
}

export interface RewardWallet {
  id: string;
  userId: string;
  balancePoints: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  tierLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: RewardTransactionType;
  reason: RewardReason;
  amountPoints: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralEvent {
  id: string;
  referralCodeId: string;
  referrerUserId: string;
  referredUserId?: string | null;
  eventType: "CODE_CREATED" | "INVITE_SENT" | "SIGNUP" | "CONVERTED";
  rewardPoints: number;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface CampaignBanner {
  id: string;
  campaignId: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaRoute: string;
  imageUrl?: string | null;
  themeTone?: string | null;
  isActive: boolean;
  position: number;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  theme: CampaignTheme;
  status: CampaignStatus;
  targetAudience: string;
  budgetLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  banners?: CampaignBanner[];
  coupons?: Coupon[];
  participation?: ChallengeParticipation | null;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  walletId?: string | null;
  status: CouponRedemptionStatus;
  pointsSpent: number;
  createdAt: string;
  redeemedAt?: string | null;
  coupon?: Coupon;
}

export interface Coupon {
  id: string;
  campaignId?: string | null;
  code: string;
  title: string;
  description?: string | null;
  type: CouponType;
  discountValue: number;
  rewardCostPoints?: number | null;
  unlockThreshold?: number | null;
  minSpend?: number | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  campaign?: Campaign | null;
  redemptions?: CouponRedemption[];
}

export interface LookRating {
  id: string;
  userId: string;
  savedLookId?: string | null;
  tryOnRequestId?: string | null;
  productId?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface ShareEvent {
  id: string;
  userId: string;
  savedLookId?: string | null;
  tryOnRequestId?: string | null;
  channel: string;
  rewardGranted: number;
  createdAt: string;
}

export interface ChallengeParticipation {
  id: string;
  userId: string;
  campaignId?: string | null;
  challengeName: string;
  status: ChallengeStatus;
  rewardPoints: number;
  createdAt: string;
  completedAt?: string | null;
  campaign?: Campaign | null;
}
