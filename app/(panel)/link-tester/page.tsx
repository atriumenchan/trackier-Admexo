import { LinkTester } from "@/components/link-tester";
import { PageHeader } from "@/components/ui";
import { listOffers } from "@/lib/queries";

export const metadata = { title: "Link tester" };

export default async function LinkTesterPage() {
  const offers = (await listOffers()).map((offer) => ({ id: offer.id, name: offer.name }));
  return (
    <div>
      <PageHeader title="Link tester" description="Follows up to 10 redirects and stops if a hop points at a private network. A final HTTP status under 400 is healthy." />
      <section className="surface-card p-4 sm:p-5"><LinkTester offers={offers} /></section>
    </div>
  );
}
