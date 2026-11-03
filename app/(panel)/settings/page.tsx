import { requireAdmin } from "@/lib/auth";
import { DeskForm, DeskSubmit } from "@/components/desk-form";
import { Banner, PageHeader, TextInput, inputClass } from "@/components/ui";
import { one, setting } from "@/lib/db";
import { blockedIpText } from "@/lib/queries";
import type { User } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const admin = (await one<User>("SELECT * FROM users WHERE id = ?", session.id)) || session;
  return (
    <div>
      <PageHeader title="Settings" description="The tracking domain is what affiliates and advertisers see in copied links. Point it at this app before live traffic." />
      <Banner error={sp.error} ok={sp.ok} />
      <DeskForm name="saveSettings" className="surface-card grid items-start gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <TextInput label="Tracking domain" name="base_url" required defaultValue={(await setting("base_url", "https://www.adcliqx.com"))} hint="Used when a click has no site host. On adcliqx.com the link uses that domain immediately." />
        <TextInput label="Company" name="company_name" defaultValue={(await setting("company_name", "ADMEXO"))} />
        <TextInput label="Default currency" name="currency" defaultValue={(await setting("currency", "USD"))} hint="Your payout currency. Campaign payout is stored as well." />
        <TextInput label="FX rate into your currency" name="fx_rate" type="number" defaultValue={(await setting("fx_rate", "1"))} hint="If an offer pays USD 25 and this is 94.44, user payout is 2361." />
        <TextInput label="Your new password" name="password" type="password" hint="Leave blank to keep the current admin password." />
        <TextInput label="Clicks from one IP before a flag" name="fraud_click_limit" type="number" defaultValue={(await setting("fraud_click_limit", "30"))} />
        <TextInput label="Window in minutes" name="fraud_window_minutes" type="number" defaultValue={(await setting("fraud_window_minutes", "10"))} />
        <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="block_fraud_clicks" value="1" defaultChecked={(await setting("block_fraud_clicks", "0")) === "1"} />
          Stop flagged clicks from reaching the offer
        </label>
        <label className="relative z-0 block sm:col-span-2">
          <span className="mb-1 block text-[12px] font-medium text-muted">Blocked IPs</span>
          <textarea className={inputClass} name="blocked_ips" rows={5} defaultValue={(await blockedIpText())} placeholder="One IP per line" />
        </label>
        <div className="relative z-10 sm:col-span-2">
          <DeskSubmit>Save settings</DeskSubmit>
        </div>
      </DeskForm>
      <DeskForm name="rotateApiToken" className="surface-card mt-4 p-4 sm:p-5">
        <p className="text-sm font-medium">API token</p>
        <p className="mt-1 break-all font-mono text-[12px]">{admin.api_token || "No token yet."}</p>
        <div className="relative z-10 mt-3 w-fit">
          <DeskSubmit>{admin.api_token ? "Replace token" : "Create token"}</DeskSubmit>
        </div>
      </DeskForm>
    </div>
  );
}
