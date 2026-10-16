import Link from "next/link";
import { report, type ReportRow } from "@/lib/queries";
import { setting } from "@/lib/db";
import { addDays, istToday, money, num, percent } from "@/lib/format";
import { Banner, PageHeader, inputClass, td, th } from "@/components/ui";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = sp.from || addDays(istToday(), -6);
  const to = sp.to || istToday();
  const group = sp.group || "day";
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const rows = (await report(group, from, to, page));
  const currency = (await setting("currency", "USD"));
  const query = new URLSearchParams({ from, to, group });
  const nextQuery = new URLSearchParams(query);
  nextQuery.set("page", String(page + 1));
  const prevQuery = new URLSearchParams(query);
  prevQuery.set("page", String(page - 1));
  return (
    <div>
      <PageHeader title="Reports" description="Grouped in IST. Fraud and blocked clicks are left out. Only approved conversions count." action={<Link className="rounded-sm border border-border bg-surface px-3 py-2 text-sm" href={`/export?${query}`}>Download CSV</Link>} />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 grid gap-2 sm:grid-cols-4">
        <select className={inputClass} name="group" defaultValue={group}>
          <option value="day">By day</option>
          <option value="offer">By offer</option>
          <option value="affiliate">By affiliate</option>
          <option value="country">By country</option>
          <option value="device">By device</option>
        </select>
        <input className={inputClass} type="date" name="from" defaultValue={from} />
        <input className={inputClass} type="date" name="to" defaultValue={to} />
        <button className="rounded-sm border border-border bg-surface px-3 py-2 text-sm">Run report</button>
      </form>
      <ReportTable rows={rows} currency={currency} group={group} />
      <div className="mt-3 flex gap-3 text-sm">
        {page > 1 ? <Link href={`/reports?${prevQuery}`}>Previous</Link> : null}
        {rows.length === 50 ? <Link href={`/reports?${nextQuery}`}>Next</Link> : null}
        <span className="text-muted">Page {page}</span>
      </div>
    </div>
  );
}

function ReportTable({ rows, currency, group }: { rows: ReportRow[]; currency: string; group: string }) {
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full">
        <thead><tr><th className={th}>{group}</th><th className={th}>Clicks</th><th className={th}>Conversions</th><th className={th}>CR</th><th className={th}>Revenue</th><th className={th}>Payout</th><th className={th}>Profit</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bucketId}>
              <td className={td}>{row.bucket}</td>
              <td className={td}>{num(row.clicks)}</td>
              <td className={td}>{num(row.conversions)}</td>
              <td className={td}>{percent(row.clicks ? row.conversions / row.clicks : 0)}</td>
              <td className={td}>{money(row.revenue, currency)}</td>
              <td className={td}>{money(row.payout, currency)}</td>
              <td className={td}>{money(row.revenue - row.payout, currency)}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td className={td} colSpan={7}>No traffic in this range.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
