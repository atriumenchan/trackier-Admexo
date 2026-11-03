import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { TRACKIER_CLICK_HEADERS, toCsv, trackierClickLine } from "@/lib/csv-export";
import { addDays, istToday } from "@/lib/format";
import { listClicks, reportFileTag, reportFilterFrom } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -129);
  const to = url.searchParams.get("to") || istToday();
  const filter = reportFilterFrom((key) => url.searchParams.get(key) || url.searchParams.get(key.replace(/_id$/, "")));
  const rows = await listClicks({ ...filter, from, to, fraud: url.searchParams.get("fraud") === "1", capped: false });
  const csv = toCsv([TRACKIER_CLICK_HEADERS, ...rows.map(trackierClickLine)]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clicks${reportFileTag(filter)}_${from}_${to}.csv"`,
    },
  });
}
