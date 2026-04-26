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
  SavedLookItem,
  SessionResponse,
  ShareEvent,
  Shop,
  ShopComparison,
  TryOnRequest,
  UploadAsset,
  UploadSession,
  UserProfile
} from "../types/api";
import { demoData } from "../demo/demo-data";
import { useAppStore } from "../store/app-store";
import { demoModeEnabled, env } from "../utils/env";

const apiBaseUrl = env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
const demoImageBaseUrl = "https://placehold.co";
const imageUrlKeys = new Set([
  "avatarUrl",
  "publicUrl",
  "imageUrl",
  "garmentImageUrl",
  "outputImageUrl",
  "overlayImageUrl"
]);
const loopbackHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const placeholderHosts = new Set(["images.example.com"]);

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
    if (!loopbackHosts.has(parsed.hostname) && !placeholderHosts.has(parsed.hostname) && !parsed.hostname.endsWith(".example")) {
      return parsed.toString();
    }

    return buildDemoPlaceholderUrl(parsed);
  } catch {
    return value;
  }
}

function buildDemoPlaceholderUrl(source: URL) {
  const lastPathSegment = source.pathname.split("/").filter(Boolean).pop() ?? "demo-image";
  const label = decodeURIComponent(lastPathSegment)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[?_=&]+/g, " ")
    .replace(/[-_]+/g, " ")
    .trim();
  const background =
    source.pathname.includes("avatar") ? "7c3aed" : source.pathname.includes("garment") ? "0f766e" : source.pathname.includes("result") ? "be185d" : "1f2937";
  const foreground = "f8fafc";

  return `${demoImageBaseUrl}/720x960/${background}/${foreground}.png?text=${encodeURIComponent(label || "Demo Image")}`;
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

function cloneDemoValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isDemoSessionToken(token: string | null | undefined) {
  return token === demoData.demoToken;
}

function shouldUseDemoApi() {
  const token = useAppStore.getState().token;
  return demoModeEnabled || isDemoSessionToken(token);
}

function demoRecommendationsFor(input?: { occasion?: Occasion; productId?: string; savedLookId?: string }) {
  let items = cloneDemoValue(demoData.recommendations);

  if (input?.occasion) {
    items = items.filter((item) => item.product?.occasionTags?.includes(input.occasion!));
  }

  if (input?.productId) {
    items = items.filter((item) => item.productId !== input.productId);
  }

  if (input?.savedLookId) {
    const look = demoData.savedLooks.find((entry) => entry.id === input.savedLookId);
    const existingProductIds = new Set((look?.items ?? []).map((item) => item.productId));
    items = items.filter((item) => !existingProductIds.has(item.productId));
  }

  return items;
}

