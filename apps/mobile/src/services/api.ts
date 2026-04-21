import type {
  Measurement,
  Product,
  Recommendation,
  SavedLook,
  Shop,
  TryOnRequest,
  TryOnResult,
  UserProfile
} from "../types/api";
import { env } from "../utils/env";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export const mobileApi = {
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
  createTryOn: (userId: string, variantId: string, imageUrl: string): Promise<TryOnRequest> =>
    apiFetch("/try-on/requests", {
      method: "POST",
      body: JSON.stringify({ userId, variantId, imageUrl })
    }),
  tryOnResult: (requestId: string): Promise<TryOnResult> =>
    apiFetch(`/try-on/requests/${requestId}`)
};
