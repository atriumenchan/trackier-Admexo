import { saveOffer } from "@/lib/actions";
import { Field, SelectInput, TextInput, btn, inputClass } from "@/components/ui";
import type { Advertiser, Offer } from "@/lib/types";

const macroHint = "Macros: {click_id} {affiliate_id} {offer_id} {sub1} to {sub5}";

export function OfferForm({ advertisers, offer }: { advertisers: Advertiser[]; offer?: Offer }) {
  return (
    <form action={saveOffer} className="grid gap-4 sm:grid-cols-2">
      {offer ? <input type="hidden" name="id" value={offer.id} /> : null}
      <TextInput label="Name" name="name" required defaultValue={offer?.name} />
      <SelectInput label="Advertiser" name="advertiser_id" defaultValue={offer ? String(offer.advertiser_id) : ""}>
        <option value="">Choose</option>
        {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
      </SelectInput>
      <div className="sm:col-span-2">
        <TextInput label="Offer URL" name="offer_url" required defaultValue={offer?.offer_url} hint={macroHint} />
      </div>
      <TextInput label="Preview URL" name="preview_url" defaultValue={offer?.preview_url} />
      <SelectInput label="Model" name="model" defaultValue={offer?.model || "CPA"} hint="CPS and RevShare are a percent of the sale amount.">
        <option>CPA</option>
        <option>CPL</option>
        <option>CPS</option>
        <option>RevShare</option>
      </SelectInput>
      <TextInput label="Payout" name="payout" type="number" defaultValue={offer?.payout ?? 0} hint="What the affiliate earns." />
      <TextInput label="Revenue" name="revenue" type="number" defaultValue={offer?.revenue ?? 0} hint="What the advertiser pays you." />
      <TextInput label="Currency" name="currency" defaultValue={offer?.currency || "USD"} />
      <SelectInput label="Status" name="status" defaultValue={offer?.status || "active"}>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
      </SelectInput>
      <SelectInput label="Who can run it" name="visibility" defaultValue={offer?.visibility || "private"}>
        <option value="private">Private, assigned affiliates only</option>
        <option value="approval">Visible, approval required</option>
        <option value="public">Public to active affiliates</option>
      </SelectInput>
      <SelectInput label="Devices" name="devices" defaultValue={offer?.devices || "all"}>
        <option value="all">All devices</option>
        <option value="mobile">Mobile</option>
        <option value="desktop">Desktop</option>
        <option value="tablet">Tablet</option>
      </SelectInput>
      <SelectInput label="Countries" name="country_mode" defaultValue={offer?.country_mode || "all"}>
        <option value="all">All countries</option>
        <option value="allow">Allow list</option>
        <option value="block">Block list</option>
      </SelectInput>
      <TextInput label="Country codes" name="countries" defaultValue={offer?.countries} placeholder="US, IN, AE" />
      <TextInput label="Daily click cap" name="daily_click_cap" type="number" defaultValue={offer?.daily_click_cap} hint="Blank means no cap. Counted in IST." />
      <TextInput label="Daily conversion cap" name="daily_conversion_cap" type="number" defaultValue={offer?.daily_conversion_cap} />
      <TextInput label="Daily revenue cap" name="daily_budget_cap" type="number" defaultValue={offer?.daily_budget_cap} />
      <TextInput label="Fallback URL" name="fallback_url" defaultValue={offer?.fallback_url} hint="Used when a click is blocked by a cap, country, or device rule." />
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea className={inputClass} name="description" rows={3} defaultValue={offer?.description || ""} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <button className={btn}>{offer ? "Save offer" : "Create offer"}</button>
      </div>
    </form>
  );
}
