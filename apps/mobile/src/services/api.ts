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
  profile: (userId: string): Promise<UserProfile> => apiFetch(`/profile/${userId}`),
  fitProfile: (): Promise<FitProfileResponse> => apiFetch("/users/me/fit-profile"),
  updateProfile: (userId: string, input: ProfileInput): Promise<UserProfile> =>
    apiFetch(`/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    }),
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
  recommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch(`/recommendations?userId=${userId}`),
  generateRecommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch("/recommendations/generate", {
      method: "POST",
      body: JSON.stringify({ userId })
    }),
  shops: (): Promise<Shop[]> => apiFetch("/shops"),
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
    selfAsset: LocalUploadAsset,
    options?: {
      garmentAsset?: LocalUploadAsset | null;
      fitStyle?: string;
      comparisonLabel?: string;
    }
  ): Promise<TryOnRequest> => {
    const selfSession = await mobileApi.createUploadSession(userId, selfAsset, "self-image");
    const selfUpload = await mobileApi.uploadAsset(userId, selfSession, selfAsset);

    let garmentUploadId: string | undefined;
    if (options?.garmentAsset) {
      const garmentSession = await mobileApi.createUploadSession(userId, options.garmentAsset, "garment");
      const garmentUpload = await mobileApi.uploadAsset(userId, garmentSession, options.garmentAsset);
      garmentUploadId = garmentUpload.id;
    }

    return mobileApi.createTryOn(userId, variantId, {
      uploadId: selfUpload.id,
      garmentUploadId,
      fitStyle: options?.fitStyle,
      comparisonLabel: options?.comparisonLabel
    });
  },
  tryOnResult: (requestId: string): Promise<TryOnRequest> => apiFetch(`/try-on/requests/${requestId}`),
  rewardsWallet: (userId?: string): Promise<RewardWallet> =>
    apiFetch(`/rewards/wallet${userId ? `?userId=${userId}` : ""}`),
  rewardTransactions: (userId?: string): Promise<RewardTransaction[]> =>
    apiFetch(`/rewards/transactions${userId ? `?userId=${userId}` : ""}`),
  referralCode: (): Promise<ReferralCode> => apiFetch("/referrals/code"),
  referralEvents: (userId?: string): Promise<ReferralEvent[]> =>
    apiFetch(`/referrals/events${userId ? `?userId=${userId}` : ""}`),
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
  couponRedemptions: (userId?: string): Promise<CouponRedemption[]> =>
    apiFetch(`/coupons/redemptions${userId ? `?userId=${userId}` : ""}`),
  unlockCoupon: (couponId: string): Promise<CouponRedemption> =>
    apiFetch(`/coupons/${couponId}/unlock`, { method: "POST" }),
  redeemCoupon: (couponId: string): Promise<CouponRedemption> =>
    apiFetch(`/coupons/${couponId}/redeem`, { method: "POST" }),
  challenges: (): Promise<Campaign[]> => apiFetch("/engagement/challenges"),
  challengeParticipation: (userId?: string): Promise<ChallengeParticipation[]> =>
    apiFetch(`/engagement/challenges/participation${userId ? `?userId=${userId}` : ""}`),
  joinChallenge: (campaignId: string): Promise<ChallengeParticipation> =>
    apiFetch(`/engagement/challenges/${campaignId}/join`, { method: "POST" }),
  completeChallenge: (campaignId: string) =>
    apiFetch(`/engagement/challenges/${campaignId}/complete`, { method: "POST" }),
  shareLook: (input: { savedLookId?: string; tryOnRequestId?: string; channel: string }): Promise<ShareEvent> =>
    apiFetch("/engagement/share-events", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  rateLook: (input: {
    savedLookId?: string;
    tryOnRequestId?: string;
    productId?: string;
    rating: number;
    comment?: string;
  }): Promise<LookRating> =>
    apiFetch("/engagement/look-ratings", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
