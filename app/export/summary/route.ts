import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv-export";
import { addDays, istToday } from "@/lib/format";
import { report, reportFileTag, reportFilterFrom } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -129);
  const to = url.searchParams.get("to") || istToday();
  const group = url.searchParams.get("group") || "day";
  const filter = reportFilterFrom((key) => url.searchParams.get(key));
  const rows = await report(group, from, to, undefined, filter);
  const total = rows.reduce(
    (sum, row) => ({ clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions, revenue: sum.revenue + row.revenue, payout: sum.payout + row.payout }),
    { clicks: 0, conversions: 0, revenue: 0, payout: 0 },
  );
  const line = (id: string, bucket: string, row: { clicks: number; conversions: number; revenue: number; payout: number }) => [
    id,
    bucket,
    row.clicks,
    row.conversions,
    row.clicks ? Math.round((row.conversions / row.clicks) * 10000) / 100 : 0,
    row.clicks ? Math.round((row.revenue / row.clicks) * 10000) / 10000 : 0,
    Math.round(row.revenue * 100) / 100,
    Math.round(row.payout * 100) / 100,
    Math.round((row.revenue - row.payout) * 100) / 100,
  ];
  const csv = toCsv([
    ["id", group, "clicks", "conversions", "cr_percent", "epc", "revenue", "payout", "profit"],
    ...rows.map((row) => line(row.bucketId, row.bucket, row)),
    line("", "Total", total),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${group}${reportFileTag(filter)}_${from}_${to}.csv"`,
    },
  });
}
