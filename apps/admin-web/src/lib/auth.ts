import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "./env";

export type AdminSession = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN" | "OPERATOR";
  };
};

const TOKEN_COOKIE_NAME = "fitme_access_token";

export async function readAdminSession(): Promise<AdminSession | null> {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/session`, {
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data: AdminSession };
  return payload.data;
}

export async function requireAdminSession() {
  const session = await readAdminSession();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
    redirect("/");
  }

  return session;
}
