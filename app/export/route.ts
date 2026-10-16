import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addDays, istToday } from "@/lib/format";
import { report } from "@/lib/queries";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || addDays(istToday(), -6);
  const to = url.searchParams.get("to") || istToday();
  const group = url.searchParams.get("group") || "day";
  const rows = (await report(group, from, to));
  const lines = [["id", "bucket", "clicks", "conversions", "revenue", "payout", "profit"], ...rows.map((row) => [row.bucketId, row.bucket, row.clicks, row.conversions, row.revenue, row.payout, row.revenue - row.payout])];
  const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${from}-${to}.csv"`,
    },
  });
}
