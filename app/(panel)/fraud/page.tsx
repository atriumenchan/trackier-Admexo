import { deleteFraudRule, saveFraudRule } from "@/lib/actions";
import { Banner, btn, btnGhost, btnSm, EmptyState, inputClass, PageHeader, Pill, td, th, toneFor } from "@/components/ui";
import { all } from "@/lib/db";
import { formatStamp } from "@/lib/format";
import { ensureFraudRules, fraudLabel, type FraudRule } from "@/lib/fraud";
import { listClicks } from "@/lib/queries";

export const metadata = { title: "Fraud" };

export default async function FraudPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  (await ensureFraudRules());
  const rules = (await all<FraudRule>("SELECT * FROM fraud_rules ORDER BY id"));
  const hits = (await listClicks({ fraud: true, page: 1 }));
  return (
    <div className="space-y-4">
      <PageHeader
        title="Fraud"
        description="Every caught click is recorded and flagged, and never counted or paid. Flag only still opens the landing page; Flag + reject sends the click away. Google's ad-review crawler is always let through as flagged so ads are not disapproved. Conversion rate is a percent and starts after 5 clicks in the window."
      />
      <Banner error={sp.error} ok={sp.ok} />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Rule</th><th className={th}>Metric</th><th className={th}>Threshold</th><th className={th}>Window</th><th className={th}>Action</th><th className={th}></th></tr></thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className={td}>{rule.name}</td>
                <td className={td}>{rule.metric}</td>
                <td className={td}>{rule.threshold}</td>
                <td className={td}>{rule.window_minutes} min</td>
                <td className={td}>
                  <form action={saveFraudRule} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="name" value={rule.name} />
                    <input type="hidden" name="metric" value={rule.metric} />
                    <input type="hidden" name="threshold" value={rule.threshold} />
                    <input type="hidden" name="window_minutes" value={rule.window_minutes} />
                    <input type="hidden" name="status" value={rule.status} />
                    <select className={`${inputClass} w-auto py-1.5`} name="action" defaultValue={rule.action} aria-label={`Action for ${rule.name}`}>
                      <option value="flag">Flag only</option>
                      <option value="reject">Flag + reject</option>
                      <option value="pause">Flag + reject + pause publisher</option>
                    </select>
                    <button className={`${btnGhost} ${btnSm}`}>Save</button>
                    {rule.status !== "active" ? <Pill tone={toneFor(rule.status)}>{rule.status}</Pill> : null}
                  </form>
                </td>
                <td className={td}><form action={deleteFraudRule}><input type="hidden" name="id" value={rule.id} /><button className="text-sm text-danger">Remove</button></form></td>
              </tr>
            ))}
            {!rules.length ? <tr><td colSpan={6}><EmptyState title="No rules yet">The first click creates the burst and bot rules.</EmptyState></td></tr> : null}
          </tbody>
        </table>
      </div>
      <form action={saveFraudRule} className="surface-card grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <input className={inputClass} name="name" placeholder="Rule name" required />
        <select className={inputClass} name="metric" defaultValue="cr">
          <option value="burst">Click burst</option>
          <option value="bot">Bot user agent</option>
          <option value="cr">Conversion rate %</option>
        </select>
        <select className={inputClass} name="action" defaultValue="reject" aria-label="Action">
          <option value="flag">Flag only</option>
          <option value="reject">Flag + reject</option>
          <option value="pause">Flag + reject + pause publisher</option>
        </select>
        <input className={inputClass} name="threshold" type="number" step="0.01" placeholder="Threshold" />
        <input className={inputClass} name="window_minutes" type="number" placeholder="Window minutes" />
        <select className={inputClass} name="status" defaultValue="active">
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <button className={btn}>Save rule</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Recent hit</th><th className={th}>Offer</th><th className={th}>Publisher</th><th className={th}>Why</th><th className={th}>Result</th></tr></thead>
          <tbody>
            {hits.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.fraud_flag ? fraudLabel(row.fraud_reason) : row.blocked_reason}</td>
                <td className={td}>{row.blocked_reason ? <Pill tone="bad">Rejected</Pill> : <Pill tone="warn">Flagged</Pill>}</td>
              </tr>
            ))}
            {!hits.length ? <tr><td colSpan={5}><EmptyState title="No flagged clicks on this page" /></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
