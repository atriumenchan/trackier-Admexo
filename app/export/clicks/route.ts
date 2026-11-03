import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { TRACKIER_CLICK_HEADERS, toCsv, trackierClickLine } from "@/lib/csv-export";
import { addDays, istToday } from "@/lib/format";
import { detailClicks, reportFileTag, reportFilterFrom } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -129);
  const to = url.searchParams.get("to") || istToday();
  const filter = reportFilterFrom((key) => url.searchParams.get(key) || url.searchParams.get(key.replace(/_id$/, "")));
  const fraudOnly = url.searchParams.get("fraud") === "1";
  const rows = (await detailClicks(from, to, filter)).filter((row) => !fraudOnly || row.fraud_flag || row.blocked_reason);
  const csv = toCsv([TRACKIER_CLICK_HEADERS, ...rows.map(trackierClickLine)]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clicks${reportFileTag(filter)}_${from}_${to}.csv"`,
    },
  });
}
