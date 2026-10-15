import { AffiliateForm } from "@/components/partner-forms";
import { Banner, PageHeader } from "@/components/ui";

export const metadata = { title: "New affiliate" };

export default async function NewAffiliatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="New affiliate" description="Approve them, set a password, and they can pull their own tracking links." />
      <Banner error={sp.error} />
      <div className="surface-card p-4 sm:p-5"><AffiliateForm /></div>
    </div>
  );
}
