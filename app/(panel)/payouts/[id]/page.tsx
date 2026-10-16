import { notFound } from "next/navigation";
import { markPayoutPaid, voidPayout } from "@/lib/actions";
import { Banner, PageHeader, btn, btnDanger, td, th } from "@/components/ui";
import { formatStamp, money } from "@/lib/format";
import { setting } from "@/lib/db";
import { affiliateBalance } from "@/lib/ledger";
import { getPayout, payoutConversions } from "@/lib/queries";

export const metadata = { title: "Payout" };

export default async function PayoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const payout = (await getPayout(Number(id)));
  if (!payout) notFound();
  const sp = await searchParams;
  const rows = (await payoutConversions(payout.id));
  const company = (await setting("company_name", "ADMEXO"));
  return (
    <div className="space-y-4">
      <PageHeader title={`${payout.affiliate_name} statement`} description={`${company} · ${payout.period_start} to ${payout.period_end}`} />
      <Banner error={sp.error} ok={sp.ok} />
      <section className="surface-card p-4 sm:p-5">
        <p className="font-display text-3xl">{money(payout.amount, payout.currency)}</p>
        <p className="mt-1 text-sm text-muted">{payout.status === "paid" ? `Paid ${formatStamp(payout.paid_at)}` : "Not paid yet"}{payout.notes ? ` · ${payout.notes}` : ""}</p>
        <p className="mt-1 text-sm text-muted">Publisher balance after this statement: {money(await affiliateBalance(payout.affiliate_id), payout.currency)}</p>
        <div className="no-print mt-4 flex gap-2">
          {payout.status === "pending" ? <form action={markPayoutPaid}><input type="hidden" name="id" value={payout.id} /><button className={btn}>Mark paid</button></form> : null}
          {payout.status === "pending" ? <form action={voidPayout}><input type="hidden" name="id" value={payout.id} /><button className={btnDanger}>Void</button></form> : null}
          <p className="self-center text-sm text-muted">Use the browser print dialog to save a PDF.</p>
        </div>
      </section>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Offer</th><th className={th}>Goal</th><th className={th}>Transaction</th><th className={th}>Payout</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.goal_name || "—"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.txid || row.click_id}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
