export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function ProductsPage() {
  const products = await fetchApi<any[]>("/products");

  return (
    <AdminShell>
      <Card title="Products" subtitle="Feature-based merchandising data flowing from Prisma.">
        <DataTable
          headers={["Name", "Brand", "Category", "Base color", "Variants"]}
          rows={products.map((product) => [
            product.name,
            product.brand?.name ?? "-",
            product.category,
            product.baseColor,
            product.variants?.length ?? 0
          ])}
        />
      </Card>
    </AdminShell>
  );
}
