import type {
  AuthResponse,
  Campaign,
  ChallengeParticipation,
  Coupon,
  CouponRedemption,
  FitAssessmentRecord,
  FitPreference,
  FitProfileResponse,
  FitResult,
  LookRating,
  Measurement,
  Occasion,
  Product,
  Recommendation,
  ReferralCode,
  ReferralEvent,
  RewardTransaction,
  RewardWallet,
  SavedLook,
  SessionResponse,
  ShareEvent,
  Shop,
  ShopComparison,
  TryOnRequest,
  UploadAsset,
  UploadSession,
  UserProfile
} from "../types/api";
import { useAppStore } from "../store/app-store";
import { env } from "../utils/env";

const apiBaseUrl = env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
const apiOrigin = new URL(apiBaseUrl);
const imageUrlKeys = new Set([
  "avatarUrl",
  "publicUrl",
  "imageUrl",
  "garmentImageUrl",
  "outputImageUrl",
  "overlayImageUrl"
]);
const loopbackHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

type LocalUploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type ProfileInput = {
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
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetLabel?: string | null;
  closetStatus?: string | null;
  stylePreference?: Record<string, unknown> | null;
  preferredColors: string[];
  avoidedColors: string[];
};

function isFormDataBody(body: RequestInit["body"] | null | undefined) {
  if (!body || typeof body !== "object") {
    return false;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return true;
  }

  return typeof (body as FormData).append === "function";
}

function extensionFromAsset(asset: LocalUploadAsset) {
  const explicitName = asset.fileName?.trim();
  if (explicitName && explicitName.includes(".")) {
    return explicitName.slice(explicitName.lastIndexOf(".")).toLowerCase();
  }

  const uri = asset.uri.split("?")[0] ?? "";
  const uriSegment = uri.slice(uri.lastIndexOf("/") + 1);
  if (uriSegment.includes(".")) {
    return uriSegment.slice(uriSegment.lastIndexOf(".")).toLowerCase();
  }

  return ".jpg";
}

