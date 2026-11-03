import { requireAdmin } from "@/lib/auth";
import { applyColumnAlters } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireAdmin();
  const rows = await applyColumnAlters();
  const failed = rows.filter((row) => !row.ok && !/duplicate column|already exists/i.test(row.error || ""));
  return Response.json({ ok: failed.length === 0, failed, ran: rows.length });
}
