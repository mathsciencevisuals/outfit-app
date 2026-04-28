import { env } from '../utils/env';
import { useAppStore } from '../store/app-store';
import type {
  UserProfile, UserStats, Measurement, Product,
  Recommendation, SavedLook, Shop,
  TryOnRequest, TryOnResult, ViewAngle,
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
      method: 'PATCH', body: JSON.stringify(updates),
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
  // Returns top trending products (sorted by instagramLikes, trending=true)
  trending: (limit = 4): Promise<Product[]> =>
    apiFetch<Product[]>(`/products/trending?limit=${limit}`),

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
    apiFetch<SavedLook>('/saved-looks', { method: 'POST', body: JSON.stringify(look) }),

  deleteSavedLook: (lookId: string): Promise<void> =>
    apiFetch<void>(`/saved-looks/${lookId}`, { method: 'DELETE' }),

  // ── Style Preferences ─────────────────────────────────────────────────────
  // PUT /style-preferences/:userId
  saveStylePreferences: (
    userId: string,
    prefs: { styles?: string[]; colors?: string[]; budget?: string },
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
      }),
    });
  },

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
};
