import Link from "next/link";
import { one } from "@/lib/db";
import { money, num, percent } from "@/lib/format";
import { dashboard } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";
import { Card, PageHeader, Stat } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = (await dashboard());
  const link = (await one<{ code: string }>("SELECT code FROM tracking_links ORDER BY id LIMIT 1"));
  const advertiser = (await one<{ postback_token: string }>("SELECT postback_token FROM advertisers ORDER BY id LIMIT 1"));
  const base = (await publicBase());
  const track = link ? `${base}/t/${link.code}?sub1=test` : "";
  const postback = advertiser ? `${base}/pb/${advertiser.postback_token}?click_id={click_id}&txid={txid}` : "";
  const max = Math.max(1, ...data.series.map((point) => point.clicks));
  const profit = data.today.revenue - data.today.payout;
  return (
    <div>
      <PageHeader title="Today" description="Clicks, conversions, and profit for the IST day. The demo offer is ready if you want to send a test click." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clicks" value={num(data.today.clicks)} hint={`${num(data.week.clicks)} in 7 days`} />
        <Stat label="Conversions" value={num(data.today.conversions)} hint={percent(data.today.clicks ? data.today.conversions / data.today.clicks : 0)} />
        <Stat label="Revenue" value={money(data.today.revenue, data.currency)} hint={`Payout ${money(data.today.payout, data.currency)}`} />
        <Stat label="Profit" value={money(profit, data.currency)} hint={data.pending ? `${data.pending} access requests` : "No access requests"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card title="Last 14 days">
          <div className="flex h-28 items-end gap-1">
            {data.series.map((point) => (
              <div key={point.day} className="flex-1 rounded-sm bg-teal-dim" style={{ height: `${Math.max(6, (point.clicks / max) * 100)}%` }} title={`${point.day}: ${point.clicks} clicks, ${point.conversions} conversions`} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-faint">
            <span>{data.series[0]?.day}</span>
            <span>{data.series[data.series.length - 1]?.day}</span>
          </div>
        </Card>
        <Card title="Try the loop">
          {track ? (
            <div className="space-y-3 text-sm">
              <p className="break-all font-mono text-[12px] text-ink">{track}</p>
              <CopyButton value={track} label="Copy tracking link" />
              <p className="text-muted">Open it, then come back to Clicks and press Convert. The advertiser postback is:</p>
              <p className="break-all font-mono text-[12px] text-muted">{postback}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">Create an advertiser, an affiliate, and an offer to get a tracking link.</p>
          )}
          <div className="mt-4 flex gap-2">
            <Link href="/offers/new" className="text-sm font-medium text-amber">New offer</Link>
            <Link href="/reports" className="text-sm font-medium text-teal">Reports</Link>
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Top offers, 7 days">
          {data.topOffers.length ? (
            <ul className="space-y-2 text-sm">
              {data.topOffers.map((row) => (
                <li key={row.bucketId} className="flex justify-between gap-3">
                  <span>{row.bucket}</span>
                  <span className="font-mono text-muted">{row.clicks} clicks · {money(row.revenue - row.payout, data.currency)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No traffic in the last 7 days.</p>}
        </Card>
      </div>
    </div>
  );
}
