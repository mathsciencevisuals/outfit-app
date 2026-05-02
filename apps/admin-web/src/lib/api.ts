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
    const text = await response.text().catch(() => "");
    throw new Error(`API request failed for ${path}: ${response.status} ${text || response.statusText}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export async function writeApi<T>(path: string, init: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown }): Promise<T> {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method: init.method,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API request failed for ${path}: ${text || response.statusText}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}
