import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { TRACKIER_CONVERSION_HEADERS, toCsv, trackierConversionLine } from "@/lib/csv-export";
import { addDays, istToday } from "@/lib/format";
import { listConversions } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -129);
  const to = url.searchParams.get("to") || istToday();
  const rows = await listConversions({
    offerId: Number(url.searchParams.get("offer") || 0) || undefined,
    affiliateId: Number(url.searchParams.get("affiliate") || 0) || undefined,
    status: url.searchParams.get("status") || undefined,
    from,
    to,
    capped: false,
  });
  const csv = toCsv([TRACKIER_CONVERSION_HEADERS, ...rows.map(trackierConversionLine)]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversions_${from}_${to}.csv"`,
    },
  });
}
