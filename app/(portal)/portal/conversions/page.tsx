import { requireAffiliate } from "@/lib/auth";
import { EmptyState, PageHeader, Pill, td, th, toneFor } from "@/components/ui";
import { formatStamp, money } from "@/lib/format";
import { fraudLabel } from "@/lib/fraud";
import { listConversions } from "@/lib/queries";

export const metadata = { title: "Conversions" };

const PLAIN_REASONS: Record<string, string> = {
  advertiser: "Rejected by advertiser",
  reversed: "Reversed",
  "conversion-cap": "Over the conversion cap",
  "budget-cap": "Over the budget cap",
};

function reasonText(reason: string) {
  if (!reason) return "—";
  return PLAIN_REASONS[reason] || fraudLabel(reason);
}

export default async function PortalConversionsPage() {
  const { affiliate } = await requireAffiliate();
  const rows = (await listConversions({ affiliateId: affiliate.id }));
  return (
    <div>
      <PageHeader title="Conversions" description="These are the conversions credited to your account. Rejected rows show why they were not paid." />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Offer</th><th className={th}>Click</th><th className={th}>IP</th><th className={th}>Goal</th><th className={th}>Payout</th><th className={th}>Status</th><th className={th}>Why</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.click_id || "—"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.click_ip || row.ip || "—"}</td>
                <td className={td}>{row.goal_name || "Default"}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{row.status === "rejected" || row.status === "reversed" ? reasonText(row.reject_reason) : "—"}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={8}><EmptyState title="No conversions yet" /></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
