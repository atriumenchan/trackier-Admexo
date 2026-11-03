import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStamp, money } from "@/lib/format";
import { getClickDetail } from "@/lib/queries";
import { Card, PageHeader, Pill, btnGhost, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Click" };

export default async function ClickDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getClickDetail(decodeURIComponent(id));
  if (!detail) notFound();
  const { click, conversions, postbacks } = detail;
  const day = click.created_at.slice(0, 10);
  const state = click.blocked_reason
    ? <Pill tone="bad">blocked: {click.blocked_reason}</Pill>
    : click.fraud_flag
      ? <Pill tone="warn">flagged: {click.fraud_reason || "fraud"}</Pill>
      : <Pill tone="ok">valid</Pill>;
  const fields: Array<[string, string | number | null | undefined]> = [
    ["Time", formatStamp(click.created_at)],
    ["Offer", click.offer_name],
    ["Affiliate", click.affiliate_name],
    ["IP", click.ip],
    ["Country", click.country],
    ["City", click.city],
    ["ISP", click.isp],
    ["Device", click.device],
    ["OS", click.os],
    ["Referrer", click.referrer],
    ["Source", click.source],
    ["p1", click.p1],
    ["GCLID", click.gclid],
    ["Creative", click.creative],
    ["ValueTrack device", click.vt_device],
    ["ValueTrack campaign", click.vt_campaign],
    ...Array.from({ length: 10 }, (_, index) => [`Sub${index + 1}`, click[`sub${index + 1}` as keyof typeof click] as string] as [string, string]),
    ["Sent to", click.destination],
    ["User agent", click.user_agent],
  ];
  return (
    <div>
      <PageHeader
        title={`Click ${click.id}`}
        description={`${click.offer_name} · ${click.affiliate_name}`}
        action={
          <span className="flex gap-2">
            <Link className={btnGhost} href={`/reports/detail?${new URLSearchParams({ from: day, to: day, offer_id: String(click.offer_id) })}`}>Same offer that day</Link>
            <Link className={btnGhost} href={`/reports/detail?${new URLSearchParams({ from: day, to: day, affiliate_id: String(click.affiliate_id) })}`}>Same affiliate that day</Link>
          </span>
        }
      />
      <div className="grid gap-4">
        <Card title="Click" action={state}>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {fields.filter(([, value]) => value !== "" && value != null).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-[0.04em] text-faint">{label}</dt>
                <dd className="break-all text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title={`Conversions (${conversions.length})`}>
          {conversions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Time</th><th className={th}>ID</th><th className={th}>Goal</th><th className={th}>Status</th><th className={th}>Revenue</th><th className={th}>Payout</th><th className={th}>Txid</th><th className={th}>Elapsed</th><th className={th}>Postback</th><th className={th}>Note</th></tr></thead>
                <tbody>
                  {conversions.map((row) => (
                    <tr key={row.id}>
                      <td className={td}>{formatStamp(row.created_at)}</td>
                      <td className={`${td} font-mono text-[12px]`}>{row.id}</td>
                      <td className={td}>{row.goal_name || "Default"}</td>
                      <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                      <td className={td}>{money(row.revenue, row.currency)}</td>
                      <td className={td}>{money(row.payout, row.currency)}</td>
                      <td className={`${td} font-mono text-[12px]`}>{row.txid || "—"}</td>
                      <td className={td}>{row.elapsed_time ? `${row.elapsed_time}s` : "—"}</td>
                      <td className={td}><Pill tone={toneFor(row.postback_status)}>{row.postback_status}</Pill></td>
                      <td className={td}>{row.note || row.reject_reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted">This click has not converted.</p>}
        </Card>
        <Card title={`Postbacks (${postbacks.length})`}>
          {postbacks.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Time</th><th className={th}>Direction</th><th className={th}>Status</th><th className={th}>URL</th></tr></thead>
                <tbody>
                  {postbacks.map((row) => (
                    <tr key={row.id}>
                      <td className={td}>{formatStamp(row.created_at)}</td>
                      <td className={td}>{row.direction}</td>
                      <td className={td}><Pill tone={row.ok ? "ok" : "bad"}>{row.status_code ?? "—"}</Pill></td>
                      <td className={`${td} max-w-[520px] break-all font-mono text-[12px]`}>{row.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted">No postbacks logged for this click.</p>}
        </Card>
      </div>
    </div>
  );
}
