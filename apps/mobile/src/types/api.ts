export type UserRole = "USER" | "ADMIN" | "OPERATOR" | "MERCHANT";
export type FitPreference = "slim" | "regular" | "relaxed";
export type FitLabel = "slim" | "regular" | "relaxed";
export type Occasion = "casual" | "streetwear" | "formal" | "college" | "interview" | "date" | "fest";
export type FitIssueCode =
  | "chest-tight"
  | "chest-loose"
  | "waist-tight"
  | "waist-loose"
  | "shoulder-tight"
  | "shoulder-loose"
  | "sleeve-long"
  | "sleeve-short"
  | "hip-tight"
  | "hip-loose"
  | "inseam-short"
  | "inseam-long";

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

export interface UploadAsset {
  id: string;
  key: string;
  mimeType: string;
  bucket: string;
  purpose?: string;
  publicUrl: string;
  createdAt: string;
}

export interface SizeChartEntry {
  id?: string;
  sizeLabel: string;
  chestMinCm?: number | null;
  chestMaxCm?: number | null;
  waistMinCm?: number | null;
  waistMaxCm?: number | null;
  hipsMinCm?: number | null;
  hipsMaxCm?: number | null;
  inseamMinCm?: number | null;
  inseamMaxCm?: number | null;
  shoulderMinCm?: number | null;
  shoulderMaxCm?: number | null;
  footLengthMinCm?: number | null;
  footLengthMaxCm?: number | null;
}

export interface FitIssue {
  code: FitIssueCode;
  severity: "low" | "medium" | "high";
  dimension: string;
  direction: "tight" | "loose" | "short" | "long";
  deltaCm: number;
  message: string;
}

export interface SizeAlternative {
  sizeLabel: string;
  fitScore: number;
  reason: string;
}

export interface SizeComparison {
  sizeLabel: string;
  variantId?: string | null;
  fitScore: number;
  confidenceScore: number;
  fitLabel: FitLabel;
  issues: FitIssue[];
  explanation: string;
  isRecommended: boolean;
  isSelected: boolean;
}

export interface FitResult {
  userId?: string;
  productId?: string;
  productName?: string;
  variantId?: string | null;
  selectedSizeLabel?: string | null;
  fitPreference?: FitPreference;
  recommendedSize: string | null;
  fitLabel: FitLabel;
  confidenceScore: number;
  fitScore: number;
  issues: FitIssue[];
  explanation: string;
  alternatives: SizeAlternative[];
  sizeComparisons: SizeComparison[];
  measurementProfile?: {
    fitPreference: FitPreference;
    providedMeasurements: string[];
    relevantMeasurements: string[];
    completenessScore: number;
    guidance: string;
  };
  assessmentId?: string;
}

