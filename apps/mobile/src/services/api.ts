import { env } from '../utils/env';
import { useAppStore } from '../store/app-store';
import type {
  UserProfile, UserStats, Measurement, Product,
  Recommendation, SavedLook, Shop, PersonalizedTrendingResponse,
  TryOnRequest, TryOnResult, TrendingPin, ViewAngle,
} from '../types';
import type { AuthResponse, SessionResponse, UploadSession } from '../types/api';

const DEMO_EMAIL = 'demo@fitme.dev';
const DEMO_PASSWORD = 'fitme1234';

function randomDemoAccount() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return {
    email: `apk-demo-${suffix}@fitme.dev`,
    password: `Fitme!${suffix}`,
    firstName: 'Demo',
    lastName: 'User',
  };
}

function buildHeaders(init?: RequestInit, includeJsonContentType = true) {
  const accessToken = useAppStore.getState().accessToken;
  return {
    ...(includeJsonContentType ? { 'content-type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init?.headers ?? {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit, allowAuthRetry = true): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    headers: buildHeaders(init),
    ...init,
  });

  if (response.status === 401 && allowAuthRetry && !path.startsWith('/auth/')) {
    await mobileApi.ensureDemoSession();
    return apiFetch<T>(path, init, false);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

async function apiUpload<T>(path: string, form: FormData, allowAuthRetry = true): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(undefined, false),
    body: form,
  });

  if (response.status === 401 && allowAuthRetry && !path.startsWith('/auth/')) {
    await mobileApi.ensureDemoSession();
    return apiUpload<T>(path, form, false);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload ${response.status}: ${text || response.statusText}`);
  }
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export const mobileApi = {
  register: (payload: { email: string; password: string; firstName: string; lastName: string }): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  session: (): Promise<SessionResponse> =>
    apiFetch<SessionResponse>('/auth/session'),

  ensureDemoSession: async () => {
    const store = useAppStore.getState();
    const preferredEmail = store.authEmail ?? DEMO_EMAIL;
    const preferredPassword = store.authPassword ?? DEMO_PASSWORD;

    if (store.accessToken) {
      try {
        const session = await mobileApi.session();
        useAppStore.getState().setSession({
          userId: session.user.id,
          accessToken: store.accessToken,
          userRole: session.user.role,
          authEmail: preferredEmail,
          authPassword: preferredPassword,
        });
        return session.user;
      } catch {
        useAppStore.getState().setAccessToken(null);
      }
    }

    try {
      const auth = await mobileApi.login(preferredEmail, preferredPassword);
      useAppStore.getState().setSession({
        userId: auth.user.id,
        accessToken: auth.accessToken,
        userRole: auth.user.role,
        authEmail: preferredEmail,
        authPassword: preferredPassword,
      });
      return auth.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldBootstrapAccount =
        preferredEmail === DEMO_EMAIL &&
        preferredPassword === DEMO_PASSWORD &&
        message.includes('API 401');

      if (!shouldBootstrapAccount) {
        throw error;
      }

      const fallbackAccount = randomDemoAccount();
      const auth = await mobileApi.register(fallbackAccount);
      useAppStore.getState().setSession({
        userId: auth.user.id,
        accessToken: auth.accessToken,
        userRole: auth.user.role,
        authEmail: fallbackAccount.email,
        authPassword: fallbackAccount.password,
      });
      return auth.user;
    }
  },

  // ── Profile ──────────────────────────────────────────────────────────────
  profile: (userId: string): Promise<UserProfile> =>
    apiFetch<UserProfile>(`/profile/${userId}`),

  updateProfile: (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> =>
    apiFetch<UserProfile>(`/profile/${userId}`, {
      method: 'PUT', body: JSON.stringify(updates),
    }),

  uploadProfilePhoto: (userId: string, localImageUri: string): Promise<{ avatarUrl: string }> => {
    const form = new FormData();
    form.append('userId', userId);
    const filename = localImageUri.split('/').pop() ?? 'avatar.jpg';
    form.append('photo', { uri: localImageUri, name: filename, type: 'image/jpeg' } as unknown as Blob);
    return apiUpload<{ avatarUrl: string }>(`/profile/${userId}/photo`, form);
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  // GET /profile/:userId/stats
  // Returns try-on count, saved count, style match %, total orders, member since
  stats: (userId: string): Promise<UserStats> =>
    apiFetch<UserStats>(`/profile/${userId}/stats`),

  // ── Measurements ──────────────────────────────────────────────────────────
  measurements: (userId: string): Promise<Measurement[]> =>
    apiFetch<Measurement[]>(`/measurements?userId=${userId}`),

  saveMeasurements: (userId: string, data: Partial<Measurement>): Promise<Measurement> =>
    apiFetch<Measurement>('/measurements', {
      method: 'POST', body: JSON.stringify({ userId, ...data }),
    }),

  // ── Products ──────────────────────────────────────────────────────────────
  products: (params?: { category?: string; limit?: number; trending?: boolean }): Promise<Product[]> => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit)    qs.set('limit', String(params.limit));
    if (params?.trending) qs.set('trending', 'true');
    const query = qs.toString() ? `?${qs}` : '';
    return apiFetch<Product[]>(`/products${query}`);
  },

  // GET /products/trending
  // Returns global trending products.
  trending: (limit = 4): Promise<Product[]> =>
    apiFetch<Product[]>(`/products/trending?limit=${limit}`),

  personalizedTrending: (userId: string, limit = 8): Promise<PersonalizedTrendingResponse> =>
    apiFetch<PersonalizedTrendingResponse>(`/products/trending?userId=${encodeURIComponent(userId)}&limit=${limit}`),

  // ── Saved Products ────────────────────────────────────────────────────────
  // GET /users/:userId/saved-products
  savedProducts: (userId: string): Promise<string[]> =>
    apiFetch<string[]>(`/users/${userId}/saved-products`),

  // POST /users/:userId/saved-products  { productId }
  // DELETE /users/:userId/saved-products/:productId
  toggleSavedProduct: (userId: string, productId: string, save: boolean): Promise<void> =>
    apiFetch<void>(
      `/users/${userId}/saved-products${save ? '' : `/${productId}`}`,
      { method: save ? 'POST' : 'DELETE', body: save ? JSON.stringify({ productId }) : undefined },
    ),

  // ── Compare ───────────────────────────────────────────────────────────────
  // POST /compare  { productIds: string[] }
  // Returns fit comparison notes across selected products
  compareFit: (userId: string, productIds: string[]): Promise<{
    productId: string; fitNote: string; recommended: boolean;
  }[]> =>
    apiFetch(`/compare`, {
      method: 'POST', body: JSON.stringify({ userId, productIds }),
    }),

  // ── Checkout ──────────────────────────────────────────────────────────────
  // POST /checkout/instant  { userId, variantId, shopId? }
  // Creates an order and returns a deep-link to the shop checkout
  instantCheckout: (userId: string, variantId: string, shopId?: string): Promise<{
    orderId: string; checkoutUrl: string; price: number; currency: string;
  }> =>
    apiFetch(`/checkout/instant`, {
      method: 'POST', body: JSON.stringify({ userId, variantId, shopId }),
    }),

  // ── Recommendations ───────────────────────────────────────────────────────
  recommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch<Recommendation[]>(`/recommendations?userId=${userId}`),

  generateRecommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch<Recommendation[]>('/recommendations/generate', {
      method: 'POST', body: JSON.stringify({ userId }),
    }),

  // ── Shops ─────────────────────────────────────────────────────────────────
  shops: (): Promise<Shop[]> => apiFetch<Shop[]>('/shops'),

  // ── Saved Looks ───────────────────────────────────────────────────────────
  savedLooks: (userId: string): Promise<SavedLook[]> =>
    apiFetch<SavedLook[]>(`/saved-looks?userId=${userId}`),

  saveLook: (look: Omit<SavedLook, 'id' | 'createdAt'>): Promise<SavedLook> =>
    apiFetch<SavedLook>('/saved-looks', {
      method: 'POST',
      body: JSON.stringify({
        userId: look.userId,
        name: look.name,
        note: look.note,
        tryOnResultId: look.tryOnResultId,
        productIds: (look.products ?? []).map((product) => product.id),
      }),
    }),

  deleteSavedLook: (lookId: string): Promise<void> =>
    apiFetch<void>(`/saved-looks/${lookId}`, { method: 'DELETE' }),

  // ── Style Preferences ─────────────────────────────────────────────────────
  updateStylePreferences: (
    userId: string,
    data: {
      stylePreference: Record<string, unknown>;
      preferredColors: string[];
      avoidedColors: string[];
      budgetMin?: number | null;
      budgetMax?: number | null;
      budgetLabel?: string | null;
    },
  ): Promise<void> =>
    apiFetch<void>(`/style-preferences/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // PUT /style-preferences/:userId
  saveStylePreferences: (
    userId: string,
    prefs: { styles?: string[]; colors?: string[]; budget?: string; gender?: string; size?: string },
  ): Promise<void> => {
    const BUDGET_RANGES: Record<string, { min?: number; max?: number; label: string }> = {
      under500:    {              max: 500,  label: 'Under ₹500' },
      '500_2000':  { min: 500,   max: 2000, label: '₹500 – ₹2,000' },
      '2000_5000': { min: 2000,  max: 5000, label: '₹2,000 – ₹5,000' },
      above5000:   { min: 5000,             label: 'Above ₹5,000' },
    };
    const budget = prefs.budget ? BUDGET_RANGES[prefs.budget] : undefined;
    return apiFetch<void>(`/style-preferences/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        stylePreference: { styles: prefs.styles ?? [] },
        preferredColors: prefs.colors ?? [],
        avoidedColors:   [],
        ...(budget && {
          budgetMin:   budget.min ?? null,
          budgetMax:   budget.max ?? null,
          budgetLabel: budget.label,
        }),
        ...(prefs.gender && { gender: prefs.gender }),
        ...(prefs.size   && { defaultSize: prefs.size }),
      }),
    });
  },

  // GET /social/pins — personalised Pinterest pins with gender/size/budget filtering
  pinterestPins: (params: {
    gender?: string; size?: string; budget?: string;
    styles?: string[]; colors?: string[]; limit?: number;
  }): Promise<{ data: TrendingPin[]; source: string; count: number }> => {
    const qs = new URLSearchParams();
    if (params.gender)            qs.set('gender',  params.gender);
    if (params.size)              qs.set('size',    params.size);
    if (params.budget)            qs.set('budget',  params.budget);
    if (params.styles?.length)    qs.set('styles',  params.styles.join(','));
    if (params.colors?.length)    qs.set('colors',  params.colors.join(','));
    if (params.limit)             qs.set('limit',   String(params.limit));
    return apiFetch(`/social/pins?${qs}`);
  },

  // ── Referrals & Share ─────────────────────────────────────────────────────
  referralCode: (): Promise<{ id: string; code: string; userId: string }> =>
    apiFetch('/referrals/code'),

  recordShare: (data: { tryOnRequestId?: string; savedLookId?: string; channel: string }): Promise<void> =>
    apiFetch('/engagement/share-events', { method: 'POST', body: JSON.stringify(data) }),

  // ── Merchant Portal ───────────────────────────────────────────────────────
  merchantRegister: (data: { name: string; url: string; region: string; description?: string }): Promise<{ id: string; name: string; slug: string }> =>
    apiFetch('/merchant/register', { method: 'POST', body: JSON.stringify(data) }),

  merchantShop: (): Promise<{
    id: string; name: string; slug: string; url: string; region: string;
    description: string | null;
    inventoryOffers: Array<{ id: string; price: number; stock: number; externalUrl: string; variantId: string; variant?: { id: string; product?: { id: string; name: string } } }>;
  }> =>
    apiFetch('/merchant/shop'),

  merchantUpdateShop: (data: { name?: string; url?: string; region?: string; description?: string }): Promise<void> =>
    apiFetch('/merchant/shop', { method: 'PUT', body: JSON.stringify(data) }),

  merchantCreateOffer: (data: { variantId: string; externalUrl: string; price: number; stock: number; currency?: string }): Promise<{ id: string }> =>
    apiFetch('/merchant/offers', { method: 'POST', body: JSON.stringify(data) }),

  merchantUpdateOffer: (offerId: string, data: { price?: number; stock?: number; externalUrl?: string }): Promise<void> =>
    apiFetch(`/merchant/offers/${offerId}`, { method: 'PUT', body: JSON.stringify(data) }),

  merchantDeleteOffer: (offerId: string): Promise<void> =>
    apiFetch(`/merchant/offers/${offerId}`, { method: 'DELETE' }),

  merchantAnalytics: (): Promise<{
    shopName: string; productCount: number; offerCount: number;
    tryOnCount: number; completedTryOns: number; conversionRate: number;
  }> =>
    apiFetch('/merchant/analytics'),

  // ── Social Trending ───────────────────────────────────────────────────────
  socialTrending: (limit = 8): Promise<TrendingPin[]> =>
    apiFetch<TrendingPin[]>(`/social/trending?limit=${limit}`),

  // ── Onboarding / Style Quiz ───────────────────────────────────────────────
  styleQuiz: (data: {
    userId: string;
    question: string;
    answer: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{
    nextQuestion: string | null;
    extractedPrefs: Record<string, unknown> | null;
    isComplete: boolean;
  }> =>
    apiFetch('/onboarding/style-quiz', { method: 'POST', body: JSON.stringify(data) }),

  // ── Garment Identification ────────────────────────────────────────────────
  identifyGarment: (garmentUrl: string): Promise<{
    category: string;
    fabric: string;
    occasions: string[];
    color: string;
    description: string;
  }> =>
    apiFetch('/try-on/identify-garment', { method: 'POST', body: JSON.stringify({ garmentUrl }) }),

  // ── Affiliate ─────────────────────────────────────────────────────────────
  affiliateLink: (productId: string): Promise<{
    affiliateUrl: string;
    shopName: string | null;
    price: number | null;
  }> =>
    apiFetch(`/affiliate/product-link?productId=${productId}`),

  // ── Post-try-on recommendations ───────────────────────────────────────────
  afterTryOnRecs: (userId: string, tryOnRequestId: string): Promise<Recommendation[]> =>
    apiFetch<Recommendation[]>('/recommendations/after-tryon', {
      method: 'POST',
      body: JSON.stringify({ userId, tryOnRequestId }),
    }),

  // ── Uploads ───────────────────────────────────────────────────────────────
  createUploadSession: (userId: string, mimeType: string, purpose: string): Promise<UploadSession> =>
    apiFetch<UploadSession>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ userId, mimeType, purpose }),
    }),

  uploadToSession: (uploadPath: string, userId: string, localUri: string, mimeType: string): Promise<unknown> => {
    const form = new FormData();
    form.append('userId', userId);
    const filename = localUri.split('/').pop() ?? 'file.jpg';
    form.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
    return apiUpload(uploadPath, form);
  },

  // ── Try-On ────────────────────────────────────────────────────────────────
  createTryOn: async (
    userId: string,
    variantId: string | undefined,
    userPhotoUri: string,
    options?: {
      viewAngles?: ViewAngle[];
      garmentPhotoUri?: string;
      provider?: string;
    }
  ): Promise<TryOnRequest> => {
    const form = new FormData();
    form.append('userId', userId);
    if (variantId) {
      form.append('variantId', variantId);
    }
    if (options?.viewAngles?.length) {
      form.append('viewAngles', options.viewAngles.join(','));
    }
    if (options?.provider) {
      form.append('provider', options.provider);
    }

    const photoFilename = userPhotoUri.split('/').pop() ?? 'photo.jpg';
    const photoExt = photoFilename.split('.').pop()?.toLowerCase() ?? 'jpg';
    form.append('userPhoto', {
      uri: userPhotoUri,
      name: photoFilename,
      type: photoExt === 'png' ? 'image/png' : 'image/jpeg',
    } as unknown as Blob);

    if (options?.garmentPhotoUri) {
      const garmentFilename = options.garmentPhotoUri.split('/').pop() ?? 'garment.jpg';
      const garmentExt = garmentFilename.split('.').pop()?.toLowerCase() ?? 'jpg';
      form.append('garmentPhoto', {
        uri: options.garmentPhotoUri,
        name: garmentFilename,
        type: garmentExt === 'png' ? 'image/png' : 'image/jpeg',
      } as unknown as Blob);
    }

    return apiUpload<TryOnRequest>('/try-on/requests', form);
  },

  tryOnResult: (requestId: string): Promise<TryOnResult> =>
    apiFetch<TryOnResult>(`/try-on/requests/${requestId}`),

  pollTryOnResult: async (requestId: string, onProgress?: (pct: number) => void): Promise<TryOnResult> => {
    const INTERVAL = 800;
    const MAX_TRIES = 45;
    for (let i = 0; i < MAX_TRIES; i++) {
      await new Promise(r => setTimeout(r, INTERVAL));
      const result = await mobileApi.tryOnResult(requestId);
      onProgress?.(Math.min(Math.round(((i + 1) / MAX_TRIES) * 100), 95));
      if (result.status === 'COMPLETED') { onProgress?.(100); return result; }
      if (result.status === 'FAILED') throw new Error('Try-on processing failed on the server.');
    }
    throw new Error('Try-on timed out. Please try again.');
  },

  // ── Admin: Brands ─────────────────────────────────────────────────────────
  adminListBrands: (): Promise<any[]> => apiFetch<any[]>('/brands'),
  adminCreateBrand: (data: { name: string; slug: string; countryCode: string; sizingNotes?: string }): Promise<any> =>
    apiFetch<any>('/brands', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateBrand: (id: string, data: { name: string; slug: string; countryCode: string; sizingNotes?: string }): Promise<any> =>
    apiFetch<any>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Products ───────────────────────────────────────────────────────
  adminListProducts: (): Promise<any[]> => apiFetch<any[]>('/products'),
  adminCreateProduct: (data: any): Promise<any> =>
    apiFetch<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateProduct: (id: string, data: any): Promise<any> =>
    apiFetch<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Users ──────────────────────────────────────────────────────────
  adminListUsers: (): Promise<any[]> => apiFetch<any[]>('/users'),

  // ── Admin: Shops ──────────────────────────────────────────────────────────
  adminListShops: (): Promise<any[]> => apiFetch<any[]>('/shops'),
  adminCreateShop: (data: { name: string; slug: string; url: string; region: string; description?: string }): Promise<any> =>
    apiFetch<any>('/shops', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateShop: (id: string, data: any): Promise<any> =>
    apiFetch<any>(`/shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Campaigns ──────────────────────────────────────────────────────
  adminListCampaigns: (): Promise<any[]> => apiFetch<any[]>('/campaigns'),
  adminCreateCampaign: (data: any): Promise<any> =>
    apiFetch<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCampaign: (id: string, data: any): Promise<any> =>
    apiFetch<any>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Coupons ────────────────────────────────────────────────────────
  adminListCoupons: (): Promise<any[]> => apiFetch<any[]>('/coupons'),
  adminCreateCoupon: (data: any): Promise<any> =>
    apiFetch<any>('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCoupon: (id: string, data: any): Promise<any> =>
    apiFetch<any>(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Try-On Providers ───────────────────────────────────────────────
  adminListProviderConfigs: (): Promise<any[]> => apiFetch<any[]>('/try-on/provider-configs'),
  adminUpdateProviderConfig: (provider: string, data: { displayName: string; isEnabled: boolean; baseUrl?: string; apiKeyHint?: string }): Promise<any> =>
    apiFetch<any>(`/try-on/provider-configs/${provider}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Admin: Rewards ────────────────────────────────────────────────────────
  adminAdjustRewards: (userId: string, amount: number, reason: string): Promise<any> =>
    apiFetch<any>('/rewards/transactions/adjust', { method: 'POST', body: JSON.stringify({ userId, amount, reason }) }),

  // ── Admin: Pinterest Boards ───────────────────────────────────────────────
  adminGetPinterestBoards: (): Promise<Array<{ key: string; boardId: string }>> =>
    apiFetch<Array<{ key: string; boardId: string }>>('/social/boards'),

  adminUpdatePinterestBoards: (boards: Array<{ key: string; boardId: string }>): Promise<{ updated: number }> =>
    apiFetch<{ updated: number }>('/social/boards', {
      method: 'PUT',
      body: JSON.stringify({ boards }),
    }),
};
