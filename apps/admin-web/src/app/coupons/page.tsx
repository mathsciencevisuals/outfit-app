export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function CouponsPage() {
  const coupons = await fetchApi<any[]>("/coupons");

  const unlockable = coupons.filter((coupon) => coupon.isActive).length;
  const redeemed = coupons.reduce((sum, coupon) => {
    const redemptions = Array.isArray(coupon.redemptions) ? coupon.redemptions : [];
    return sum + redemptions.filter((redemption: any) => redemption.status === "REDEEMED").length;
  }, 0);

  return (
    <AdminShell>
      <Card title="Coupon management" subtitle="Reward-gated and campaign-linked coupons for student conversion.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Coupon inventory</div>
            <div className="mt-2 text-3xl font-semibold">{coupons.length}</div>
          </div>
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Active coupons</div>
            <div className="mt-2 text-3xl font-semibold">{unlockable}</div>
          </div>
          <div className="rounded-3xl border border-dune bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Redeemed</div>
            <div className="mt-2 text-3xl font-semibold">{redeemed}</div>
          </div>
        </div>
      </Card>

      <Card title="Coupon table" subtitle="Reward thresholds, points cost, and current redemption activity.">
        <DataTable
          headers={["Code", "Title", "Type", "Value", "Threshold", "Cost", "Campaign"]}
          rows={coupons.map((coupon) => [
            coupon.code,
            coupon.title,
            coupon.type,
            coupon.discountValue,
            coupon.unlockThreshold ?? "-",
            coupon.rewardCostPoints ?? "-",
            coupon.campaign?.title ?? "-"
          ])}
        />
      </Card>
    </AdminShell>
  );
}
