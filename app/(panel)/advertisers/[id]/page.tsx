import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskForm, DeskSubmit } from "@/components/desk-form";
import { AdvertiserForm } from "@/components/partner-forms";
import { CopyButton } from "@/components/copy-button";
import { Banner, PageHeader, btnDanger, btnGhost } from "@/components/ui";
import { getAdvertiser, listOffers } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Advertiser" };

export default async function AdvertiserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const advertiser = (await getAdvertiser(Number(id)));
  if (!advertiser) notFound();
  const sp = await searchParams;
  const offers = (await listOffers()).filter((offer) => offer.advertiser_id === advertiser.id);
  const postback = `${(await publicBase())}/pb/${advertiser.postback_token}?click_id={click_id}&txid={txid}&goal={goal}&payout={payout}&revenue={revenue}&status={status}`;
  return (
    <div className="space-y-4">
      <PageHeader title={advertiser.name} description="Give this postback to the advertiser. They call it when a conversion happens." />
      <Banner error={sp.error} ok={sp.ok} />
      <section className="surface-card p-4 sm:p-5">
        <p className="break-all font-mono text-[12px] text-ink">{postback}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton value={postback} label="Copy postback" />
          <DeskForm name="regenerateToken"><input type="hidden" name="id" value={advertiser.id} /><DeskSubmit className={btnGhost} pendingLabel="Updating…">Regenerate</DeskSubmit></DeskForm>
        </div>
      </section>
      <section className="surface-card p-4 sm:p-5"><AdvertiserForm advertiser={advertiser} /></section>
      <section className="surface-card p-4 sm:p-5">
        <h2 className="font-display text-lg">Offers</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {offers.map((offer) => <li key={offer.id}><Link href={`/offers/${offer.id}`}>{offer.name}</Link></li>)}
          {!offers.length ? <li className="text-muted">No offers yet.</li> : null}
        </ul>
      </section>
      <DeskForm name="deleteAdvertiser">
        <input type="hidden" name="id" value={advertiser.id} />
        <DeskSubmit className={btnDanger} pendingLabel="Deleting…">Delete advertiser</DeskSubmit>
      </DeskForm>
    </div>
  );
}
