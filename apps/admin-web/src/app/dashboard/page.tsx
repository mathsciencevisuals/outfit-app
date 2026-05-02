export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

async function fetchCount(path: string) {
  try {
    const rows = await fetchApi<any[]>(path);
    return { count: rows.length, error: null as string | null };
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error ? error.message : "Request failed"
    };
  }
}

export default async function DashboardPage() {
  const [products, shops, tryOnRequests] = await Promise.all([
    fetchCount("/products"),
    fetchCount("/shops"),
    fetchCount("/try-on/requests")
  ]);

  return (
    <AdminShell>
      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Catalog" subtitle="Products currently seeded and available">
          <div className="text-4xl font-semibold">{products.count}</div>
          {products.error ? <p className="text-sm text-red-600">Unavailable</p> : null}
        </Card>
        <Card title="Retail partners" subtitle="Connected shops with live offers">
          <div className="text-4xl font-semibold">{shops.count}</div>
          {shops.error ? <p className="text-sm text-red-600">Unavailable</p> : null}
        </Card>
        <Card title="Try-on queue" subtitle="Requests processed across providers">
          <div className="text-4xl font-semibold">{tryOnRequests.count}</div>
          {tryOnRequests.error ? <p className="text-sm text-red-600">Unavailable</p> : null}
        </Card>
      </div>
    </AdminShell>
  );
}
