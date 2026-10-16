import { deleteFraudRule, saveFraudRule } from "@/lib/actions";
import { Banner, PageHeader, Pill, btn, inputClass, td, th, toneFor } from "@/components/ui";
import { all } from "@/lib/db";
import { formatStamp } from "@/lib/format";
import { ensureFraudRules, type FraudRule } from "@/lib/fraud";
import { listClicks } from "@/lib/queries";

export const metadata = { title: "Fraud" };

export default async function FraudPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  (await ensureFraudRules());
  const rules = (await all<FraudRule>("SELECT * FROM fraud_rules ORDER BY id"));
  const hits = (await listClicks({ fraud: true, page: 1 }));
  return (
    <div className="space-y-4">
      <PageHeader title="Fraud" description="A rule flags the click, rejects it, or pauses the publisher. Conversion rate is a percent and starts after 5 clicks in the window." />
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
                <td className={td}><Pill tone={toneFor(rule.status)}>{rule.action}</Pill></td>
                <td className={td}><form action={deleteFraudRule}><input type="hidden" name="id" value={rule.id} /><button className="text-sm text-coral">Remove</button></form></td>
              </tr>
            ))}
            {!rules.length ? <tr><td className={td} colSpan={6}>No rules yet. The first click creates the burst and bot rules.</td></tr> : null}
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
        <select className={inputClass} name="action" defaultValue="flag">
          <option value="flag">Flag</option>
          <option value="reject">Reject</option>
          <option value="pause">Pause publisher</option>
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
          <thead><tr><th className={th}>Recent hit</th><th className={th}>Offer</th><th className={th}>Publisher</th><th className={th}>Reason</th></tr></thead>
          <tbody>
            {hits.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.fraud_reason || row.blocked_reason || "flagged"}</td>
              </tr>
            ))}
            {!hits.length ? <tr><td className={td} colSpan={4}>No flagged clicks on this page.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
