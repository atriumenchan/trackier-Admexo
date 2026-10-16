import Link from "next/link";
import { testConversion } from "@/lib/actions";
import { Banner, PageHeader, Pill, inputClass, td, th } from "@/components/ui";
import { formatStamp } from "@/lib/format";
import { listAffiliates, listClicks, listOffers } from "@/lib/queries";
import { istToday, addDays } from "@/lib/format";

export const metadata = { title: "Clicks" };

export default async function ClicksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = sp.from || addDays(istToday(), -1);
  const to = sp.to || istToday();
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const rows = (await listClicks({
    offerId: Number(sp.offer || 0) || undefined,
    affiliateId: Number(sp.affiliate || 0) || undefined,
    from,
    to,
    fraud: sp.fraud === "1",
    page,
  }));
  const query = new URLSearchParams({ from, to, offer: sp.offer || "", affiliate: sp.affiliate || "", fraud: sp.fraud || "", page: String(page) });
  return (
    <div>
      <PageHeader title="Clicks" description="Every hit on a tracking link. Blocked clicks never reached the advertiser." />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 grid gap-2 sm:grid-cols-5">
        <select className={inputClass} name="offer" defaultValue={sp.offer || ""}>
          <option value="">All offers</option>
          {(await listOffers()).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
        </select>
        <select className={inputClass} name="affiliate" defaultValue={sp.affiliate || ""}>
          <option value="">All affiliates</option>
          {(await listAffiliates()).map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
        </select>
        <input className={inputClass} type="date" name="from" defaultValue={from} />
        <input className={inputClass} type="date" name="to" defaultValue={to} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fraud" value="1" defaultChecked={sp.fraud === "1"} /> Fraud or blocked</label>
        <button className="rounded-sm border border-border bg-surface px-3 py-2 text-sm">Filter</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Click</th><th className={th}>Offer</th><th className={th}>Affiliate</th><th className={th}>Where</th><th className={th}>State</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.id}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{[row.country || "—", row.device, row.sub1].filter(Boolean).join(" · ")}</td>
                <td className={td}>{row.blocked_reason ? <Pill tone="bad">{row.blocked_reason}</Pill> : row.fraud_flag ? <Pill tone="warn">{row.fraud_reason || "fraud"}</Pill> : <Pill tone="ok">sent</Pill>}</td>
                <td className={td}>
                  {!row.blocked_reason ? (
                    <form action={testConversion}><input type="hidden" name="click_id" value={row.id} /><button className="text-sm font-medium text-amber">Convert</button></form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={7}>No clicks in this range.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 ? <Link href={`/clicks?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) })}`}>Previous</Link> : null}
        {rows.length === 50 ? <Link href={`/clicks?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) })}`}>Next</Link> : null}
        <span className="text-muted">Page {page}</span>
      </div>
    </div>
  );
}
