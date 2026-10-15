import { notFound } from "next/navigation";
import { deleteSmartLink } from "@/lib/actions";
import { SmartForm } from "@/components/smart-form";
import { CopyButton } from "@/components/copy-button";
import { Banner, PageHeader, btnDanger } from "@/components/ui";
import { getSmartLink, listAffiliates, listOffers, smartLinkOffers } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Smart link" };

export default async function SmartLinkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const smart = (await getSmartLink(Number(id)));
  if (!smart) notFound();
  const sp = await searchParams;
  const url = `${(await publicBase())}/s/${smart.code}`;
  return (
    <div className="space-y-4">
      <PageHeader title={smart.name} description={url} />
      <Banner error={sp.error} ok={sp.ok} />
      <CopyButton value={url} label="Copy smart link" />
      <section className="surface-card p-4 sm:p-5">
        <SmartForm affiliates={(await listAffiliates())} offers={(await listOffers())} smart={smart} selected={(await smartLinkOffers(smart.id))} />
      </section>
      <form action={deleteSmartLink}><input type="hidden" name="id" value={smart.id} /><button className={btnDanger}>Delete smart link</button></form>
    </div>
  );
}
