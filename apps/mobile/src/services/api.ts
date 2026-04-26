import { env } from '../utils/env';
import type {
  UserProfile, UserStats, Measurement, Product,
  Recommendation, SavedLook, Shop,
  TryOnRequest, TryOnResult,
} from '../types';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload ${response.status}: ${text || response.statusText}`);
  }
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export const mobileApi = {
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
  // POST /users/:userId/style-preferences
  saveStylePreferences: (
    userId: string,
    prefs: { styles?: string[]; colors?: string[]; budget?: string },
  ): Promise<void> =>
    apiFetch<void>(`/users/${userId}/style-preferences`, {
      method: 'POST', body: JSON.stringify(prefs),
    }),

  // ── Try-On ────────────────────────────────────────────────────────────────
  createTryOn: async (userId: string, variantId: string, localImageUri: string): Promise<TryOnRequest> => {
    const form = new FormData();
    form.append('userId', userId);
    form.append('variantId', variantId);
    const filename = localImageUri.split('/').pop() ?? 'photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    form.append('userPhoto', { uri: localImageUri, name: filename, type: ext === 'png' ? 'image/png' : 'image/jpeg' } as unknown as Blob);
    return apiUpload<TryOnRequest>('/try-on/requests', form);
  },

  tryOnResult: (requestId: string): Promise<TryOnResult> =>
    apiFetch<TryOnResult>(`/try-on/requests/${requestId}`),

  pollTryOnResult: async (requestId: string, onProgress?: (pct: number) => void): Promise<TryOnResult> => {
    const INTERVAL = 800;
    const MAX_TRIES = 38;
    for (let i = 0; i < MAX_TRIES; i++) {
      await new Promise(r => setTimeout(r, INTERVAL));
      const result = await mobileApi.tryOnResult(requestId);
      onProgress?.(Math.min(Math.round(((i + 1) / MAX_TRIES) * 100), 95));
      if (result.status === 'complete') { onProgress?.(100); return result; }
      if (result.status === 'error') throw new Error('Try-on processing failed on the server.');
    }
    throw new Error('Try-on timed out. Please try again.');
  },
};