function demoProductFitPreview(productId: string, input?: { variantId?: string; chosenSizeLabel?: string; fitPreference?: FitPreference }): FitResult {
  const product = demoData.products.find((entry) => entry.id === productId) ?? demoData.products[0];
  const variant =
    product.variants?.find((entry) => entry.id === input?.variantId) ??
    product.variants?.find((entry) => entry.sizeLabel === input?.chosenSizeLabel) ??
    product.variants?.[1] ??
    product.variants?.[0];

  return cloneDemoValue({
    ...demoData.fitResult,
    productId: product.id,
    productName: product.name,
    variantId: variant?.id ?? demoData.fitResult.variantId,
    selectedSizeLabel: variant?.sizeLabel ?? demoData.fitResult.selectedSizeLabel,
    recommendedSize: variant?.sizeLabel ?? demoData.fitResult.recommendedSize,
    fitPreference: input?.fitPreference ?? demoData.fitResult.fitPreference
  });
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
  if (shouldUseDemoApi()) {
    const profile = cloneDemoValue(demoData.profile);
    useAppStore.getState().setProfile(profile);
    return profile;
  }

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
  session: (): Promise<SessionResponse> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.session)) : apiFetch("/auth/session"),
  onboarding: async (): Promise<{ title: string; subtitle: string }> =>
    ({
      title: "Find your best fit faster",
      subtitle: "Profile, measurements, try-on, and recommendations in one flow."
    }) as const,
  profile: (userId: string): Promise<UserProfile> => refreshProfileIntoStore(userId),
  refreshProfile: (userId: string): Promise<UserProfile> => refreshProfileIntoStore(userId),
  fitProfile: (): Promise<FitProfileResponse> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.fitProfile)) : apiFetch("/users/me/fit-profile"),
  updateProfile: async (userId: string, input: ProfileInput): Promise<UserProfile> => {
    await apiFetch<UserProfile>(`/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
    return refreshProfileIntoStore(userId);
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
  fitAssessments: (userId: string): Promise<FitAssessmentRecord[]> =>
    shouldUseDemoApi()
      ? Promise.resolve([
          {
            id: "demo-fit-assessment",
            userId,
            productId: demoData.fitResult.productId ?? demoData.products[0].id,
            variantId: demoData.fitResult.variantId ?? null,
            chosenSizeLabel: demoData.fitResult.selectedSizeLabel ?? null,
            recommendedSize: demoData.fitResult.recommendedSize ?? null,
            fitLabel: demoData.fitResult.fitLabel,
            score: demoData.fitResult.fitScore,
            confidence: demoData.fitResult.confidenceScore,
            verdict: demoData.fitResult.fitLabel,
            notes: demoData.fitResult.explanation,
            issues: demoData.fitResult.issues.map((issue) => issue.message),
            explanation: demoData.fitResult.explanation,
            metadata: {},
            createdAt: "2026-04-26T00:00:00.000Z"
          }
        ])
      : apiFetch(`/fit/assessments?userId=${userId}`),
  productFitPreview: (
    productId: string,
    input?: { variantId?: string; chosenSizeLabel?: string; fitPreference?: FitPreference }
  ): Promise<FitResult> => {
    if (shouldUseDemoApi()) {
      return Promise.resolve(demoProductFitPreview(productId, input));
    }

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
  productDetail: (productId: string): Promise<Product> =>
    shouldUseDemoApi()
      ? Promise.resolve(cloneDemoValue(demoData.products.find((entry) => entry.id === productId) ?? demoData.products[0]))
      : apiFetch(`/products/${productId}`),
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
  measurements: (userId: string): Promise<Measurement[]> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.profile.measurements ?? [])) : apiFetch(`/measurements?userId=${userId}`),
  saveMeasurement: async (
    userId: string,
    input: Omit<Measurement, "id" | "userId"> & { id?: string }
  ): Promise<Measurement | null> => {
    if (shouldUseDemoApi()) {
      return Promise.resolve({
        id: input.id ?? "measurement-demo",
        userId,
        ...input
      });
    }

    return input.id
      ? apiFetch(`/measurements/${input.id}`, {
          method: "PUT",
          body: JSON.stringify({ userId, ...input })
        })
      : apiFetch("/measurements", {
          method: "POST",
          body: JSON.stringify({ userId, ...input })
        });
  },
  products: (): Promise<Product[]> => (shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.products)) : apiFetch("/products")),
  recommendations: (
    userId: string,
    input?: { occasion?: Occasion; productId?: string; savedLookId?: string }
  ): Promise<Recommendation[]> => {
    if (shouldUseDemoApi()) {
      return Promise.resolve(demoRecommendationsFor(input));
    }

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
    shouldUseDemoApi()
      ? Promise.resolve(demoRecommendationsFor(input))
      : apiFetch("/recommendations/generate", {
          method: "POST",
          body: JSON.stringify({ userId, ...input })
        }),
  shops: (): Promise<Shop[]> => (shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.shops)) : apiFetch("/shops")),
  shopComparison: (input: { productId?: string; variantId?: string }): Promise<ShopComparison> => {
    if (shouldUseDemoApi()) {
      return Promise.resolve(cloneDemoValue(demoData.shopComparison(input.productId)));
    }

    const params = new URLSearchParams();
    if (input.productId) {
      params.set("productId", input.productId);
    }
    if (input.variantId) {
      params.set("variantId", input.variantId);
    }
    return apiFetch(`/shops/compare?${params.toString()}`);
  },
  savedLooks: (userId: string): Promise<SavedLook[]> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.savedLooks)) : apiFetch(`/saved-looks?userId=${userId}`),
  saveLook: (
    userId: string,
    input: { name: string; note?: string; productIds: string[]; isWishlist?: boolean }
  ): Promise<SavedLook> =>
    shouldUseDemoApi()
      ? Promise.resolve({
          id: `demo-saved-${Date.now()}`,
          name: input.name,
          note: input.note ?? "Saved in demo mode",
          isWishlist: input.isWishlist ?? false,
          items: input.productIds
            .map((productId, index) => {
              const product = cloneDemoValue(demoData.products.find((entry) => entry.id === productId));
              if (!product) {
                return null;
              }

              return {
                id: `demo-item-${index + 1}`,
                productId,
                product
              } satisfies SavedLookItem;
            })
            .filter(Boolean) as SavedLookItem[]
        } as SavedLook)
      : apiFetch("/saved-looks", {
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
    if (shouldUseDemoApi()) {
      return cloneDemoValue(demoData.tryOnRequest.sourceUpload!);
    }
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
    shouldUseDemoApi()
      ? Promise.resolve(
          cloneDemoValue({
            ...demoData.tryOnRequest,
            userId,
            variantId,
            fitStyle: input.fitStyle ?? demoData.tryOnRequest.fitStyle,
            comparisonLabel: input.comparisonLabel ?? demoData.tryOnRequest.comparisonLabel
          })
        )
      : apiFetch("/try-on/requests", {
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
    if (shouldUseDemoApi()) {
      return cloneDemoValue(demoData.tryOnRequest);
    }

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
  tryOnResult: (requestId: string): Promise<TryOnRequest> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.tryOnRequest)) : apiFetch(`/try-on/requests/${requestId}`),
  shareLook: (input: { tryOnRequestId?: string; savedLookId?: string; channel: string }): Promise<ShareEvent> =>
    apiFetch("/engagement/share-events", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  rewardWallet: (): Promise<RewardWallet> =>
    shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.rewardWallet)) : apiFetch("/rewards/wallet"),
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
  campaigns: (): Promise<Campaign[]> => (shouldUseDemoApi() ? Promise.resolve(cloneDemoValue(demoData.campaigns)) : apiFetch("/campaigns")),
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
