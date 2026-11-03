import Link from "next/link";
import { DeskForm, DeskSubmit } from "@/components/desk-form";
import { listAffiliates } from "@/lib/queries";
import { Banner, btn, btnGhost, EmptyState, inputClass, PageHeader, Pill, td, th, toneFor } from "@/components/ui";

export const metadata = { title: "Affiliates" };

export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listAffiliates(sp.q || ""));
  return (
    <div>
      <PageHeader
        title="Affiliates"
        description="Publishers who send traffic. Active affiliates can sign in to the portal."
        action={
          <span className="flex flex-wrap gap-2">
            <DeskForm name="cleanupDuplicateAffiliates">
              <DeskSubmit className={btnGhost} pendingLabel="Cleaning…">Remove duplicates</DeskSubmit>
            </DeskForm>
            <Link className={btn} href="/affiliates/new">New affiliate</Link>
          </span>
        }
      />
      <Banner error={sp.error} ok={sp.ok} />
      <form className="mb-4 flex gap-2">
        <input className={inputClass} name="q" defaultValue={sp.q} placeholder="Search name, company, email" />
        <button className="rounded-sm border border-border bg-surface px-3 text-sm">Search</button>
      </form>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Status</th><th className={th}>Email</th><th className={th}>Postback</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}><Link className="font-medium" href={`/affiliates/${row.id}`}>{row.name}</Link></td>
                <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                <td className={td}>{row.email || "—"}</td>
                <td className={td}>{row.postback_url ? "Set" : "—"}</td>
                <td className={td}>
                  <DeskForm name="deleteAffiliate">
                    <input type="hidden" name="id" value={row.id} />
                    <DeskSubmit className="text-sm text-danger" pendingLabel="Deleting…">Delete</DeskSubmit>
                  </DeskForm>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={5}><EmptyState title="No affiliates yet" /></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
