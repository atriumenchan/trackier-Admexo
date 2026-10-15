import { saveSmartLink } from "@/lib/actions";
import { btn, inputClass } from "@/components/ui";
import type { Affiliate, Offer, SmartLink, SmartLinkOffer } from "@/lib/types";

export function SmartForm({
  affiliates,
  offers,
  smart,
  selected,
}: {
  affiliates: Affiliate[];
  offers: Offer[];
  smart?: SmartLink;
  selected?: SmartLinkOffer[];
}) {
  const weights = new Map((selected || []).map((row) => [row.offer_id, row.weight]));
  return (
    <form action={saveSmartLink} className="space-y-4">
      {smart ? <input type="hidden" name="id" value={smart.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">Name</span><input className={inputClass} name="name" required defaultValue={smart?.name} /></label>
        <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">Affiliate</span>
          <select className={inputClass} name="affiliate_id" defaultValue={smart ? String(smart.affiliate_id) : ""}>
            <option value="">Choose</option>
            {affiliates.map((affiliate) => <option key={affiliate.id} value={affiliate.id}>{affiliate.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">Send the click to</span>
          <select className={inputClass} name="sort_mode" defaultValue={smart?.sort_mode || "weight"}>
            <option value="weight">Weighted split</option>
            <option value="random">Random</option>
            <option value="cr">Highest conversion rate</option>
            <option value="profit">Highest profit</option>
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">Status</span>
          <select className={inputClass} name="status" defaultValue={smart?.status || "active"}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-[12px] font-medium text-muted">Fallback URL</span><input className={inputClass} name="fallback_url" defaultValue={smart?.fallback_url} /></label>
      </div>
      <div className="space-y-2">
        {offers.map((offer) => (
          <label key={offer.id} className="grid grid-cols-[auto_1fr_90px] items-center gap-3 text-sm">
            <input type="checkbox" name="offer_id" value={offer.id} defaultChecked={weights.has(offer.id)} />
            <span>{offer.name}</span>
            <input className={inputClass} name={`weight_${offer.id}`} type="number" min={1} defaultValue={weights.get(offer.id) || 1} />
          </label>
        ))}
      </div>
      <button className={btn}>{smart ? "Save smart link" : "Create smart link"}</button>
    </form>
  );
}
