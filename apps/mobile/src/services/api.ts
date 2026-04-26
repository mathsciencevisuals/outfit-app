import { env } from '../utils/env';
import type {
  UserProfile, Measurement, Product,
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
  onboarding: (): Promise<{ title: string; subtitle: string }> =>
    Promise.resolve({ title: 'Find your best fit faster', subtitle: 'Profile, measurements, try-on, and recommendations in one flow.' }),

  profile: (userId: string): Promise<UserProfile> =>
    apiFetch<UserProfile>(`/profile/${userId}`),

  updateProfile: (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> =>
    apiFetch<UserProfile>(`/profile/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  measurements: (userId: string): Promise<Measurement[]> =>
    apiFetch<Measurement[]>(`/measurements?userId=${userId}`),

  saveMeasurements: (userId: string, data: Partial<Measurement>): Promise<Measurement> =>
    apiFetch<Measurement>('/measurements', { method: 'POST', body: JSON.stringify({ userId, ...data }) }),

  products: (params?: { category?: string; limit?: number }): Promise<Product[]> => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit)    qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return apiFetch<Product[]>(`/products${query}`);
  },

  recommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch<Recommendation[]>(`/recommendations?userId=${userId}`),

  generateRecommendations: (userId: string): Promise<Recommendation[]> =>
    apiFetch<Recommendation[]>('/recommendations/generate', { method: 'POST', body: JSON.stringify({ userId }) }),

  shops: (): Promise<Shop[]> => apiFetch<Shop[]>('/shops'),

  savedLooks: (userId: string): Promise<SavedLook[]> =>
    apiFetch<SavedLook[]>(`/saved-looks?userId=${userId}`),

  saveLook: (look: Omit<SavedLook, 'id' | 'createdAt'>): Promise<SavedLook> =>
    apiFetch<SavedLook>('/saved-looks', { method: 'POST', body: JSON.stringify(look) }),

  createTryOn: async (userId: string, variantId: string, localImageUri: string): Promise<TryOnRequest> => {
    const form = new FormData();
    form.append('userId', userId);
    form.append('variantId', variantId);
    const filename = localImageUri.split('/').pop() ?? 'photo.jpg';
    const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    form.append('userPhoto', { uri: localImageUri, name: filename, type: ext === 'png' ? 'image/png' : 'image/jpeg' } as unknown as Blob);
    return apiUpload<TryOnRequest>('/try-on/requests', form);
  },

  tryOnResult: (requestId: string): Promise<TryOnResult> =>
    apiFetch<TryOnResult>(`/try-on/requests/${requestId}`),

  saveStylePreferences: (
    userId: string,
    prefs: { styles?: string[]; colors?: string[]; budget?: string },
  ): Promise<void> =>
    apiFetch<void>(`/users/${userId}/style-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    }),

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
