import { requireAffiliate } from "@/lib/auth";
import { formatStamp, istRange, istToday, money, num, percent } from "@/lib/format";
import { PageHeader, Stat, td, th } from "@/components/ui";
import { all, one } from "@/lib/db";
import { affiliateBalance, ledgerForAffiliate } from "@/lib/ledger";
import type { Payout } from "@/lib/types";

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
  const unpaid = await affiliateBalance(affiliate.id);
  const ledger = await ledgerForAffiliate(affiliate.id);
  const payouts = (await all<Payout>(
    "SELECT * FROM payouts WHERE affiliate_id = ? ORDER BY id DESC LIMIT 20",
    affiliate.id,
  ));
  return (
    <div className="space-y-4">
      <PageHeader title={`Hello, ${affiliate.name}`} description={affiliate.status === "active" ? "Today's numbers, in IST." : "Your account is waiting for approval."} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Clicks today" value={num(clicks)} />
        <Stat label="Conversions today" value={num(moneyRow?.n ?? 0)} hint={percent(clicks ? (moneyRow?.n ?? 0) / clicks : 0)} />
        <Stat label="Balance" value={money(unpaid)} hint={`Earned today ${money(moneyRow?.payout ?? 0)}`} />
      </div>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Ledger</th><th className={th}>Kind</th><th className={th}>Amount</th><th className={th}>Note</th></tr></thead>
          <tbody>
            {ledger.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.kind}</td>
                <td className={td}>{money(row.amount, row.currency)}</td>
                <td className={td}>{row.note}</td>
              </tr>
            ))}
            {!ledger.length ? <tr><td className={td} colSpan={4}>No balance lines yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Statement</th><th className={th}>Period</th><th className={th}>Amount</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.period_start} to {row.period_end}</td>
                <td className={td}>{money(row.amount, row.currency)}</td>
                <td className={td}>{row.status}</td>
              </tr>
            ))}
            {!payouts.length ? <tr><td className={td} colSpan={4}>No statements yet. Unpaid is the balance still waiting for one.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
