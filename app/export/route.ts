import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { TRACKIER_CONVERSION_HEADERS, toCsv, trackierConversionLine } from "@/lib/csv-export";
import { addDays, istToday } from "@/lib/format";
import { listConversions, reportFileTag, reportFilterFrom } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -129);
  const to = url.searchParams.get("to") || istToday();
  const filter = reportFilterFrom((key) => url.searchParams.get(key));
  const rows = await listConversions({ from, to, ...filter, capped: false });
  const csv = toCsv([TRACKIER_CONVERSION_HEADERS, ...rows.map(trackierConversionLine)]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversions${reportFileTag(filter)}_${from}_${to}.csv"`,
    },
  });
}
