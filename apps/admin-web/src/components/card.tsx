import { PropsWithChildren } from "react";

export function Card({
  title,
  subtitle,
  children
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section className="rounded-[28px] border border-dune bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
