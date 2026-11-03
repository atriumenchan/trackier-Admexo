import Link from "next/link";
import { DeskForm, DeskSubmit } from "@/components/desk-form";
import { listAdvertisers } from "@/lib/queries";
import { Banner, PageHeader, Pill, btn, inputClass, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Advertisers" };

export default async function AdvertisersPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listAdvertisers(sp.q || ""));
  return (
    <div>
      <PageHeader title="Advertisers" description="Brands that pay you. Each one has a postback URL you send them." action={<Link className={btn} href="/advertisers/new">New advertiser</Link>} />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 flex gap-2">
        <input className={inputClass} name="q" defaultValue={sp.q} placeholder="Search name, company, email" />
        <button className="rounded-sm border border-border bg-surface px-3 text-sm">Search</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Status</th><th className={th}>Email</th><th className={th}>Website</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/advertisers/${row.id}`}>{row.name}</Link></td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{row.email || "—"}</td>
                <td className={td}>{row.website || "—"}</td>
                <td className={td}>
                  <DeskForm name="deleteAdvertiser">
                    <input type="hidden" name="id" value={row.id} />
                    <DeskSubmit className="text-sm text-coral" pendingLabel="Deleting…">Delete</DeskSubmit>
                  </DeskForm>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={5}>No advertisers yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
