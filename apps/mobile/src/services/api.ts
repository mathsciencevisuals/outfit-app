import type {
  AuthResponse,
  Campaign,
  ChallengeParticipation,
  Coupon,
  CouponRedemption,
  Measurement,
  Product,
  Recommendation,
  ReferralCode,
  ReferralEvent,
  RewardTransaction,
  RewardWallet,
  SavedLook,
  SessionResponse,
  Shop,
  UploadSession,
  TryOnRequest,
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
  measurements: (userId: string): Promise<Measurement[]> => apiFetch(`/measurements?userId=${userId}`),
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
  createUploadSession: (userId: string, asset: LocalUploadAsset): Promise<UploadSession> =>
    apiFetch("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        userId,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? "try-on-image.jpg"
      })
    }),
  uploadTryOnAsset: async (userId: string, session: UploadSession, asset: LocalUploadAsset) => {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? "try-on-image.jpg",
      type: asset.mimeType ?? "image/jpeg"
    } as never);

    return apiFetch(session.uploadPath, {
      method: session.method,
      body: formData
    });
  },
  createTryOn: (userId: string, variantId: string, uploadId: string): Promise<TryOnRequest> =>
    apiFetch("/try-on/requests", {
      method: "POST",
      body: JSON.stringify({ userId, variantId, uploadId })
    }),
  createTryOnFromAsset: async (userId: string, variantId: string, asset: LocalUploadAsset): Promise<TryOnRequest> => {
    const session = await mobileApi.createUploadSession(userId, asset);
    await mobileApi.uploadTryOnAsset(userId, session, asset);
    return mobileApi.createTryOn(userId, variantId, session.upload.id);
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
    eventType: "INVITE_SENT" | "SIGNUP" | "CONVERTED";
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
  completeChallenge: (campaignId: string): Promise<ChallengeParticipation> =>
    apiFetch(`/engagement/challenges/${campaignId}/complete`, { method: "POST" }),
  shareLook: (input: {
    savedLookId?: string;
    tryOnRequestId?: string;
    channel: string;
  }) =>
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
  }) =>
    apiFetch("/engagement/look-ratings", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
