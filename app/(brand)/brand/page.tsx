import { requireAdvertiser } from "@/lib/auth";
import { CopyButton } from "@/components/copy-button";
import { PageHeader, Stat, td, th } from "@/components/ui";
import { one } from "@/lib/db";
import { istRange, istToday, money, num } from "@/lib/format";
import { advertiserOffers } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Advertiser" };

export default async function BrandPage() {
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
  return (
    <div className="space-y-4">
      <PageHeader title={advertiser.name} description="Send conversions to this postback. Replace the macros with your values." />
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
