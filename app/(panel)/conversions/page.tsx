import Link from "next/link";
import { setConversionStatus } from "@/lib/actions";
import { Banner, PageHeader, Pill, inputClass, td, th, toneFor } from "@/components/ui";
import { addDays, formatStamp, istToday, money } from "@/lib/format";
import { listAffiliates, listConversions, listOffers } from "@/lib/queries";

export const metadata = { title: "Conversions" };

export default async function ConversionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = sp.from || addDays(istToday(), -6);
  const to = sp.to || istToday();
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const rows = (await listConversions({
    offerId: Number(sp.offer || 0) || undefined,
    affiliateId: Number(sp.affiliate || 0) || undefined,
    status: sp.status || undefined,
    from,
    to,
    page,
  }));
  return (
    <div>
      <PageHeader title="Conversions" description="Approved rows are payable. Pending rows can be approved or rejected." />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 grid gap-2 sm:grid-cols-5">
        <select className={inputClass} name="offer" defaultValue={sp.offer || ""}><option value="">All offers</option>{(await listOffers()).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}</select>
        <select className={inputClass} name="affiliate" defaultValue={sp.affiliate || ""}><option value="">All affiliates</option>{(await listAffiliates()).map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}</select>
        <select className={inputClass} name="status" defaultValue={sp.status || ""}><option value="">Any status</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="reversed">Reversed</option></select>
        <input className={inputClass} type="date" name="from" defaultValue={from} />
        <input className={inputClass} type="date" name="to" defaultValue={to} />
        <button className="rounded-sm border border-border bg-surface px-3 py-2 text-sm">Filter</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Offer</th><th className={th}>Affiliate</th><th className={th}>Goal</th><th className={th}>Payout</th><th className={th}>Revenue</th><th className={th}>Status</th><th className={th}>Postback</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.goal_name || "—"}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}>{money(row.revenue, row.currency)}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill>{row.reject_reason ? <span className="ml-2 text-[12px] text-faint">{row.reject_reason}</span> : null}</td>
                <td className={td}><Pill tone={toneFor(row.postback_status)}>{row.postback_status}</Pill></td>
                <td className={td}>
                  {row.status === "pending" ? (
                    <span className="flex gap-2">
                      <form action={setConversionStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="approved" /><button className="text-sm text-teal">Approve</button></form>
                      <form action={setConversionStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="rejected" /><button className="text-sm text-coral">Reject</button></form>
                    </span>
                  ) : null}
                  {row.status === "approved" ? (
                    <form action={setConversionStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="reversed" /><button className="text-sm text-coral">Reverse</button></form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={9}>No conversions in this range.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 ? <Link href={`/conversions?${new URLSearchParams({ from, to, offer: sp.offer || "", affiliate: sp.affiliate || "", status: sp.status || "", page: String(page - 1) })}`}>Previous</Link> : null}
        {rows.length === 50 ? <Link href={`/conversions?${new URLSearchParams({ from, to, offer: sp.offer || "", affiliate: sp.affiliate || "", status: sp.status || "", page: String(page + 1) })}`}>Next</Link> : null}
        <span className="text-muted">Page {page}</span>
      </div>
    </div>
  );
}
