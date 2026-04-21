import { env } from "./env";

export async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}
