import Link from "next/link";
import { PropsWithChildren } from "react";

const links = [
  ["/dashboard", "Dashboard"],
  ["/products", "Products"],
  ["/brands", "Brands"],
  ["/size-charts", "Size charts"],
  ["/shops", "Shops"],
  ["/tryon-requests", "Try-on requests"],
  ["/settings", "Provider settings"]
];

export function AdminShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[28px] border border-dune bg-white p-5 shadow-sm">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">FitMe</div>
            <div className="mt-2 text-2xl font-semibold">Admin</div>
          </div>
          <nav className="space-y-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
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
