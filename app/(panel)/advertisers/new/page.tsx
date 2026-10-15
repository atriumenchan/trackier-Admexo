import { AdvertiserForm } from "@/components/partner-forms";
import { Banner, PageHeader } from "@/components/ui";

export const metadata = { title: "New advertiser" };

export default async function NewAdvertiserPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="New advertiser" description="Add the brand, then copy their postback URL from the next screen." />
      <Banner error={sp.error} />
      <div className="surface-card p-4 sm:p-5"><AdvertiserForm /></div>
    </div>
  );
}
