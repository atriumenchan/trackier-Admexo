import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAffiliate } from "@/lib/actions";
import { AffiliateForm } from "@/components/partner-forms";
import { Banner, PageHeader, btnDanger, td, th } from "@/components/ui";
import { all } from "@/lib/db";
import { getAffiliate } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";
import type { TrackingLink } from "@/lib/types";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Affiliate" };

export default async function AffiliatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const affiliate = (await getAffiliate(Number(id)));
  if (!affiliate) notFound();
  const sp = await searchParams;
  const links = (await all<TrackingLink>(
    `SELECT t.*, o.name AS offer_name FROM tracking_links t JOIN offers o ON o.id = t.offer_id WHERE t.affiliate_id = ? ORDER BY o.name`,
    affiliate.id,
  ));
  const base = (await publicBase());
  return (
    <div className="space-y-4">
      <PageHeader title={affiliate.name} description="Tracking links appear after you approve this affiliate on an offer." />
      <Banner error={sp.error} ok={sp.ok} />
      <section className="surface-card p-4 sm:p-5"><AffiliateForm affiliate={affiliate} /></section>
      <section className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Offer</th><th className={th}>Tracking link</th><th className={th}></th></tr></thead>
          <tbody>
            {links.map((link) => {
              const url = `${base}/t/${link.code}`;
              return (
                <tr key={link.id}>
                  <td className={td}><Link href={`/offers/${link.offer_id}`}>{link.offer_name}</Link></td>
                  <td className={`${td} font-mono text-[12px]`}>{url}</td>
                  <td className={td}><CopyButton value={url} /></td>
                </tr>
              );
            })}
            {!links.length ? <tr><td className={td} colSpan={3}>No links yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
      <form action={deleteAffiliate}><input type="hidden" name="id" value={affiliate.id} /><button className={btnDanger}>Delete affiliate</button></form>
    </div>
  );
}
