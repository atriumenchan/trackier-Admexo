import Link from "next/link";
import {
  REPORT_GROUPS,
  drillQuery,
  listAdvertisers,
  listAffiliates,
  listOffers,
  report,
  reportCountries,
  reportFilterFrom,
  reportFilterQuery,
  type ReportRow,
} from "@/lib/queries";
import { setting } from "@/lib/db";
import { addDays, istToday, money, num, percent } from "@/lib/format";
import { Banner, PageHeader, inputClass, td, th } from "@/components/ui";

export const metadata = { title: "Reports" };

const PAGE_SIZE = 50;

function presets(today: string) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastMonthEnd = addDays(monthStart, -1);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
  return [
    ["Today", today, today],
    ["Yesterday", addDays(today, -1), addDays(today, -1)],
    ["Last 7 days", addDays(today, -6), today],
    ["Last 30 days", addDays(today, -29), today],
    ["This month", monthStart, today],
    ["Last month", lastMonthStart, lastMonthEnd],
  ] as const;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = istToday();
  const from = sp.from || addDays(today, -129);
  const to = sp.to || today;
  const group = REPORT_GROUPS.some(([value]) => value === sp.group) ? (sp.group as string) : "day";
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const filter = reportFilterFrom((key) => sp[key]);
  const [allRows, currency, offers, affiliates, advertisers, countries] = await Promise.all([
    report(group, from, to, undefined, filter),
    setting("currency", "USD"),
    listOffers(),
    listAffiliates(),
    listAdvertisers(),
    reportCountries(),
  ]);
  const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allRows.reduce(
    (sum, row) => ({ clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions, revenue: sum.revenue + row.revenue, payout: sum.payout + row.payout }),
    { clicks: 0, conversions: 0, revenue: 0, payout: 0 },
  );
  const scope = reportFilterQuery(filter);
  const query = new URLSearchParams({ from, to, group, ...scope });
  const pageLink = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/reports?${next}`;
  };
  const rangeLink = (start: string, end: string) => `/reports?${new URLSearchParams({ group, ...scope, from: start, to: end })}`;
  const groupLabel = REPORT_GROUPS.find(([value]) => value === group)?.[1].replace(/^By /, "") || group;
  const filtered = Object.keys(scope).length > 0;
  const extraTags = (["device", "os", "source", "hour", "goal"] as const).filter((key) => filter[key]).map((key) => [key, filter[key] as string] as const);
  const pages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Grouped in IST. Fraud and blocked clicks are left out. Only approved conversions count. Every CSV uses the filters and dates below."
        action={
          <span className="flex flex-wrap gap-2">
            <Link className="rounded-sm border border-border bg-surface px-3 py-2 text-sm" href={`/export/summary?${query}`}>Report CSV</Link>
            <Link className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-muted" href={`/export?${query}`}>Conversions CSV</Link>
            <Link className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-muted" href={`/export/clicks?${query}`}>Clicks CSV</Link>
          </span>
        }
      />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {extraTags.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <select className={inputClass} name="offer_id" defaultValue={filter.offerId ? String(filter.offerId) : ""} aria-label="Offer">
          <option value="">All offers</option>
          {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
        </select>
        <select className={inputClass} name="affiliate_id" defaultValue={filter.affiliateId ? String(filter.affiliateId) : ""} aria-label="Affiliate">
          <option value="">All affiliates</option>
          {affiliates.map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
        </select>
        <select className={inputClass} name="advertiser_id" defaultValue={filter.advertiserId ? String(filter.advertiserId) : ""} aria-label="Advertiser">
          <option value="">All advertisers</option>
          {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
        </select>
        <select className={inputClass} name="country" defaultValue={filter.country || ""} aria-label="Country">
          <option value="">All countries</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
        <select className={inputClass} name="group" defaultValue={group} aria-label="Group by">
          {REPORT_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className={inputClass} type="date" name="from" defaultValue={from} aria-label="From" />
        <input className={inputClass} type="date" name="to" defaultValue={to} aria-label="To" />
        <span className="flex gap-2">
          <button className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">Run report</button>
          {filtered ? <Link className="rounded-sm px-3 py-2 text-sm text-muted" href={`/reports?${new URLSearchParams({ from, to, group })}`}>Clear</Link> : null}
        </span>
      </form>
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted">
        {presets(today).map(([label, start, end]) => (
          <Link key={label} href={rangeLink(start, end)} className={start === from && end === to ? "font-medium underline" : ""}>{label}</Link>
        ))}
      </div>
      {extraTags.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Also filtered by:</span>
          {extraTags.map(([key, value]) => {
            const next = new URLSearchParams(query);
            next.delete(key);
            return <Link key={key} href={`/reports?${next}`} className="rounded-full bg-surface px-2.5 py-0.5">{key}: {value} ×</Link>;
          })}
        </div>
      ) : null}
      <ReportTable
        rows={rows}
        total={total}
        currency={currency}
        label={groupLabel}
        showTotal={allRows.length > 0}
        hideClicks={group === "goal"}
        hrefFor={(row) => `/reports/detail?${new URLSearchParams({ ...scope, from, to, ...drillQuery(group, row, from, to) })}`}
        totalHref={`/reports/detail?${new URLSearchParams({ ...scope, from, to })}`}
      />
      <p className="mt-2 text-[12px] text-faint">Click any row to see every click and conversion behind it.</p>
      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 ? <Link href={pageLink(page - 1)}>Previous</Link> : null}
        {page < pages ? <Link href={pageLink(page + 1)}>Next</Link> : null}
        <span className="text-muted">Page {page} of {pages} · {num(allRows.length)} rows</span>
      </div>
    </div>
  );
}

type Totals = { clicks: number; conversions: number; revenue: number; payout: number };

function ReportTable({ rows, total, currency, label, showTotal, hideClicks, hrefFor, totalHref }: {
  rows: ReportRow[];
  total: Totals;
  currency: string;
  label: string;
  showTotal: boolean;
  hideClicks: boolean;
  hrefFor: (row: ReportRow) => string;
  totalHref: string;
}) {
  const cells = (row: Totals) => (
    <>
      <td className={td}>{hideClicks ? "—" : num(row.clicks)}</td>
      <td className={td}>{num(row.conversions)}</td>
      <td className={td}>{hideClicks ? "—" : percent(row.clicks ? row.conversions / row.clicks : 0)}</td>
      <td className={td}>{hideClicks ? "—" : money(row.clicks ? row.revenue / row.clicks : 0, currency)}</td>
      <td className={td}>{money(row.revenue, currency)}</td>
      <td className={td}>{money(row.payout, currency)}</td>
      <td className={td}>{money(row.revenue - row.payout, currency)}</td>
    </>
  );
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>{label}</th><th className={th}>Clicks</th><th className={th}>Conversions</th><th className={th}>CR</th>
            <th className={th}>EPC</th><th className={th}>Revenue</th><th className={th}>Payout</th><th className={th}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bucketId} className="hover:bg-surface-2">
              <td className={td}><Link href={hrefFor(row)} className="font-medium text-amber">{row.bucket}</Link></td>
              {cells(row)}
            </tr>
          ))}
          {showTotal ? (
            <tr className="font-medium">
              <td className={td}><Link href={totalHref} className="text-amber">Total</Link></td>
              {cells(total)}
            </tr>
          ) : null}
          {!rows.length ? <tr><td className={td} colSpan={8}>No traffic for these filters.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
