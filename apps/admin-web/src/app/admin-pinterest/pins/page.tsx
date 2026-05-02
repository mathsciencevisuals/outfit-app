export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { Card } from "../../../components/card";
import { AdminShell } from "../../../components/shell";
import { fetchApi, writeApi } from "../../../lib/api";
import { requireAdminSession } from "../../../lib/auth";
import { boardLabels, type BoardEntry } from "../../../lib/pinterest-boards";

type PinInput = {
  imageUrl: string;
  title: string;
  description?: string;
  link?: string;
};

type BatchResult = {
  created: number;
  failed: number;
  results: Array<{ title: string; pinId?: string; error?: string }>;
};

function parsePins(raw: string): PinInput[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [imageUrl = "", title = "", description = "", link = ""] = line.split("|").map((part) => part.trim());
      return {
        imageUrl,
        title,
        description: description || undefined,
        link: link || undefined
      };
    })
    .filter((pin) => pin.imageUrl && pin.title);
}

function encodeResult(result: unknown) {
  return encodeURIComponent(Buffer.from(JSON.stringify(result)).toString("base64url"));
}

function decodeResult(raw?: string) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      mode: string;
      message: string;
      created: number;
      failed: number;
      results: Array<{ boardKey: string; title: string; pinId?: string; error?: string }>;
    };
  } catch {
    return null;
  }
}

async function createSinglePin(formData: FormData) {
  "use server";

  const boardKey = String(formData.get("boardKey") ?? "");
  const pin: PinInput = {
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    link: String(formData.get("link") ?? "").trim() || undefined
  };

  const result = await writeApi<{ pinId: string; pinterestUrl: string }>("/social/pins/create", {
    method: "POST",
    body: { boardKey, ...pin }
  });

  redirect(`/admin-pinterest/pins?result=${encodeResult({
    mode: "single",
    message: `Created 1 pin on ${boardLabels[boardKey] ?? boardKey}`,
    created: 1,
    failed: 0,
    results: [{ boardKey, title: pin.title, pinId: result.pinId }]
  })}`);
}

async function createBatchPins(formData: FormData) {
  "use server";

  const boardKey = String(formData.get("boardKey") ?? "");
  const pins = parsePins(String(formData.get("batchText") ?? ""));
  const result = await writeApi<BatchResult>("/social/pins/batch", {
    method: "POST",
    body: { boardKey, pins }
  });

  redirect(`/admin-pinterest/pins?result=${encodeResult({
    mode: "batch",
    message: `Posted ${pins.length} pin rows to ${boardLabels[boardKey] ?? boardKey}`,
    created: result.created,
    failed: result.failed,
    results: result.results.map((row) => ({ boardKey, ...row }))
  })}`);
}

