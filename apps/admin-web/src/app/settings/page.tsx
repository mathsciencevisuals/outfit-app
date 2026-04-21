export const dynamic = "force-dynamic";

import { Card } from "../../components/card";
import { DataTable } from "../../components/data-table";
import { AdminShell } from "../../components/shell";
import { fetchApi } from "../../lib/api";

export default async function SettingsPage() {
  const providerConfigs = await fetchApi<any[]>("/try-on/provider-configs");

  return (
    <AdminShell>
      <Card title="Provider settings" subtitle="Try-on provider abstraction with mock-first rollout.">
        <DataTable
          headers={["Provider", "Display name", "Base URL", "Enabled"]}
          rows={providerConfigs.map((provider) => [
            provider.provider,
            provider.displayName,
            provider.baseUrl ?? "-",
            provider.isEnabled ? "Yes" : "No"
          ])}
        />
      </Card>
    </AdminShell>
  );
}
