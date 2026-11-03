import Link from "next/link";
import { one } from "@/lib/db";
import { formatStamp, money, num, percent } from "@/lib/format";
import { dashboardRange } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";
import { Card, EmptyState, PageHeader, Pill, Stat, Tabs, btnGhost, btnSm, linkClass, td, th, toneFor } from "@/components/ui";
import { MoneyChart, ShareBar, TrafficChart } from "@/components/charts";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

const RANGES = [7, 14, 30] as const;

function change(current: number, previous: number) {
  if (!previous) return current ? "new this period" : "no change";
  const delta = (current - previous) / previous;
  return `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}% vs previous`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const days = RANGES.find((value) => String(value) === sp.range) ?? 14;
  const [data, link, advertiser, base] = await Promise.all([
    dashboardRange(days),
    one<{ code: string }>("SELECT code FROM tracking_links ORDER BY id LIMIT 1"),
    one<{ postback_token: string }>("SELECT postback_token FROM advertisers ORDER BY id LIMIT 1"),
    publicBase(),
  ]);
  const { totals, previous, currency } = data;
  const profit = totals.revenue - totals.payout;
  const cr = totals.clicks ? totals.conversions / totals.clicks : 0;
  const track = link ? `${base}/t/${link.code}?sub1=test` : "";
  const postback = advertiser ? `${base}/pb/${advertiser.postback_token}?click_id={click_id}&txid={txid}` : "";
  const reportQuery = new URLSearchParams({ from: data.from, to: data.to });
  const maxOffer = Math.max(...data.topOffers.map((row) => row.revenue || row.clicks), 0);
  const maxAffiliate = Math.max(...data.topAffiliates.map((row) => row.revenue || row.clicks), 0);
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Live totals for ${data.from} to ${data.to}, IST. Fraud and blocked clicks are left out of the totals.`}
        action={
          <>
            <Tabs className="" items={RANGES.map((value) => ({ href: `/dashboard?range=${value}`, label: `${value} days`, active: value === days }))} />
            <Link className={btnGhost} href={`/reports?${reportQuery}`}><Icon name="chart" size={16} />Open report</Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Clicks" value={num(totals.clicks)} hint={change(totals.clicks, previous.clicks)} icon="click" />
        <Stat label="Unique clicks (by IP)" value={num(data.uniqueClicks)} hint={`${num(data.flaggedClicks)} flagged or blocked`} icon="users" />
        <Stat label="Conversions" value={num(totals.conversions)} hint={`CR ${percent(cr)} · ${change(totals.conversions, previous.conversions)}`} icon="target" tone="success" />
        <Stat label="Revenue" value={money(totals.revenue, currency)} hint={change(totals.revenue, previous.revenue)} icon="chart" />
        <Stat label="Affiliate payouts" value={money(totals.payout, currency)} hint={`${percent(totals.revenue ? totals.payout / totals.revenue : 0)} of revenue`} icon="wallet" tone="warning" />
        <Stat label="Net profit" value={money(profit, currency)} hint={`Margin ${percent(totals.revenue ? profit / totals.revenue : 0)}`} icon="activity" tone="success" />
        <Stat label="EPC" value={money(totals.clicks ? totals.revenue / totals.clicks : 0, currency)} hint="Revenue per click" icon="zap" />
        <Stat label="Access requests" value={num(data.pending)} hint={data.pending ? "Waiting for approval" : "Nothing waiting"} icon="shield" tone={data.pending ? "warning" : "brand"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card title="Clicks and conversions" description={`Per IST day, last ${days} days`}>
          <TrafficChart points={data.series} />
        </Card>
        <Card title="Revenue and payout" description="Approved conversions only">
          <MoneyChart points={data.series} currency={currency} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Top offers" description="By revenue in this period" padded={false} action={<Link className={`${linkClass} text-[13px]`} href={`/reports?${reportQuery}&group=offer`}>All offers</Link>}>
          <Leaderboard rows={data.topOffers} max={maxOffer} currency={currency} hrefFor={(id) => `/reports/detail?${reportQuery}&offer_id=${id}`} empty="No offer traffic in this period." />
        </Card>
        <Card title="Top affiliates" description="By revenue in this period" padded={false} action={<Link className={`${linkClass} text-[13px]`} href={`/reports?${reportQuery}&group=affiliate`}>All affiliates</Link>}>
          <Leaderboard rows={data.topAffiliates} max={maxAffiliate} currency={currency} hrefFor={(id) => `/reports/detail?${reportQuery}&affiliate_id=${id}`} empty="No affiliate traffic in this period." />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Recent conversions" padded={false} action={<Link className={`${linkClass} text-[13px]`} href="/conversions">View all</Link>}>
          {data.recentConversions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Time</th><th className={th}>Offer</th><th className={th}>Affiliate</th><th className={th}>Payout</th><th className={th}>Status</th></tr></thead>
                <tbody>
                  {data.recentConversions.map((row) => (
                    <tr key={row.id}>
                      <td className={`${td} whitespace-nowrap text-muted`}>{formatStamp(row.created_at)}</td>
                      <td className={td}>{row.click_id ? <Link className="text-ink hover:text-brand" href={`/clicks/${row.click_id}`}>{row.offer_name}</Link> : row.offer_name}</td>
                      <td className={td}>{row.affiliate_name}</td>
                      <td className={`${td} tabular-nums`}>{money(row.payout, row.currency)}</td>
                      <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No conversions yet">Conversions appear here as soon as an advertiser postback arrives.</EmptyState>}
        </Card>
        <Card title="Latest clicks" padded={false} action={<Link className={`${linkClass} text-[13px]`} href="/clicks">View all</Link>}>
          {data.recentClicks.length ? (
            <ul className="divide-y divide-border">
              {data.recentClicks.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-muted"><Icon name={row.device === "mobile" ? "click" : "globe"} size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/clicks/${row.id}`} className="block truncate text-[13px] font-medium text-ink hover:text-brand">{row.offer_name}</Link>
                    <span className="block truncate text-[12px] text-faint">{row.affiliate_name} · {row.country || "??"} · {formatStamp(row.created_at)}</span>
                  </span>
                  {row.blocked_reason ? <Pill tone="bad">blocked</Pill> : row.fraud_flag ? <Pill tone="warn">flagged</Pill> : <Pill tone="ok">valid</Pill>}
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No clicks yet">Share a tracking link and clicks show up here in real time.</EmptyState>}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Test the tracking loop" description="Send a click through the first tracking link, then confirm it with the advertiser postback.">
          {track ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-muted">Tracking link</p>
                <p className="break-all rounded-sm border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-ink">{track}</p>
                <div className="mt-2"><CopyButton value={track} label="Copy tracking link" /></div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-muted">Advertiser postback</p>
                <p className="break-all rounded-sm border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] text-muted">{postback}</p>
                <p className="mt-2 text-[12px] text-faint">Open the link, then press Convert on the Clicks page, or call this URL with the click id.</p>
              </div>
            </div>
          ) : (
            <EmptyState title="No tracking link yet" action={<Link className={`${btnGhost} ${btnSm}`} href="/offers/new">Create an offer</Link>}>
              Create an advertiser, an affiliate and an offer to get a tracking link.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

function Leaderboard({ rows, max, currency, hrefFor, empty }: {
  rows: { bucketId: string; bucket: string; clicks: number; conversions: number; revenue: number; payout: number }[];
  max: number;
  currency: string;
  hrefFor: (id: string) => string;
  empty: string;
}) {
  if (!rows.length) return <EmptyState title="Nothing to rank yet">{empty}</EmptyState>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((row, index) => (
        <li key={row.bucketId} className="px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="w-5 text-[12px] font-medium tabular-nums text-faint">{index + 1}</span>
            <Link href={hrefFor(row.bucketId)} className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink hover:text-brand">{row.bucket}</Link>
            <span className="text-right text-[12px] tabular-nums text-muted">{num(row.clicks)} clicks · {num(row.conversions)} conv.</span>
            <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-ink">{money(row.revenue, currency)}</span>
          </div>
          <div className="mt-2 pl-8"><ShareBar value={row.revenue || row.clicks} max={max} /></div>
        </li>
      ))}
    </ul>
  );
}
