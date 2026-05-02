export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Card } from "../../components/card";
import { AdminShell } from "../../components/shell";
import { fetchApi, writeApi } from "../../lib/api";
import { requireAdminSession } from "../../lib/auth";

type BoardEntry = { key: string; boardId: string };

const boardGroups: Array<{ title: string; subtitle: string; keys: string[] }> = [
  {
    title: "Gender boards",
    subtitle: "Primary audience segments.",
    keys: ["men", "women", "unisex"]
  },
  {
    title: "Style boards",
    subtitle: "Mapped to style preferences and trend filters.",
    keys: ["casual", "formal", "streetwear", "ethnic", "sports", "minimalist", "party", "bohemian"]
  },
  {
    title: "Colour boards",
    subtitle: "Used when matching preferred colours.",
    keys: ["black", "white", "earthy", "blue", "navy", "pink", "red", "green", "brights"]
  },
  {
    title: "Budget boards",
    subtitle: "Used for price-filtered affiliate discovery.",
    keys: ["under500", "500_2000", "2000_5000", "above5000"]
  },
  {
    title: "Size boards",
    subtitle: "Mapped to size groups for personalized feeds.",
    keys: ["xs_s", "m_l", "xl_xxl", "plus"]
  }
];

const boardLabels: Record<string, string> = {
  men: "FitMe - Men",
  women: "FitMe - Women",
  unisex: "FitMe - Unisex",
  casual: "FitMe - Casual",
  formal: "FitMe - Formal",
  streetwear: "FitMe - Streetwear",
  ethnic: "FitMe - Ethnic Indian",
  sports: "FitMe - Sports & Active",
  minimalist: "FitMe - Minimalist",
  party: "FitMe - Party & Festive",
  bohemian: "FitMe - Bohemian",
  black: "FitMe - Black Outfits",
  white: "FitMe - White & Ivory",
  earthy: "FitMe - Earth Tones",
  blue: "FitMe - Blues",
  navy: "FitMe - Navy & Denim",
  pink: "FitMe - Pinks & Reds",
  red: "FitMe - Pinks & Reds",
  green: "FitMe - Greens",
  brights: "FitMe - Brights & Neons",
  under500: "FitMe - Under 500",
  "500_2000": "FitMe - 500 to 2000",
  "2000_5000": "FitMe - 2000 to 5000",
  above5000: "FitMe - Above 5000",
  xs_s: "FitMe - XS & S Sizes",
  m_l: "FitMe - M & L Sizes",
  xl_xxl: "FitMe - XL & XXL Sizes",
  plus: "FitMe - Plus Size Fashion"
};

async function saveBoards(formData: FormData) {
  "use server";

  const boards: BoardEntry[] = [];
  for (const key of boardGroups.flatMap((group) => group.keys)) {
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
