import Link from "next/link";
import { listOffers } from "@/lib/queries";
import { money } from "@/lib/format";
import { Banner, PageHeader, Pill, btn, inputClass, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Offers" };

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listOffers(sp.q || ""));
  return (
    <div>
      <PageHeader title="Offers" description="What affiliates promote. Payout is theirs. Revenue is yours." action={<Link className={btn} href="/offers/new">New offer</Link>} />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 flex gap-2">
        <input className={inputClass} name="q" defaultValue={sp.q} placeholder="Search offer or advertiser" />
        <button className="rounded-sm border border-border bg-surface px-3 text-sm">Search</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Offer</th><th className={th}>Advertiser</th><th className={th}>Status</th><th className={th}>Model</th><th className={th}>Payout</th><th className={th}>Revenue</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/offers/${row.id}`}>{row.name}</Link></td>
                <td className={td}>{row.advertiser_name}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{row.model}</td>
                <td className={td}>{money(row.payout, row.currency)}</td>
                <td className={td}>{money(row.revenue, row.currency)}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={6}>No offers yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
