import { requireAdmin } from "@/lib/auth";
import { backfillClickGeo } from "@/lib/geo-backfill";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireAdmin();
  return Response.json({ ok: true, ...(await backfillClickGeo(8)) });
}
