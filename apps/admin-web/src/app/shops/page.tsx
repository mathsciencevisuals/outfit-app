import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function ShopsPage() {
  const shops = await fetchApi<any[]>("/shops");

  return (
    <AdminShell>
      <Card title="Shops" subtitle="Inventory offers mapped to product variants.">
        <DataTable
          headers={["Shop", "Region", "URL", "Offers"]}
          rows={shops.map((shop) => [shop.name, shop.region, shop.url, shop.inventoryOffers?.length ?? 0])}
        />
      </Card>
    </AdminShell>
  );
}