function mimeTypeFromExtension(extension: string) {
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".heic":
    case ".heif":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

function normalizeUploadAsset(asset: LocalUploadAsset) {
  const extension = extensionFromAsset(asset);
  const mimeType = asset.mimeType ?? mimeTypeFromExtension(extension);
  const fileName = asset.fileName?.trim() || `upload${extension}`;

  return {
    ...asset,
    fileName,
    mimeType
  };
}

function normalizeRemoteUrl(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  if (value.startsWith("/")) {
    return `${apiBaseUrl}${value}`;
  }

  try {
    const parsed = new URL(value);
    if (!loopbackHosts.has(parsed.hostname)) {
      return parsed.toString();
    }

    parsed.protocol = apiOrigin.protocol;
    parsed.hostname = apiOrigin.hostname;
    return parsed.toString();
  } catch {
    return value;
  }
}

function normalizeImageFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeImageFields(entry)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, currentValue]) => {
        if (typeof currentValue === "string" && imageUrlKeys.has(key)) {
          return [key, normalizeRemoteUrl(currentValue)];
        }

        if (currentValue && typeof currentValue === "object") {
          return [key, normalizeImageFields(currentValue)];
        }

        return [key, currentValue];
      })
    ) as T;
  }

  return value;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAppStore.getState().token;
  const isFormDataRequest = isFormDataBody(init?.body);
  const requestPath = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  const response = await fetch(requestPath, {
    headers: {
      ...(isFormDataRequest ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      const errorText = await response.text();
      if (errorText) {
        message = errorText;
      }
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { data: T };
  return normalizeImageFields(payload.data);
}

async function refreshProfileIntoStore(userId: string) {
  const profile = await apiFetch<UserProfile>(`/profile/${userId}`);
  useAppStore.getState().setProfile(profile);
  return profile;
}

export const mobileApi = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName })
    }),
  session: (): Promise<SessionResponse> => apiFetch("/auth/session"),
  onboarding: async (): Promise<{ title: string; subtitle: string }> =>
    ({
      title: "Find your best fit faster",
      subtitle: "Profile, measurements, try-on, and recommendations in one flow."
    }) as const,
  profile: (userId: string): Promise<UserProfile> => refreshProfileIntoStore(userId),
  refreshProfile: (userId: string): Promise<UserProfile> => refreshProfileIntoStore(userId),
  fitProfile: (): Promise<FitProfileResponse> => apiFetch("/users/me/fit-profile"),
  updateProfile: async (userId: string, input: ProfileInput): Promise<UserProfile> => {
    const updated = await apiFetch<UserProfile>(`/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
    useAppStore.getState().setProfile(updated);
    return updated;
  },
  fitAssess: (input: {
    userId: string;
    productId: string;
    variantId?: string;
    chosenSizeLabel?: string;
    fitPreference?: FitPreference;
  }): Promise<FitResult> =>
    apiFetch("/fit/assess", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  fitAssessments: (userId: string): Promise<FitAssessmentRecord[]> => apiFetch(`/fit/assessments?userId=${userId}`),
  productFitPreview: (
    productId: string,
    input?: { variantId?: string; chosenSizeLabel?: string; fitPreference?: FitPreference }
  ): Promise<FitResult> => {
    const params = new URLSearchParams();
    if (input?.variantId) {
      params.set("variantId", input.variantId);
    }
    if (input?.chosenSizeLabel) {
      params.set("chosenSizeLabel", input.chosenSizeLabel);
    }
    if (input?.fitPreference) {
      params.set("fitPreference", input.fitPreference);
    }

    const query = params.toString();
    return apiFetch(`/products/${productId}/fit-preview${query ? `?${query}` : ""}`);
  },
  productDetail: (productId: string): Promise<Product> => apiFetch(`/products/${productId}`),
  updateStylePreferences: (
    userId: string,
    input: {
      stylePreference: Record<string, unknown>;
      preferredColors: string[];
      avoidedColors: string[];
      budgetMin?: number | null;
      budgetMax?: number | null;
      budgetLabel?: string | null;
    }
  ): Promise<UserProfile> =>
    apiFetch(`/style-preferences/${userId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    }),
  measurements: (userId: string): Promise<Measurement[]> => apiFetch(`/measurements?userId=${userId}`),
  saveMeasurement: (
    userId: string,
    input: Omit<Measurement, "id" | "userId"> & { id?: string }
  ): Promise<Measurement | null> =>
    input.id
      ? apiFetch(`/measurements/${input.id}`, {
          method: "PUT",
          body: JSON.stringify({ userId, ...input })
        })
      : apiFetch("/measurements", {
          method: "POST",
          body: JSON.stringify({ userId, ...input })
        }),
  products: (): Promise<Product[]> => apiFetch("/products"),
  recommendations: (
    userId: string,
    input?: { occasion?: Occasion; productId?: string; savedLookId?: string }
  ): Promise<Recommendation[]> => {
    const params = new URLSearchParams({ userId });
    if (input?.occasion) {
      params.set("occasion", input.occasion);
    }
    if (input?.productId) {
      params.set("productId", input.productId);
    }
    if (input?.savedLookId) {
      params.set("savedLookId", input.savedLookId);
    }
    return apiFetch(`/recommendations?${params.toString()}`);
  },
  generateRecommendations: (
    userId: string,
    input?: { occasion?: Occasion; productId?: string; savedLookId?: string }
  ): Promise<Recommendation[]> =>
    apiFetch("/recommendations/generate", {
      method: "POST",
      body: JSON.stringify({ userId, ...input })
    }),
  shops: (): Promise<Shop[]> => apiFetch("/shops"),
  shopComparison: (input: { productId?: string; variantId?: string }): Promise<ShopComparison> => {
    const params = new URLSearchParams();
    if (input.productId) {
      params.set("productId", input.productId);
    }
    if (input.variantId) {
      params.set("variantId", input.variantId);
    }
    return apiFetch(`/shops/compare?${params.toString()}`);
  },
  savedLooks: (userId: string): Promise<SavedLook[]> => apiFetch(`/saved-looks?userId=${userId}`),
  saveLook: (
    userId: string,
    input: { name: string; note?: string; productIds: string[]; isWishlist?: boolean }
  ): Promise<SavedLook> =>
    apiFetch("/saved-looks", {
      method: "POST",
      body: JSON.stringify({ userId, ...input })
    }),
  createUploadSession: (
    userId: string,
    asset: LocalUploadAsset,
    purpose = "general"
  ): Promise<UploadSession> => {
    const normalizedAsset = normalizeUploadAsset(asset);

    return apiFetch("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        userId,
        mimeType: normalizedAsset.mimeType,
        fileName: normalizedAsset.fileName,
        purpose
      })
    });
  },
  uploadAsset: async (
    userId: string,
    session: UploadSession,
    asset: LocalUploadAsset
  ): Promise<UploadAsset> => {
    const normalizedAsset = normalizeUploadAsset(asset);
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("file", {
      uri: normalizedAsset.uri,
      name: normalizedAsset.fileName,
      type: normalizedAsset.mimeType
    } as never);

    return apiFetch(session.uploadPath, {
      method: session.method,
      body: formData
    });
  },
  uploadProfileImage: async (userId: string, asset: LocalUploadAsset): Promise<UploadAsset> => {
    const session = await mobileApi.createUploadSession(userId, asset, "profile-avatar");
    return mobileApi.uploadAsset(userId, session, asset);
  },
  createTryOn: (
    userId: string,
    variantId: string,
    input: {
      uploadId?: string;
      garmentUploadId?: string;
      imageUrl?: string;
      fitStyle?: string;
      comparisonLabel?: string;
    }
  ): Promise<TryOnRequest> =>
    apiFetch("/try-on/requests", {
      method: "POST",
      body: JSON.stringify({ userId, variantId, ...input })
    }),
  createTryOnFromAssets: async (
    userId: string,
    variantId: string,
    asset: LocalUploadAsset,
    input?: {
      garmentAsset?: LocalUploadAsset | null;
      fitStyle?: string;
      comparisonLabel?: string;
    }
  ) => {
    const sourceSession = await mobileApi.createUploadSession(userId, asset, "try-on-source");
    const sourceUpload = await mobileApi.uploadAsset(userId, sourceSession, asset);

    let garmentUploadId: string | undefined;
    if (input?.garmentAsset) {
      const garmentSession = await mobileApi.createUploadSession(userId, input.garmentAsset, "try-on-garment");
      const garmentUpload = await mobileApi.uploadAsset(userId, garmentSession, input.garmentAsset);
      garmentUploadId = garmentUpload.id;
    }

    return mobileApi.createTryOn(userId, variantId, {
      uploadId: sourceUpload.id,
      garmentUploadId,
      fitStyle: input?.fitStyle,
      comparisonLabel: input?.comparisonLabel
    });
  },
  tryOnResult: (requestId: string): Promise<TryOnRequest> => apiFetch(`/try-on/requests/${requestId}`),
  shareLook: (input: { tryOnRequestId?: string; savedLookId?: string; channel: string }): Promise<ShareEvent> =>
    apiFetch("/engagement/share-events", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  rewardWallet: (): Promise<RewardWallet> => apiFetch("/rewards/wallet"),
  rewardsWallet: (): Promise<RewardWallet> => mobileApi.rewardWallet(),
  rewardTransactions: (): Promise<RewardTransaction[]> => apiFetch("/rewards/transactions"),
  referralCode: (): Promise<ReferralCode> => apiFetch("/referrals/code"),
  referralEvents: (): Promise<ReferralEvent[]> => apiFetch("/referrals/events"),
  createReferralEvent: (input: {
    eventType: string;
    code?: string;
    referredUserId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ReferralEvent> =>
    apiFetch("/referrals/events", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  campaigns: (): Promise<Campaign[]> => apiFetch("/campaigns"),
  coupons: (): Promise<Coupon[]> => apiFetch("/coupons"),
  couponRedemptions: (): Promise<CouponRedemption[]> => apiFetch("/coupons/redemptions"),
  unlockCoupon: (couponId: string): Promise<CouponRedemption> =>
    apiFetch(`/coupons/${couponId}/unlock`, { method: "POST" }),
  redeemCoupon: (couponId: string): Promise<CouponRedemption> =>
    apiFetch(`/coupons/${couponId}/redeem`, { method: "POST" }),
  lookRatings: (): Promise<LookRating[]> => apiFetch("/engagement/look-ratings"),
  challenges: (): Promise<Campaign[]> => apiFetch("/engagement/challenges"),
  challengeParticipation: (): Promise<ChallengeParticipation[]> => apiFetch("/engagement/challenges/participation"),
  joinChallenge: (campaignId: string): Promise<ChallengeParticipation> =>
    apiFetch(`/engagement/challenges/${campaignId}/join`, { method: "POST" }),
  completeChallenge: (campaignId: string): Promise<ChallengeParticipation> =>
    apiFetch(`/engagement/challenges/${campaignId}/complete`, { method: "POST" })
};
