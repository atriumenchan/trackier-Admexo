import { Card, EmptyState, Pill, td, th } from "@/components/ui";
import { fraudLabel } from "@/lib/fraud";
import { formatStamp, num } from "@/lib/format";
import type { badTraffic } from "@/lib/queries";

type Data = Awaited<ReturnType<typeof badTraffic>>;

export function BadTrafficCard({ data, showPublisher = false, days }: { data: Data; showPublisher?: boolean; days: number }) {
  const flaggedOnly = data.total - data.rejected;
  return (
    <Card
      title={`Flagged traffic · last ${days} days`}
      description="Our checks recorded these clicks and marked them as bot or bad traffic. They are not counted in your numbers and nothing is paid on them."
      padded={false}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border px-4 py-3 text-[13px] text-muted sm:px-5">
        <span><span className="font-semibold text-ink tabular-nums">{num(data.total)}</span> flagged</span>
        <span><span className="font-semibold text-danger tabular-nums">{num(data.rejected)}</span> rejected (sent away)</span>
        <span><span className="font-semibold text-warning tabular-nums">{num(flaggedOnly)}</span> flagged only (landing page opened, not counted)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Time</th><th className={th}>Offer</th>
              {showPublisher ? <th className={th}>Publisher</th> : null}
              <th className={th}>Click</th><th className={th}>IP</th><th className={th}>Country</th><th className={th}>Device</th>
              <th className={th}>Why</th><th className={th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td className={`${td} whitespace-nowrap`}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                {showPublisher ? <td className={td}>{row.affiliate_name}</td> : null}
                <td className={`${td} font-mono text-[12px]`}>{row.id}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.ip || "—"}</td>
                <td className={td}>{row.country || "—"}</td>
                <td className={td}>{row.device || "—"}</td>
                <td className={td}>{fraudLabel(row.fraud_reason)}</td>
                <td className={td}>{row.blocked_reason ? <Pill tone="bad">Rejected</Pill> : <Pill tone="warn">Flagged</Pill>}</td>
              </tr>
            ))}
            {!data.rows.length ? (
              <tr><td colSpan={showPublisher ? 9 : 8}><EmptyState title="No flagged traffic" icon="shield">Nothing was caught by the bot or bad-traffic checks in this period.</EmptyState></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {data.total > data.rows.length ? <p className="border-t border-border px-4 py-2.5 text-[12px] text-faint sm:px-5">Showing the latest {data.rows.length} of {num(data.total)}.</p> : null}
    </Card>
  );
}
