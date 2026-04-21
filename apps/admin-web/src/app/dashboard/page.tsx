import { Card } from "../../components/card";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function DashboardPage() {
  const [products, shops, tryOnRequests] = await Promise.all([
    fetchApi<any[]>("/products"),
    fetchApi<any[]>("/shops"),
    fetchApi<any[]>("/try-on/requests")
  ]);

  return (
    <AdminShell>
      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Catalog" subtitle="Products currently seeded and available">
          <div className="text-4xl font-semibold">{products.length}</div>
        </Card>
        <Card title="Retail partners" subtitle="Connected shops with live offers">
          <div className="text-4xl font-semibold">{shops.length}</div>
        </Card>
        <Card title="Try-on queue" subtitle="Requests processed across providers">
          <div className="text-4xl font-semibold">{tryOnRequests.length}</div>
        </Card>
      </div>
    </AdminShell>
  );
}
