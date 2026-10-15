import Link from "next/link";
import { listSmartLinks } from "@/lib/queries";
import { Banner, PageHeader, Pill, btn, td, th, toneFor } from "@/components/ui";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Smart links" };

export default async function SmartLinksPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listSmartLinks());
  const base = (await publicBase());
  return (
    <div>
      <PageHeader title="Smart links" description="One link that picks an offer by weight, conversion rate, profit, or at random." action={<Link className={btn} href="/smart-links/new">New smart link</Link>} />
      <Banner error={sp.error} ok={sp.ok} />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Affiliate</th><th className={th}>Rule</th><th className={th}>Status</th><th className={th}>Link</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/smart-links/${row.id}`}>{row.name}</Link></td>
                <td className={td}>{row.affiliate_name}</td>
                <td className={td}>{row.sort_mode}</td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={`${td} font-mono text-[12px]`}>{base}/s/{row.code}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={5}>No smart links yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
