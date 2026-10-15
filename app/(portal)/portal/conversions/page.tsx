import { requireAffiliate } from "@/lib/auth";
import { PageHeader, Pill, td, th, toneFor } from "@/components/ui";
import { formatStamp, money } from "@/lib/format";
import { listConversions } from "@/lib/queries";

export const metadata = { title: "Conversions" };

export default async function PortalConversionsPage() {
  const { affiliate } = await requireAffiliate();
  const rows = (await listConversions({ affiliateId: affiliate.id }));
  return (
    <div>
      <PageHeader title="Conversions" description="These are the conversions credited to your account." />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Offer</th><th className={th}>Goal</th><th className={th}>Payout</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.goal_name || "—"}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={5}>No conversions yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
