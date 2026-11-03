import Link from "next/link";
import { testConversion } from "@/lib/actions";
import { Banner, EmptyState, Field, PageHeader, Pager, Pill, btn, btnGhost, inputClass, td, th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatStamp } from "@/lib/format";
import { listAffiliates, listClicks, listOffers } from "@/lib/queries";
import { istToday, addDays } from "@/lib/format";

export const metadata = { title: "Clicks" };

export default async function ClicksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = sp.from || addDays(istToday(), -6);
  const to = sp.to || istToday();
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const [rows, offers, affiliates] = await Promise.all([
    listClicks({
      offerId: Number(sp.offer || 0) || undefined,
      affiliateId: Number(sp.affiliate || 0) || undefined,
      from,
      to,
      fraud: sp.fraud === "1",
      page,
    }),
    listOffers(),
    listAffiliates(),
  ]);
  const query = new URLSearchParams({ from, to, offer: sp.offer || "", affiliate: sp.affiliate || "", fraud: sp.fraud || "", page: String(page) });
  const pageLink = (target: number) => `/clicks?${new URLSearchParams({ ...Object.fromEntries(query), page: String(target) })}`;
  return (
    <div>
      <PageHeader
        title="Clicks"
        description="Every hit on a tracking link, newest first. Blocked clicks never reached the advertiser."
        action={<Link className={btnGhost} href={`/export/clicks?${query}`}><Icon name="download" size={16} />Download CSV</Link>}
      />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="surface-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_160px_auto_auto]">
        <Field label="Offer">
          <select className={inputClass} name="offer" defaultValue={sp.offer || ""}>
            <option value="">All offers</option>
            {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
          </select>
        </Field>
        <Field label="Affiliate">
          <select className={inputClass} name="affiliate" defaultValue={sp.affiliate || ""}>
            <option value="">All affiliates</option>
            {affiliates.map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
          </select>
        </Field>
        <Field label="From"><input className={inputClass} type="date" name="from" defaultValue={from} /></Field>
        <Field label="To"><input className={inputClass} type="date" name="to" defaultValue={to} /></Field>
        <label className="flex items-center gap-2 self-end pb-2.5 text-[13px] text-ink">
          <input type="checkbox" name="fraud" value="1" defaultChecked={sp.fraud === "1"} className="size-4 accent-brand" /> Fraud or blocked only
        </label>
        <div className="self-end"><button className={`${btn} w-full`}><Icon name="filter" size={15} />Apply</button></div>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Click</th><th className={th}>IP</th><th className={th}>City</th><th className={th}>Country</th><th className={th}>ISP</th><th className={th}>Offer</th><th className={th}>Affiliate</th><th className={th}>Source</th><th className={th}>p1</th><th className={th}>State</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={`${td} whitespace-nowrap`}>{formatStamp(row.created_at)}</td>
                <td className={`${td} font-mono text-[12px]`}><Link href={`/clicks/${row.id}`} className="text-brand hover:underline">{row.id}</Link></td>
                <td className={`${td} font-mono text-[12px]`}>{row.ip || "—"}</td>
                <td className={td}>{row.city || "—"}</td>
                <td className={td}>{row.country || "—"}</td>
                <td className={td}>{row.isp || "—"}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.source || row.sub1 || "—"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.p1 || "—"}</td>
                <td className={td}>{row.blocked_reason ? <Pill tone="bad">{row.blocked_reason}</Pill> : row.fraud_flag ? <Pill tone="warn">{row.fraud_reason || "fraud"}</Pill> : <Pill tone="ok">sent</Pill>}</td>
                <td className={td}>
                  {!row.blocked_reason ? (
                    <form action={testConversion}><input type="hidden" name="click_id" value={row.id} /><button className="text-[13px] font-medium text-brand hover:underline">Convert</button></form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={12}><EmptyState title="No clicks in this range" icon="click">Change the dates or filters, or open a tracking link to record a click.</EmptyState></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasNext={rows.length === 50} prevHref={pageLink(page - 1)} nextHref={pageLink(page + 1)} label={`Page ${page} · 50 per page`} />
    </div>
  );
}
