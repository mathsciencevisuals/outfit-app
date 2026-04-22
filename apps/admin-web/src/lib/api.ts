import { cookies } from "next/headers";

import { env } from "./env";

const TOKEN_COOKIE_NAME = "fitme_access_token";

export async function fetchApi<T>(path: string): Promise<T> {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    next: { revalidate: 0 },
    headers: token ? { authorization: `Bearer ${token}` } : undefined
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}
