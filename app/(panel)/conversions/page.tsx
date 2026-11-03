import Link from "next/link";
import { setConversionStatus } from "@/lib/actions";
import { Banner, PageHeader, Pill, inputClass, td, th, toneFor } from "@/components/ui";
import { addDays, formatStamp, istPartsStamp, istToday, money } from "@/lib/format";
import { setting } from "@/lib/db";
import { listAffiliates, listConversions, listOffers } from "@/lib/queries";

export const metadata = { title: "Conversions" };

export default async function ConversionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = sp.from || addDays(istToday(), -6);
  const to = sp.to || istToday();
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const userCurrency = (await setting("currency", "USD"));
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
      <PageHeader
        title="Conversions"
        description="Approved rows are payable. Pending rows can be approved or rejected."
        action={<Link className="rounded-sm border border-border bg-surface px-3 py-2 text-sm" href={`/export/conversions?from=${from}&to=${to}&offer=${sp.offer || ""}&affiliate=${sp.affiliate || ""}&status=${sp.status || ""}`}>Download CSV</Link>}
      />
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
          <thead><tr>
            <th className={th}>Time</th><th className={th}>Publisher</th><th className={th}>Source</th><th className={th}>p1</th>
            <th className={th}>Campaign</th><th className={th}>Goal</th><th className={th}>Goal value</th>
            <th className={th}>Payout</th><th className={th}>Payout (you)</th><th className={th}>Click IP</th>
            <th className={th}>City</th><th className={th}>Country</th><th className={th}>ISP</th>
            <th className={th}>Conversion</th><th className={th}>Click</th><th className={th}>Elapsed</th>
            <th className={th}>Method</th><th className={th}>Note</th><th className={th}>Status</th><th className={th}>Postback</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {rows.map((row) => {
              const stamp = istPartsStamp(row.created_at);
              return (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}<span className="block text-[11px] text-faint">{stamp.date} {stamp.time}</span></td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.source || "—"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.p1 || "—"}</td>
                <td className={td}>{row.offer_name}</td>
                <td className={td}>{row.goal_name || "Default"}</td>
                <td className={td}>{row.goal_value == null ? "—" : row.goal_value}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}>{money(row.payout_user || row.payout, userCurrency)}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.click_ip || row.ip || "—"}</td>
                <td className={td}>{row.city || "—"}</td>
                <td className={td}>{row.country || "—"}</td>
                <td className={td}>{row.isp || "—"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.id}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.click_id || "—"}</td>
                <td className={td}>{row.elapsed_time ? `${row.elapsed_time}s` : "—"}</td>
                <td className={td}>{row.method || "acquisition"}</td>
                <td className={td}>{row.note || row.reject_reason || "—"}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
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
              );
            })}
            {!rows.length ? <tr><td className={td} colSpan={21}>No conversions in this range.</td></tr> : null}
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
