export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function CampaignsPage() {
  const campaigns = await fetchApi<any[]>("/campaigns");

  const active = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;
  const bannerCount = campaigns.reduce((sum, campaign) => sum + (campaign.banners?.length ?? 0), 0);

  return (
    <AdminShell>
      <Card title="Campaign management" subtitle="Student promotions, themed banners, and growth campaigns.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Total campaigns</div>
            <div className="mt-2 text-3xl font-semibold">{campaigns.length}</div>
          </div>
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Active campaigns</div>
            <div className="mt-2 text-3xl font-semibold">{active}</div>
          </div>
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Live banners</div>
            <div className="mt-2 text-3xl font-semibold">{bannerCount}</div>
          </div>
        </div>
      </Card>

      <Card title="Campaign table" subtitle="Current campaign inventory exposed through the API management layer.">
        <DataTable
          headers={["Title", "Theme", "Status", "Audience", "Banners", "Coupons"]}
          rows={campaigns.map((campaign) => [
            campaign.title,
            campaign.theme,
            campaign.status,
            campaign.targetAudience,
            campaign.banners?.length ?? 0,
            campaign.coupons?.length ?? 0
          ])}
        />
      </Card>
    </AdminShell>
  );
}
