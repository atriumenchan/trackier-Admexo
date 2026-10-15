import Link from "next/link";
import { listAffiliates } from "@/lib/queries";
import { Banner, PageHeader, Pill, btn, inputClass, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Affiliates" };

export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listAffiliates(sp.q || ""));
  return (
    <div>
      <PageHeader title="Affiliates" description="Publishers who send traffic. Active affiliates can sign in to the portal." action={<Link className={btn} href="/affiliates/new">New affiliate</Link>} />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 flex gap-2">
        <input className={inputClass} name="q" defaultValue={sp.q} placeholder="Search name, company, email" />
        <button className="rounded-sm border border-border bg-surface px-3 text-sm">Search</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Status</th><th className={th}>Email</th><th className={th}>Postback</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/affiliates/${row.id}`}>{row.name}</Link></td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{row.email || "—"}</td>
                <td className={td}>{row.postback_url ? "Set" : "—"}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={4}>No affiliates yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
