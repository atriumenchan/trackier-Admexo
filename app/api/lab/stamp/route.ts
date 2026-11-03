import { requireAdmin } from "@/lib/auth";
import { run } from "@/lib/db";

export const dynamic = "force-dynamic";

type Item = { click_id?: string; created_at?: string };

function validStamp(value: string) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json().catch(() => null)) as { items?: Item[]; click_id?: string; created_at?: string } | null;
  const items = Array.isArray(body?.items) ? body.items : body ? [body] : [];
  let updated = 0;
  for (const item of items) {
    const id = String(item.click_id || "").trim();
    const at = String(item.created_at || "").trim();
    if (!id || !validStamp(at)) continue;
    (await run("UPDATE clicks SET created_at = ? WHERE id = ?", at, id));
    (await run("UPDATE conversions SET created_at = ? WHERE click_id = ?", at, id));
    updated += 1;
  }
  return Response.json({ ok: true, updated });
}
