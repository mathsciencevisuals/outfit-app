export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { readAdminSession } from "../lib/auth";

export default async function HomePage() {
  const session = await readAdminSession();
  if (session && (session.user.role === "ADMIN" || session.user.role === "OPERATOR")) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-sand px-6 py-16 text-ink">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-dune bg-white p-10 shadow-sm">
        <div className="text-xs uppercase tracking-[0.35em] text-slate-500">FitMe Admin</div>
        <h1 className="mt-4 text-4xl font-semibold">Protected operations surface</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Admin routes now require a valid FitMe access token stored in the <code>fitme_access_token</code> cookie,
          and the authenticated account must carry the <code>ADMIN</code> or <code>OPERATOR</code> role.
        </p>
      </div>
    </main>
  );
}
