import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function TryOnRequestsPage() {
  const tryOnRequests = await fetchApi<any[]>("/try-on/requests");

  return (
    <AdminShell>
      <Card title="Try-on requests" subtitle="Provider jobs and generated outputs.">
        <DataTable
          headers={["User", "Product", "Provider", "Status", "Confidence"]}
          rows={tryOnRequests.map((request) => [
            request.user?.email ?? "-",
            request.variant?.product?.name ?? "-",
            request.provider,
            request.status,
            request.result?.confidence ? Math.round(request.result.confidence * 100) : "-"
          ])}
        />
      </Card>
    </AdminShell>
  );
}
