import { saveAdvertiser, saveAffiliate } from "@/lib/actions";
import { SelectInput, TextInput, btn, inputClass, Field } from "@/components/ui";
import type { Advertiser, Affiliate } from "@/lib/types";

export function AdvertiserForm({ advertiser }: { advertiser?: Advertiser }) {
  return (
    <form action={saveAdvertiser} className="grid gap-4 sm:grid-cols-2">
      {advertiser ? <input type="hidden" name="id" value={advertiser.id} /> : null}
      <TextInput label="Name" name="name" required defaultValue={advertiser?.name} />
      <TextInput label="Company" name="company" defaultValue={advertiser?.company} />
      <TextInput label="Email" name="email" type="email" defaultValue={advertiser?.email} hint="Used for the advertiser portal login." />
      <TextInput label="Website" name="website" defaultValue={advertiser?.website} />
      <SelectInput label="Status" name="status" defaultValue={advertiser?.status || "active"}>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
      </SelectInput>
      <TextInput label="Portal password" name="password" type="password" hint={advertiser ? "Leave blank to keep the current password." : "Set this to create a portal login."} />
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea className={inputClass} name="notes" rows={3} defaultValue={advertiser?.notes || ""} />
        </Field>
      </div>
      <div><button className={btn}>{advertiser ? "Save advertiser" : "Create advertiser"}</button></div>
    </form>
  );
}

export function AffiliateForm({ affiliate }: { affiliate?: Affiliate }) {
  return (
    <form action={saveAffiliate} className="grid gap-4 sm:grid-cols-2">
      {affiliate ? <input type="hidden" name="id" value={affiliate.id} /> : null}
      <TextInput label="Name" name="name" required defaultValue={affiliate?.name} />
      <TextInput label="Company" name="company" defaultValue={affiliate?.company} />
      <TextInput label="Email" name="email" type="email" defaultValue={affiliate?.email} />
      <SelectInput label="Status" name="status" defaultValue={affiliate?.status || "pending"}>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
      </SelectInput>
      <div className="sm:col-span-2">
        <TextInput label="Postback URL" name="postback_url" defaultValue={affiliate?.postback_url} hint="Called after an approved conversion. Macros: {click_id} {payout} {revenue} {txid} {status} {goal} {offer_id} {sub1}" />
      </div>
      <TextInput label="Portal password" name="password" type="password" hint={affiliate ? "Leave blank to keep the current password." : "Set this to create a portal login."} />
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea className={inputClass} name="notes" rows={3} defaultValue={affiliate?.notes || ""} />
        </Field>
      </div>
      <div><button className={btn}>{affiliate ? "Save affiliate" : "Create affiliate"}</button></div>
    </form>
  );
}
