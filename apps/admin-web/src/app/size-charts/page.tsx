export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function SizeChartsPage() {
  const sizeCharts = await fetchApi<any[]>("/size-charts");

  return (
    <AdminShell>
      <Card title="Size charts" subtitle="Structured ranges that drive the fit engine.">
        <DataTable
          headers={["Brand", "Category", "Entries", "Notes"]}
          rows={sizeCharts.map((chart) => [
            chart.brand?.name ?? "-",
            chart.category,
            chart.entries?.length ?? 0,
            chart.notes ?? "-"
          ])}
        />
      </Card>
    </AdminShell>
  );
}
