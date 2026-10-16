import { requireAdvertiser } from "@/lib/auth";
import { advertiserDecision } from "@/lib/actions";
import { CopyButton } from "@/components/copy-button";
import { Banner, PageHeader, Stat, td, th } from "@/components/ui";
import { all, one } from "@/lib/db";
import { formatStamp, istRange, istToday, money, num } from "@/lib/format";
import { advertiserOffers } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Advertiser" };

export default async function BrandPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { advertiser } = await requireAdvertiser();
  const offers = (await advertiserOffers(advertiser.id));
  const range = istRange(istToday(), istToday());
  const clicks = (await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM clicks c JOIN offers o ON o.id = c.offer_id
     WHERE o.advertiser_id = ? AND c.created_at >= ? AND c.blocked_reason = '' AND c.fraud_flag = 0`,
    advertiser.id, range.start,
  ))?.n ?? 0;
  const revenue = (await one<{ n: number; revenue: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(c.revenue), 0) AS revenue FROM conversions c JOIN offers o ON o.id = c.offer_id
     WHERE o.advertiser_id = ? AND c.status = 'approved' AND c.created_at >= ?`,
    advertiser.id, range.start,
  ));
  const postback = `${(await publicBase())}/pb/${advertiser.postback_token}?click_id={click_id}&txid={txid}&goal={goal}&payout={payout}&status={status}`;
  const pending = (await all<{ id: number; created_at: string; offer_name: string; payout: number; currency: string; goal_name: string }>(
    `SELECT c.id, c.created_at, c.payout, c.currency, c.goal_name, o.name AS offer_name
     FROM conversions c JOIN offers o ON o.id = c.offer_id
     WHERE o.advertiser_id = ? AND c.status = 'pending'
     ORDER BY c.id DESC LIMIT 50`,
    advertiser.id,
  ));
  return (
    <div className="space-y-4">
      <PageHeader title={advertiser.name} description="Send conversions to this postback. Replace the macros with your values." />
      <Banner error={sp.error} ok={sp.ok} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Clicks today" value={num(clicks)} />
        <Stat label="Approved revenue today" value={money(revenue?.revenue ?? 0)} hint={`${num(revenue?.n ?? 0)} conversions`} />
      </div>
      <section className="surface-card p-4 sm:p-5">
        <p className="break-all font-mono text-[12px]">{postback}</p>
        <div className="mt-3"><CopyButton value={postback} label="Copy postback" /></div>
      </section>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Pending</th><th className={th}>Offer</th><th className={th}>Goal</th><th className={th}>Payout</th><th className={th}></th></tr></thead>
          <tbody>
            {pending.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.goal_name || "—"}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}>
                  <span className="flex gap-2">
                    <form action={advertiserDecision}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="approved" /><button className="text-sm text-teal">Approve</button></form>
                    <form action={advertiserDecision}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="rejected" /><button className="text-sm text-coral">Reject</button></form>
                  </span>
                </td>
              </tr>
            ))}
            {!pending.length ? <tr><td className={td} colSpan={5}>No conversions are waiting.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Offer</th><th className={th}>Status</th><th className={th}>Payout</th><th className={th}>Revenue</th></tr></thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td className={td}>{offer.name}</td>
                <td className={td}>{offer.status}</td>
                <td className={td}>{money(offer.payout, offer.currency)}</td>
                <td className={td}>{money(offer.revenue, offer.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
