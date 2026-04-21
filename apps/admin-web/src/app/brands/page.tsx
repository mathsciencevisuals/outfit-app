export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function BrandsPage() {
  const brands = await fetchApi<any[]>("/brands");

  return (
    <AdminShell>
      <Card title="Brands" subtitle="Brand metadata and sizing notes used by fit calculations.">
        <DataTable
          headers={["Brand", "Country", "Products", "Sizing notes"]}
          rows={brands.map((brand) => [
            brand.name,
            brand.countryCode,
            brand.products?.length ?? 0,
            brand.sizingNotes ?? "-"
          ])}
        />
      </Card>
    </AdminShell>
  );
}
