export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";
import { requireAdminSession } from "../../lib/auth";

type TrendSourceStatus = "active" | "pending approval" | "error" | "disabled";

type TrendProviderDiagnostic = {
  provider: "instagram" | "pinterest" | "internal" | "affiliate_catalog";
  status: TrendSourceStatus;
  lastFetchStatus: TrendSourceStatus;
  errorMessage: string | null;
  lastSuccessfulFetchAt: string | null;
  updatedAt: string;
  notes?: string;
};

function labelForProvider(provider: string) {
  return provider
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: TrendSourceStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (status === "disabled") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default async function TrendDiagnosticsPage() {
  await requireAdminSession();
  const diagnostics = await fetchApi<TrendProviderDiagnostic[]>("/social/diagnostics");

  return (
    <AdminShell>
      <div className="space-y-6">
        <Card
          title="Trend source diagnostics"
          subtitle="Instagram is optional and non-blocking. FitMe prioritizes Pinterest, internal app signals, and affiliate catalog trends."
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Instagram Graph API hashtag search has tight rolling limits, so Discover and Recommendations must not depend on it as the primary trend source.
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {diagnostics.map((item) => (
            <Card key={item.provider} title={labelForProvider(item.provider)} subtitle={item.notes ?? "No notes."}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}>
                  {item.status}
                </span>
                <span className="rounded-full border border-dune bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                  Last fetch: {item.lastFetchStatus}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-700">Last successful fetch</dt>
                  <dd className="mt-1 text-slate-500">{formatDate(item.lastSuccessfulFetchAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Last updated</dt>
                  <dd className="mt-1 text-slate-500">{formatDate(item.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Message</dt>
                  <dd className="mt-1 text-slate-500">{item.errorMessage ?? "No recent errors."}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
