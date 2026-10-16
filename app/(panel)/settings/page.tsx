import { rotateApiToken, saveSettings } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { Banner, PageHeader, TextInput, btn, inputClass } from "@/components/ui";
import { setting } from "@/lib/db";
import { blockedIpText } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  return (
    <div>
      <PageHeader title="Settings" description="The tracking domain is what affiliates and advertisers see in copied links. Point it at this app before live traffic." />
      <Banner error={sp.error} ok={sp.ok} />
      <form action={saveSettings} className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <TextInput label="Tracking domain" name="base_url" required defaultValue={(await setting("base_url", "http://localhost:3010"))} hint="Example: https://track.yourdomain.com" />
        <TextInput label="Company" name="company_name" defaultValue={(await setting("company_name", "ADMEXO"))} />
        <TextInput label="Default currency" name="currency" defaultValue={(await setting("currency", "USD"))} />
        <TextInput label="Your new password" name="password" type="password" hint="Leave blank to keep the current admin password." />
        <TextInput label="Clicks from one IP before a flag" name="fraud_click_limit" type="number" defaultValue={(await setting("fraud_click_limit", "30"))} />
        <TextInput label="Window in minutes" name="fraud_window_minutes" type="number" defaultValue={(await setting("fraud_window_minutes", "10"))} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="block_fraud_clicks" value="1" defaultChecked={(await setting("block_fraud_clicks", "0")) === "1"} />
          Stop flagged clicks from reaching the offer
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[12px] font-medium text-muted">Blocked IPs</span>
          <textarea className={inputClass} name="blocked_ips" rows={5} defaultValue={(await blockedIpText())} placeholder="One IP per line" />
        </label>
        <button className={btn}>Save settings</button>
      </form>
      <form action={rotateApiToken} className="surface-card mt-4 p-4 sm:p-5">
        <p className="text-sm font-medium">API token</p>
        <p className="mt-1 break-all font-mono text-[12px]">{admin.api_token || "No token yet."}</p>
        <button className={`${btn} mt-3`}>{admin.api_token ? "Replace token" : "Create token"}</button>
      </form>
    </div>
  );
}
