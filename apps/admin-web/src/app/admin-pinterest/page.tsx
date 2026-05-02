export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Card } from "../../components/card";
import { AdminShell } from "../../components/shell";
import { fetchApi, writeApi } from "../../lib/api";
import { requireAdminSession } from "../../lib/auth";
import { boardGroups, boardLabels, orderedBoardKeys, type BoardEntry } from "../../lib/pinterest-boards";

async function saveBoards(formData: FormData) {
  "use server";

  const boards: BoardEntry[] = [];
  for (const key of orderedBoardKeys()) {
    const boardId = String(formData.get(`board-${key}`) ?? "").trim();
    boards.push({ key, boardId });
  }

  await writeApi<{ updated: number }>("/social/boards", {
    method: "PUT",
    body: { boards }
  });

  revalidatePath("/admin-pinterest");
  redirect("/admin-pinterest?saved=1");
}

export default async function AdminPinterestPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  await requireAdminSession();

  const entries = await fetchApi<BoardEntry[]>("/social/boards");
  const entryMap = new Map(entries.map((entry) => [entry.key, entry.boardId]));
  const filledCount = entries.filter((entry) => entry.boardId.trim()).length;
  const totalCount = entries.length;
  const progressPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        <Card
          title="Pinterest boards"
          subtitle="Configure the board IDs used by the GCP API for personalized Pinterest feeds and pin creation."
        >
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-700">{filledCount} / {totalCount} boards configured</span>
              <span className="text-slate-500">{progressPct}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-ink" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {searchParams?.saved ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Board IDs saved. The API cache was invalidated.
            </div>
          ) : null}
          <a
            href="/admin-pinterest/pins"
            className="inline-flex w-fit rounded-2xl border border-dune px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create pins
          </a>
        </Card>

        <form action={saveBoards} className="space-y-6">
          {boardGroups.map((group) => (
            <Card key={group.title} title={group.title} subtitle={group.subtitle}>
              <div className="divide-y divide-dune">
                {group.keys.map((key) => {
                  const value = entryMap.get(key) ?? "";
                  return (
                    <label key={key} className="grid gap-3 py-4 md:grid-cols-[1fr_260px] md:items-center">
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{boardLabels[key] ?? key}</span>
                        <span className="mt-1 block font-mono text-xs text-slate-500">{key}</span>
                      </span>
                      <input
                        name={`board-${key}`}
                        defaultValue={value}
                        inputMode="numeric"
                        placeholder="Board ID"
                        className={`rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-slate-400 ${
                          value ? "border-emerald-300 bg-emerald-50" : "border-dune bg-white"
                        }`}
                      />
                    </label>
                  );
                })}
              </div>
            </Card>
          ))}

          <div className="sticky bottom-6 flex justify-end">
            <button className="rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700">
              Save all board IDs
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