async function createPinsForAllBoards(formData: FormData) {
  "use server";

  const boardKeys = String(formData.get("boardKeys") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const pins = parsePins(String(formData.get("batchText") ?? ""));

  const aggregate = {
    mode: "all",
    message: `Posted ${pins.length} pin rows to ${boardKeys.length} configured boards`,
    created: 0,
    failed: 0,
    results: [] as Array<{ boardKey: string; title: string; pinId?: string; error?: string }>
  };

  for (const boardKey of boardKeys) {
    try {
      const result = await writeApi<BatchResult>("/social/pins/batch", {
        method: "POST",
        body: { boardKey, pins }
      });
      aggregate.created += result.created;
      aggregate.failed += result.failed;
      aggregate.results.push(...result.results.map((row) => ({ boardKey, ...row })));
    } catch (error) {
      aggregate.failed += pins.length;
      const message = error instanceof Error ? error.message : "Request failed";
      aggregate.results.push(...pins.map((pin) => ({ boardKey, title: pin.title, error: message })));
    }
  }

  redirect(`/admin-pinterest/pins?result=${encodeResult(aggregate)}`);
}

export default async function AdminPinterestPinsPage({
  searchParams
}: {
  searchParams?: { result?: string };
}) {
  await requireAdminSession();

  const boards = await fetchApi<BoardEntry[]>("/social/boards");
  const configuredBoards = boards.filter((board) => board.boardId.trim());
  const firstBoardKey = configuredBoards[0]?.key ?? "";
  const result = decodeResult(searchParams?.result);

  return (
    <AdminShell>
      <div className="space-y-6">
        <Card
          title="Create Pinterest pins"
          subtitle="Post single pins, batch rows, or the same batch to every configured board through the GCP API."
        >
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin-pinterest"
              className="rounded-2xl border border-dune px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Board IDs
            </a>
            <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {configuredBoards.length} configured boards
            </span>
          </div>
          {configuredBoards.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Configure board IDs first before creating pins.
            </div>
          ) : null}
        </Card>

        {result ? (
          <Card title={result.message} subtitle={`${result.created} created, ${result.failed} failed`}>
            <div className="max-h-[420px] overflow-auto rounded-2xl border border-dune">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Board</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dune">
                  {result.results.map((row, index) => (
                    <tr key={`${row.boardKey}-${row.title}-${index}`}>
                      <td className="px-4 py-3 font-medium">{row.error ? "Failed" : "Created"}</td>
                      <td className="px-4 py-3">{boardLabels[row.boardKey] ?? row.boardKey}</td>
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.error ?? row.pinId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Single pin" subtitle="Create one pin on one configured board.">
            <form action={createSinglePin} className="space-y-4">
              <BoardSelect boards={configuredBoards} defaultValue={firstBoardKey} />
              <Field name="imageUrl" label="Image URL" placeholder="https://example.com/image.jpg" required />
              <Field name="title" label="Title" placeholder="Pastel Kurta Set" required />
              <Field name="description" label="Description" placeholder="Short Pinterest description" textarea />
              <Field name="link" label="Outbound link" placeholder="https://shop.example.com/product" />
              <button disabled={!firstBoardKey} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                Post single pin
              </button>
            </form>
          </Card>

          <Card title="Batch pin rows" subtitle="Format: imageUrl | title | description | link">
            <form action={createBatchPins} className="space-y-4">
              <BoardSelect boards={configuredBoards} defaultValue={firstBoardKey} />
              <BatchTextarea />
              <button disabled={!firstBoardKey} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                Post batch to selected board
              </button>
            </form>
          </Card>
        </div>

        <Card title="Post batch to all configured boards" subtitle="This repeats the pasted rows once for every configured board ID.">
          <form action={createPinsForAllBoards} className="space-y-4">
            <input type="hidden" name="boardKeys" value={configuredBoards.map((board) => board.key).join(",")} />
            <BatchTextarea />
            <button disabled={configuredBoards.length === 0} className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              Post batch to all {configuredBoards.length} boards
            </button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}

function BoardSelect({ boards, defaultValue }: { boards: BoardEntry[]; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Board</span>
      <select
        name="boardKey"
        defaultValue={defaultValue}
        required
        className="mt-2 w-full rounded-2xl border border-dune bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
      >
        {boards.map((board) => (
          <option key={board.key} value={board.key}>
            {boardLabels[board.key] ?? board.key}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  textarea
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const className = "mt-2 w-full rounded-2xl border border-dune px-4 py-3 text-sm outline-none focus:border-slate-400";
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea name={name} placeholder={placeholder} rows={4} className={className} />
      ) : (
        <input name={name} required={required} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}

function BatchTextarea() {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Pin rows</span>
      <textarea
        name="batchText"
        required
        rows={8}
        placeholder={"https://example.com/image.jpg | Cotton Kurta | College-ready pastel outfit | https://shop.example.com/product\nhttps://example.com/dress.jpg | Floral Midi Dress | Summer look"}
        className="mt-2 w-full rounded-2xl border border-dune px-4 py-3 font-mono text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}
