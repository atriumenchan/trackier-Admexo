import { notFound } from "next/navigation";
import { deleteAccess, deleteGoal, deleteOffer, saveAccess, saveGoal } from "@/lib/actions";
import { OfferForm } from "@/components/offer-form";
import { CopyButton } from "@/components/copy-button";
import { Banner, PageHeader, Pill, btn, btnDanger, inputClass, td, th, toneFor } from "@/components/ui";
import { money } from "@/lib/format";
import { getOffer, listAdvertisers, listAffiliates, offerAccess, offerGoals, offerLinks } from "@/lib/queries";
import { publicBase } from "@/lib/tracking";

export const metadata = { title: "Offer" };

export default async function OfferPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const offer = (await getOffer(Number(id)));
  if (!offer) notFound();
  const sp = await searchParams;
  const goals = (await offerGoals(offer.id));
  const access = (await offerAccess(offer.id));
  const links = (await offerLinks(offer.id));
  const affiliates = (await listAffiliates());
  const base = (await publicBase());
  return (
    <div className="space-y-4">
      <PageHeader title={offer.name} description={`${offer.advertiser_name} · ${offer.model} · ${money(offer.payout, offer.currency)} payout / ${money(offer.revenue, offer.currency)} revenue`} />
      <Banner error={sp.error} ok={sp.ok} />
      <section className="surface-card p-4 sm:p-5"><OfferForm advertisers={(await listAdvertisers())} offer={offer} /></section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="font-display text-lg">Goals</h2>
        <p className="mt-1 text-sm text-muted">Optional events such as install or purchase. The default goal is used when the postback omits a goal.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={th}>Goal</th><th className={th}>Payout</th><th className={th}>Revenue</th><th className={th}></th></tr></thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id}>
                  <td className={td}>{goal.name} {goal.is_default ? <Pill tone="ok">default</Pill> : null}</td>
                  <td className={td}>{money(goal.payout, offer.currency)}</td>
                  <td className={td}>{money(goal.revenue, offer.currency)}</td>
                  <td className={td}>
                    <form action={deleteGoal}><input type="hidden" name="id" value={goal.id} /><input type="hidden" name="offer_id" value={offer.id} /><button className="text-sm text-coral">Remove</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveGoal} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="offer_id" value={offer.id} />
          <input className={inputClass} name="name" placeholder="goal name" required />
          <input className={inputClass} name="payout" type="number" step="0.01" placeholder="payout" />
          <input className={inputClass} name="revenue" type="number" step="0.01" placeholder="revenue" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_default" value="1" /> Default</label>
          <button className={btn}>Add goal</button>
        </form>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="font-display text-lg">Affiliate access</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={th}>Affiliate</th><th className={th}>Status</th><th className={th}>Custom payout</th><th className={th}>Custom revenue</th><th className={th}></th></tr></thead>
            <tbody>
              {access.map((row) => (
                <tr key={row.id}>
                  <td className={td}>{row.affiliate_name}</td>
                  <td className={td}><Pill tone={toneFor(row.status)}>{row.status}</Pill></td>
                  <td className={td}>{row.custom_payout == null ? "—" : money(row.custom_payout, offer.currency)}</td>
                  <td className={td}>{row.custom_revenue == null ? "—" : money(row.custom_revenue, offer.currency)}</td>
                  <td className={td}>
                    <form action={deleteAccess}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="offer_id" value={offer.id} /><button className="text-sm text-coral">Remove</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveAccess} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="offer_id" value={offer.id} />
          <select className={inputClass} name="affiliate_id" required>
            <option value="">Affiliate</option>
            {affiliates.map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
          </select>
          <select className={inputClass} name="status" defaultValue="approved">
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
          <input className={inputClass} name="custom_payout" type="number" step="0.01" placeholder="Custom payout" />
          <input className={inputClass} name="custom_revenue" type="number" step="0.01" placeholder="Custom revenue" />
          <button className={btn}>Save access</button>
        </form>
      </section>

      <section className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Tracking link</th><th className={th}>Affiliate</th><th className={th}></th></tr></thead>
          <tbody>
            {links.map((link) => {
              const url = `${base}/t/${link.code}`;
              return (
                <tr key={link.id}>
                  <td className={`${td} font-mono text-[12px]`}>{url}</td>
                  <td className={td}>{link.affiliate_name}</td>
                  <td className={td}><CopyButton value={url} /></td>
                </tr>
              );
            })}
            {!links.length ? <tr><td className={td} colSpan={3}>Approve an affiliate to create a link.</td></tr> : null}
          </tbody>
        </table>
      </section>
      <form action={deleteOffer}><input type="hidden" name="id" value={offer.id} /><button className={btnDanger}>Delete offer</button></form>
      <p className="text-[12px] text-faint">Delete is available only before the first click. After that, pause the offer.</p>
    </div>
  );
}
