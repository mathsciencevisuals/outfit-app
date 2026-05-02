import Link from "next/link";
import { PropsWithChildren } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdminSession } from "../lib/auth";

const links = [
  ["/dashboard", "Dashboard"],
  ["/products", "Products"],
  ["/brands", "Brands"],
  ["/size-charts", "Size charts"],
  ["/shops", "Shops"],
  ["/campaigns", "Campaigns"],
  ["/coupons", "Coupons"],
  ["/admin-pinterest", "Pinterest"],
  ["/tryon-requests", "Try-on requests"],
  ["/settings", "Provider settings"]
] as const;

async function logout() {
  "use server";

  cookies().delete("fitme_access_token");
  redirect("/");
}

export async function AdminShell({ children }: PropsWithChildren) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[28px] border border-dune bg-white p-5 shadow-sm">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">FitMe</div>
            <div className="mt-2 text-2xl font-semibold">Admin</div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-medium text-slate-800">{session.user.email}</div>
              <div>{session.user.role}</div>
            </div>
            <form action={logout} className="mt-3">
              <button className="w-full rounded-2xl border border-dune px-4 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Log out
              </button>
            </form>
          </div>
          <nav className="space-y-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href as any}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
