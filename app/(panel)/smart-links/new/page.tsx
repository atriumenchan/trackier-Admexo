import { SmartForm } from "@/components/smart-form";
import { Banner, PageHeader } from "@/components/ui";
import { listAffiliates, listOffers } from "@/lib/queries";

export const metadata = { title: "New smart link" };

export default async function NewSmartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="New smart link" description="Tick the offers this link can send, and give each one a weight." />
      <Banner error={sp.error} />
      <div className="surface-card p-4 sm:p-5"><SmartForm affiliates={(await listAffiliates())} offers={(await listOffers())} /></div>
    </div>
  );
}