export interface FitAssessmentRecord {
  id: string;
  userId: string;
  productId: string;
  variantId?: string | null;
  chosenSizeLabel?: string | null;
  recommendedSize?: string | null;
  fitLabel?: string | null;
  score: number;
  confidence: number;
  verdict: string;
  notes: string;
  issues?: string[];
  explanation?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface OfferSummary {
  offerCount: number;
  shopCount: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  bestOffer?: InventoryOffer | null;
  availabilityLabel: string;
  badges: string[];
}

export interface ColorInsight {
  score: number;
  matchingColors: string[];
  complementaryColors: string[];
  poorMatches: string[];
  explanation: string;
}

export interface ProductVariant {
  id: string;
  sizeLabel?: string;
  color?: string;
  imageUrl?: string | null;
  price?: number;
  currency?: string;
  sizeChartEntries?: SizeChartEntry[];
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
  occasionTags?: Occasion[];
  offerSummary?: OfferSummary | null;
  fitPreview?: FitResult | null;
  similarProducts?: Product[];
  cheaperAlternatives?: Product[];
  completeTheLook?: Product[];
  priceAnchor?: number | null;
  recommendationReasons?: string[];
}

export interface InventoryOffer {
  id: string;
  externalUrl: string;
  stock: number;
  price: number;
  currency: string;
  shop?: Shop;
  variant?: ProductVariant & {
    product?: Product;
  };
}

export interface Recommendation {
  id?: string;
  productId: string;
  product?: Product;
  score: number;
  explanation?: string;
  matchingColors?: string[];
  complementaryColors?: string[];
  incompatibleColors?: string[];
  fitResult?: FitResult | null;
  bestSizeLabel?: string | null;
  bestFitLabel?: FitLabel | null;
  fitWarning?: string | null;
  reasonTags?: string[];
  rankingBadges?: string[];
  recommendationReasons?: string[];
  occasionTags?: Occasion[];
  budgetLabel?: string | null;
  colorInsight?: ColorInsight | null;
  offerSummary?: OfferSummary | null;
  cheaperAlternative?: Product | null;
  completeLookSlot?: string;
  completeLookLabel?: string;
}

export interface SavedLookItem {
  id: string;
  productId: string;
  product?: Product;
}

export interface SavedLook {
  id: string;
  userId?: string;
  name: string;
  note?: string | null;
  isWishlist?: boolean;
  tryOnResultId?: string | null;
  tryOnImageUrl?: string | null;
  sourceScreen?: string | null;
  fitScore?: number | null;
  stylistNote?: string | null;
  metadata?: Record<string, unknown> | null;
  savedAt?: string;
  items?: SavedLookItem[];
  products?: Product[];
  offerSummary?: OfferSummary | null;
  recommendedProducts?: Product[];
  occasionTags?: Occasion[];
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUploadId?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyShape?: string | null;
  fitPreference?: FitPreference | null;
  preferredColors?: string[];
  avoidedColors?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetLabel?: string | null;
  closetStatus?: string | null;
  stylePreference?: Record<string, unknown> | null;
  measurements?: Measurement[];
  savedLooks?: SavedLook[];
}

export interface FitProfileResponse {
  userId: string;
  fitPreference: FitPreference;
  completenessScore: number;
  providedMeasurements: string[];
  relevantMeasurements: string[];
  guidance: string;
  profile?: UserProfile | null;
  latestMeasurement?: Measurement | null;
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

export interface Shop {
  id: string;
  name: string;
  region: string;
  url?: string;
  inventoryOffers?: InventoryOffer[];
}

export interface ShopComparison {
  productId: string | null;
  productName: string | null;
  variantId?: string | null;
  recommendedSize?: string | null;
  fitLabel?: FitLabel | null;
  offers: InventoryOffer[];
  bestOffer?: InventoryOffer | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  badges: string[];
  cheaperAlternative?: Product | null;
  bestFitAlternative?: { product: Product; fit: string | null } | null;
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
  garmentImageUrl?: string | null;
  sourceUploadId?: string | null;
  garmentUploadId?: string | null;
  fitStyle?: string | null;
  comparisonLabel?: string | null;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  statusMessage?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  sourceUpload?: UploadAsset | null;
  garmentUpload?: UploadAsset | null;
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
  userId?: string;
  reason: RewardReason;
  type: RewardTransactionType;
  points?: number;
  amountPoints?: number;
  balanceAfter?: number;
  description?: string;
  meta?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface ReferralEvent {
  id: string;
  referrerUserId: string;
  referredUserId?: string | null;
  eventType: string;
  meta?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  rewardPoints?: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  theme: CampaignTheme;
  status: CampaignStatus;
  description?: string | null;
  budgetLabel?: string | null;
  banners?: Array<{ title?: string | null; subtitle?: string | null }>;
  participation?: ChallengeParticipation | null;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  type: CouponType;
  value?: number;
  description?: string | null;
  discountValue?: number;
  rewardCostPoints?: number | null;
  unlockThreshold?: number | null;
  campaign?: Campaign | null;
  redemptions?: CouponRedemption[];
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  status: CouponRedemptionStatus;
  createdAt: string;
}

export interface LookRating {
  id: string;
  userId: string;
  productId?: string | null;
  savedLookId?: string | null;
  rating: number;
  createdAt: string;
}

export interface ShareEvent {
  id: string;
  userId: string;
  tryOnRequestId?: string | null;
  savedLookId?: string | null;
  channel: string;
  createdAt: string;
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  userId: string;
  status: ChallengeStatus;
  rewardPoints?: number;
  challengeName?: string;
  campaign?: Campaign | null;
  createdAt: string;
}
