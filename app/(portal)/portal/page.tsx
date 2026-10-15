import { requireAffiliate } from "@/lib/auth";
import { money, num, percent } from "@/lib/format";
import { PageHeader, Stat } from "@/components/ui";
import { one } from "@/lib/db";
import { istRange, istToday } from "@/lib/format";

export const metadata = { title: "Portal" };

export default async function PortalPage() {
  const { affiliate } = await requireAffiliate();
  const range = istRange(istToday(), istToday());
  const clicks = (await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM clicks WHERE affiliate_id = ? AND created_at >= ? AND blocked_reason = '' AND fraud_flag = 0",
    affiliate.id, range.start,
  ))?.n ?? 0;
  const moneyRow = (await one<{ n: number; payout: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(payout), 0) AS payout FROM conversions WHERE affiliate_id = ? AND status = 'approved' AND created_at >= ?",
    affiliate.id, range.start,
  ));
  const unpaid = (await one<{ payout: number }>(
    "SELECT COALESCE(SUM(payout), 0) AS payout FROM conversions WHERE affiliate_id = ? AND status = 'approved' AND payout_id IS NULL",
    affiliate.id,
  ))?.payout ?? 0;
  return (
    <div>
      <PageHeader title={`Hello, ${affiliate.name}`} description={affiliate.status === "active" ? "Today's numbers, in IST." : "Your account is waiting for approval."} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Clicks today" value={num(clicks)} />
        <Stat label="Conversions today" value={num(moneyRow?.n ?? 0)} hint={percent(clicks ? (moneyRow?.n ?? 0) / clicks : 0)} />
        <Stat label="Unpaid" value={money(unpaid)} hint={`Earned today ${money(moneyRow?.payout ?? 0)}`} />
      </div>
    </div>
  );
}
