import { OfferForm } from "@/components/offer-form";
import { Banner, PageHeader } from "@/components/ui";
import { listAdvertisers } from "@/lib/queries";

export const metadata = { title: "New offer" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const advertisers = (await listAdvertisers());
  return (
    <div>
      <PageHeader title="New offer" description="The offer URL is where a click is sent after we log it." />
      <Banner error={sp.error} />
      <div className="surface-card p-4 sm:p-5">
        {advertisers.length ? <OfferForm advertisers={advertisers} /> : <p className="text-sm text-muted">Create an advertiser first.</p>}
      </div>
    </div>
  );
}
