export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readAdminSession } from "../lib/auth";
import { env } from "../lib/env";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN" | "OPERATOR" | "MERCHANT";
  };
};

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    redirect("/?error=invalid");
  }

  const payload = (await response.json()) as { data: LoginResponse };
  const auth = payload.data;
  if (auth.user.role !== "ADMIN" && auth.user.role !== "OPERATOR") {
    redirect("/?error=role");
  }

  cookies().set("fitme_access_token", auth.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  redirect("/dashboard");
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const session = await readAdminSession();
  if (session && (session.user.role === "ADMIN" || session.user.role === "OPERATOR")) {
    redirect("/dashboard");
  }

  const error =
    searchParams?.error === "role"
      ? "This account is not allowed to access admin tools."
      : searchParams?.error === "invalid"
        ? "Login failed. Check the email and password."
        : null;

  return (
    <main className="min-h-screen bg-sand px-6 py-16 text-ink">
      <div className="mx-auto max-w-md rounded-[28px] border border-dune bg-white p-8 shadow-sm">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">FitMe Admin</div>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Uses the GCP API at <span className="font-medium text-slate-800">{env.NEXT_PUBLIC_API_URL}</span>.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <form action={login} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-dune px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-2xl border border-dune px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <button className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}
