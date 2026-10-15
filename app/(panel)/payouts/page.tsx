import Link from "next/link";
import { createPayout } from "@/lib/actions";
import { Banner, PageHeader, Pill, btn, inputClass, td, th, toneFor } from "@/components/ui";
import { addDays, formatStamp, istToday, money } from "@/lib/format";
import { listAffiliates, listPayouts } from "@/lib/queries";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listPayouts());
  return (
    <div className="space-y-4">
      <PageHeader title="Payouts" description="Bundle approved, unpaid conversions for an affiliate into a statement. Dates use the IST day." />
      <Banner error={sp.error} ok={sp.ok} />
      <form action={createPayout} className="surface-card grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <select className={inputClass} name="affiliate_id" required>
          <option value="">Affiliate</option>
          {(await listAffiliates()).map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
        </select>
        <input className={inputClass} name="notes" placeholder="Note, optional" />
        <input className={inputClass} type="date" name="from" defaultValue={addDays(istToday(), -6)} required />
        <input className={inputClass} type="date" name="to" defaultValue={istToday()} required />
        <button className={btn}>Create payout</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Affiliate</th><th className={th}>Period</th><th className={th}>Amount</th><th className={th}>Status</th><th className={th}>Created</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/payouts/${row.id}`}>{row.affiliate_name}</Link></td>
                <td className={td}>{row.period_start} → {row.period_end}</td>
                <td className={td}>{money(row.amount, row.currency)}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{formatStamp(row.created_at)}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={5}>No payouts yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
