import { saveOwnPostback } from "@/lib/actions";
import { requireAffiliate } from "@/lib/auth";
import { Banner, PageHeader, btn, inputClass } from "@/components/ui";

export const metadata = { title: "Postback" };

export default async function PortalPostbackPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { affiliate } = await requireAffiliate();
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="Your postback" description="We call this URL after an approved conversion. Use {click_id}, {payout}, {txid}, {status}, {goal}, {offer_id}, and {sub1}." />
      <Banner error={sp.error} ok={sp.ok} />
      <form action={saveOwnPostback} className="surface-card space-y-3 p-4 sm:p-5">
        <textarea className={inputClass} name="postback_url" rows={4} defaultValue={affiliate.postback_url} />
        <button className={btn}>Save postback</button>
      </form>
    </div>
  );
}
