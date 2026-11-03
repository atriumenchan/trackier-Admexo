import Link from "next/link";
import { setting } from "@/lib/db";
import { addDays, formatStamp, istToday, money, num, percent } from "@/lib/format";
import {
  REPORT_GROUPS,
  detailClicks,
  detailConversions,
  detailSummary,
  getAdvertiser,
  getAffiliate,
  getOffer,
  reportFilterFrom,
  reportFilterQuery,
  type ReportFilter,
} from "@/lib/queries";
import { PageHeader, Pill, Stat, btnGhost, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Report detail" };

const PAGE_SIZE = 50;

async function titleParts(filter: ReportFilter, from: string, to: string) {
  const [offer, affiliate, advertiser] = await Promise.all([
    filter.offerId ? getOffer(filter.offerId) : undefined,
    filter.affiliateId ? getAffiliate(filter.affiliateId) : undefined,
    filter.advertiserId ? getAdvertiser(filter.advertiserId) : undefined,
  ]);
  const parts = [
    offer ? `Offer: ${offer.name}` : "",
    affiliate ? `Affiliate: ${affiliate.name}` : "",
    advertiser ? `Advertiser: ${advertiser.name}` : "",
    filter.country ? `Country: ${filter.country}` : "",
    filter.device ? `Device: ${filter.device}` : "",
    filter.os ? `OS: ${filter.os}` : "",
    filter.source ? `Source: ${filter.source}` : "",
    filter.goal ? `Goal: ${filter.goal}` : "",
    filter.hour ? `Hour: ${filter.hour}` : from === to ? `Day: ${from}` : `${from} to ${to}`,
  ].filter(Boolean);
  return parts;
}

export default async function ReportDetailPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = istToday();
  const from = sp.from || addDays(today, -6);
  const to = sp.to || today;
  const tab = sp.tab === "conversions" ? "conversions" : "clicks";
  const status = ["approved", "pending", "rejected", "reversed"].includes(sp.status || "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const filter = reportFilterFrom((key) => sp[key]);
  const scope = reportFilterQuery(filter);
  const base = { from, to, ...scope };
  const [summary, currency, parts, clicks, conversions] = await Promise.all([
    detailSummary(from, to, filter),
    setting("currency", "USD"),
    titleParts(filter, from, to),
    tab === "clicks" ? detailClicks(from, to, filter, page) : Promise.resolve([]),
    tab === "conversions" ? detailConversions(from, to, filter, page, status) : Promise.resolve([]),
  ]);
  const byStatus = (name: string) => summary.conversions.find((row) => row.status === name) || { n: 0, revenue: 0, payout: 0 };
  const approved = byStatus("approved");
  const totalConversions = summary.conversions.reduce((sum, row) => sum + row.n, 0);
  const rowsInTab = tab === "clicks" ? summary.clicks : status ? byStatus(status).n : totalConversions;
  const pages = Math.max(1, Math.ceil(rowsInTab / PAGE_SIZE));
  const link = (extra: Record<string, string | undefined>) => {
    const query = new URLSearchParams(base);
    for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
    return `/reports/detail?${query}`;
  };
  const csvQuery = new URLSearchParams({ ...base, ...(status && tab === "conversions" ? { status } : {}) });
  const reportBase = new URLSearchParams(base);
  return (
    <div>
      <PageHeader
        title={parts[0] || "Report detail"}
        description={parts.slice(1).join(" · ") || undefined}
        action={
          <span className="flex flex-wrap gap-2">
            <Link className={btnGhost} href={`/reports?${new URLSearchParams({ ...base, group: "day" })}`}>Back to report</Link>
            <Link className={btnGhost} href={tab === "clicks" ? `/export/clicks?${csvQuery}` : `/export?${csvQuery}`}>Download this CSV</Link>
          </span>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Valid clicks" value={num(summary.validClicks)} hint={`${num(summary.clicks)} total`} />
        <Stat label="Flagged / blocked" value={`${num(summary.flaggedClicks)} / ${num(summary.blockedClicks)}`} hint="fraud rules" />
        <Stat label="Approved conv." value={num(approved.n)} hint={`CR ${percent(summary.validClicks ? approved.n / summary.validClicks : 0)}`} />
        <Stat label="Pending / rejected" value={`${num(byStatus("pending").n)} / ${num(byStatus("rejected").n + byStatus("reversed").n)}`} hint="not payable" />
        <Stat label="Revenue" value={money(approved.revenue, currency)} hint={`EPC ${money(summary.validClicks ? approved.revenue / summary.validClicks : 0, currency)}`} />
        <Stat label="Payout / profit" value={money(approved.payout, currency)} hint={`profit ${money(approved.revenue - approved.payout, currency)}`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>Break down by:</span>
        {REPORT_GROUPS.map(([value, label]) => {
          reportBase.set("group", value);
          return <Link key={value} href={`/reports?${reportBase}`}>{label.replace(/^By /, "")}</Link>;
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link href={link({ tab: "clicks" })} className={tab === "clicks" ? "rounded-sm bg-surface px-3 py-1.5 font-medium shadow-sm" : "px-3 py-1.5 text-muted"}>
          Clicks ({num(summary.clicks)})
        </Link>
        <Link href={link({ tab: "conversions" })} className={tab === "conversions" && !status ? "rounded-sm bg-surface px-3 py-1.5 font-medium shadow-sm" : "px-3 py-1.5 text-muted"}>
          Conversions ({num(totalConversions)})
        </Link>
        {["approved", "pending", "rejected", "reversed"].map((name) => byStatus(name).n ? (
          <Link key={name} href={link({ tab: "conversions", status: name })} className={status === name ? "rounded-sm bg-surface px-3 py-1.5 font-medium shadow-sm" : "px-3 py-1.5 text-muted"}>
            {name} ({num(byStatus(name).n)})
          </Link>
        ) : null)}
      </div>

      {tab === "clicks" ? <ClickTable rows={clicks} /> : <ConversionTable rows={conversions} />}

      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 ? <Link href={link({ tab, status, page: String(page - 1) })}>Previous</Link> : null}
        {page < pages ? <Link href={link({ tab, status, page: String(page + 1) })}>Next</Link> : null}
        <span className="text-muted">Page {page} of {pages} · {num(rowsInTab)} rows</span>
      </div>
    </div>
  );
}

type ClickRow = Awaited<ReturnType<typeof detailClicks>>[number];
type ConversionRow = Awaited<ReturnType<typeof detailConversions>>[number];

function ClickTable({ rows }: { rows: ClickRow[] }) {
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <th className={th}>Time</th><th className={th}>Click ID</th><th className={th}>Offer</th><th className={th}>Affiliate</th>
          <th className={th}>IP</th><th className={th}>Country</th><th className={th}>City</th><th className={th}>ISP</th>
          <th className={th}>Device</th><th className={th}>OS</th><th className={th}>Source</th><th className={th}>Sub2</th>
          <th className={th}>GCLID</th><th className={th}>State</th><th className={th}>Converted</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={`${td} whitespace-nowrap`}>{formatStamp(row.created_at)}</td>
              <td className={`${td} font-mono text-[12px]`}><Link href={`/clicks/${row.id}`} className="text-amber">{row.id}</Link></td>
              <td className={td}>{row.offer_name}</td>
              <td className={td}>{row.affiliate_name}</td>
              <td className={`${td} font-mono text-[12px]`}>{row.ip || "—"}</td>
              <td className={td}>{row.country || "—"}</td>
              <td className={td}>{row.city || "—"}</td>
              <td className={td}>{row.isp || "—"}</td>
              <td className={td}>{row.device || "—"}</td>
              <td className={td}>{row.os || "—"}</td>
              <td className={td}>{row.source || row.sub1 || "—"}</td>
              <td className={td}>{row.sub2 || "—"}</td>
              <td className={`${td} max-w-[140px] truncate font-mono text-[12px]`}>{row.gclid || "—"}</td>
              <td className={td}>{row.blocked_reason ? <Pill tone="bad">{row.blocked_reason}</Pill> : row.fraud_flag ? <Pill tone="warn">{row.fraud_reason || "flagged"}</Pill> : <Pill tone="ok">valid</Pill>}</td>
              <td className={td}>{row.converted ? <Pill tone="ok">yes</Pill> : "—"}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td className={td} colSpan={15}>No clicks for this selection.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function ConversionTable({ rows }: { rows: ConversionRow[] }) {
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <th className={th}>Time</th><th className={th}>Conv. ID</th><th className={th}>Click ID</th><th className={th}>Offer</th>
          <th className={th}>Affiliate</th><th className={th}>Goal</th><th className={th}>Status</th><th className={th}>Revenue</th>
          <th className={th}>Payout</th><th className={th}>Txid</th><th className={th}>Country</th><th className={th}>Click IP</th>
          <th className={th}>Elapsed</th><th className={th}>Postback</th><th className={th}>Note</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={`${td} whitespace-nowrap`}>{formatStamp(row.created_at)}</td>
              <td className={`${td} font-mono text-[12px]`}>{row.id}</td>
              <td className={`${td} font-mono text-[12px]`}>{row.click_id ? <Link href={`/clicks/${row.click_id}`} className="text-amber">{row.click_id}</Link> : "—"}</td>
              <td className={td}>{row.offer_name}</td>
              <td className={td}>{row.affiliate_name}</td>
              <td className={td}>{row.goal_name || "Default"}</td>
              <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
              <td className={td}>{money(row.revenue, row.currency)}</td>
              <td className={td}>{money(row.payout, row.currency)}</td>
              <td className={`${td} font-mono text-[12px]`}>{row.txid || "—"}</td>
              <td className={td}>{row.country || "—"}</td>
              <td className={`${td} font-mono text-[12px]`}>{row.click_ip || row.ip || "—"}</td>
              <td className={td}>{row.elapsed_time ? `${row.elapsed_time}s` : "—"}</td>
              <td className={td}><Pill tone={toneFor(row.postback_status)}>{row.postback_status}</Pill></td>
              <td className={td}>{row.note || row.reject_reason || "—"}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td className={td} colSpan={15}>No conversions for this selection.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
