import type {
  AuthResponse,
  Campaign,
  ChallengeParticipation,
  Coupon,
  CouponRedemption,
  LookRating,
  Measurement,
  Product,
  Recommendation,
  ReferralCode,
  ReferralEvent,
  RewardTransaction,
  RewardWallet,
  SavedLook,
  ShareEvent,
  SessionResponse,
  Shop,
  TryOnRequest,
  UploadAsset,
  UploadSession,
  UserProfile
} from "../types/api";
import { useAppStore } from "../store/app-store";
import { env } from "../utils/env";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAppStore.getState().token;
  const isFormDataRequest = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
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
  return payload.data;
}

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
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetLabel?: string | null;
  closetStatus?: string | null;
  stylePreference?: Record<string, unknown> | null;
  preferredColors: string[];
  avoidedColors: string[];
};

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
  updateProfile: (userId: string, input: ProfileInput): Promise<UserProfile> =>
    apiFetch(`/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    }),
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
  ): Promise<UploadSession> =>
    apiFetch("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        userId,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? "asset.jpg",
        purpose
      })
    }),
  uploadAsset: async (
    userId: string,
    session: UploadSession,
    asset: LocalUploadAsset
  ): Promise<UploadAsset> => {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? "asset.jpg",
      type: asset.mimeType ?? "image/jpeg"
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
      uploadId: string;
      garmentUploadId?: string;
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
