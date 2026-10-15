import { requestAccess } from "@/lib/actions";
import { requireAffiliate } from "@/lib/auth";
import { CopyButton } from "@/components/copy-button";
import { Banner, PageHeader, Pill, btn, td, th } from "@/components/ui";
import { money } from "@/lib/format";
import { affiliateOffers } from "@/lib/queries";
import { ensureLink, publicBase } from "@/lib/tracking";

export const metadata = { title: "Offers" };

export default async function PortalOffersPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { affiliate } = await requireAffiliate();
  const sp = await searchParams;
  const offers = (await affiliateOffers(affiliate.id));
  const base = (await publicBase());
  const rows = [];
  for (const offer of offers) {
    const approved = offer.visibility === "public" || offer.access_status === "approved";
    const url = approved && affiliate.status === "active" ? `${base}/t/${await ensureLink(offer.id, affiliate.id)}` : "";
    rows.push({ offer, approved, url });
  }
  return (
    <div>
      <PageHeader title="Offers" description="Public offers and offers assigned to you. Approval offers need a request." />
      <Banner error={sp.error} ok={sp.ok} />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Offer</th><th className={th}>Payout</th><th className={th}>Link</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map(({ offer, approved, url }) => (
                <tr key={offer.id}>
                  <td className={td}>{offer.name}<div className="text-[12px] text-faint">{offer.advertiser_name}</div></td>
                  <td className={td}>{money(offer.payout, offer.currency)} {offer.model}</td>
                  <td className={`${td} font-mono text-[12px]`}>{url || "—"}</td>
                  <td className={td}>
                    {url ? <CopyButton value={url} /> : null}
                    {!approved && offer.access_status === "pending" ? <Pill tone="warn">Requested</Pill> : null}
                    {!approved && offer.access_status !== "pending" ? (
                      <form action={requestAccess}><input type="hidden" name="offer_id" value={offer.id} /><button className={btn}>Request</button></form>
                    ) : null}
                  </td>
                </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={4}>No offers are open to you yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
