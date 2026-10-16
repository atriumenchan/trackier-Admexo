import { GoogleDesk } from "@/components/google-desk";
import { Banner, PageHeader, btn, inputClass } from "@/components/ui";
import { all, setting } from "@/lib/db";
import { runCanaryAction, saveGoogleDomain } from "@/lib/google-actions";
import { applicationPack } from "@/lib/google-policy";

export const metadata = { title: "Google" };

export default async function GooglePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const domains = await all<{ host: string; final_url: string; status: string; detail: string; checked_at: string }>("SELECT host, final_url, status, detail, checked_at FROM google_domains ORDER BY host");
  const rejections = await all<{ error_code: string; path: string; host: string; created_at: string }>("SELECT error_code, path, host, created_at FROM google_rejections ORDER BY id DESC LIMIT 20");
  const canary = await setting("google_canary", "");
  const base = await setting("base_url", "https://trackier-admexo.vercel.app");
  const pack = applicationPack({ verifiedHosts: domains.filter((row) => row.status === "verified").map((row) => row.host) });
  let canaryText = "Not run yet.";
  if (canary) {
    try {
      const parsed = JSON.parse(canary) as { pass?: boolean; at?: string };
      canaryText = `${parsed.pass ? "Passing" : "Failing"} at ${parsed.at || ""}`;
    } catch {
      canaryText = "The last canary report could not be read.";
    }
  }
  return (
    <div className="grid gap-4">
      <PageHeader title="Google" description="Templates for Google Ads, domain checks, and the certification notes. A customer subdomain is allowed only on the same domain as its Final URL." />
      <Banner error={sp.error} ok={sp.ok} />
      <GoogleDesk origin={base} />
      <form action={saveGoogleDomain} className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <h2 className="font-display text-lg text-ink sm:col-span-2">Customer CNAME</h2>
        <p className="text-sm text-muted sm:col-span-2">DNS is checked here. The certificate is issued when you add the hostname to the Vercel project. This app does not issue certificates.</p>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Hostname</span>
          <input className={inputClass} name="host" placeholder="track.brand.example" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Final URL</span>
          <input className={inputClass} name="final_url" placeholder="https://brand.example/landing" />
        </label>
        <div className="sm:col-span-2"><button className={btn}>Check CNAME</button></div>
        {domains.length ? (
          <div className="sm:col-span-2 grid gap-2">
            {domains.map((row) => (
              <p key={row.host} className="text-sm text-ink">
                <span className="font-mono">{row.host}</span> · {row.status} · {row.detail}
              </p>
            ))}
          </div>
        ) : <p className="text-sm text-muted sm:col-span-2">No customer domains yet.</p>}
      </form>
      <form action={runCanaryAction} className="surface-card grid gap-3 p-4 sm:p-5">
        <h2 className="font-display text-lg text-ink">Redirect canary</h2>
        <p className="text-sm text-muted">{canaryText} The scheduled run is once a day. Use this button to run it now. A webhook in GOOGLE_ALERT_WEBHOOK is notified when it fails. Until that is set, this page is the alert.</p>
        <div><button className={btn}>Run canary</button></div>
      </form>
      <section className="surface-card grid gap-3 p-4 sm:p-5">
        <h2 className="font-display text-lg text-ink">Application pack</h2>
        <textarea className={inputClass} readOnly rows={16} value={pack} />
      </section>
      <section className="surface-card grid gap-2 p-4 sm:p-5">
        <h2 className="font-display text-lg text-ink">Rejected Google clicks</h2>
        {rejections.length ? rejections.map((row) => (
          <p key={`${row.created_at}-${row.path}-${row.error_code}`} className="text-sm text-muted">{row.created_at} · {row.error_code} · {row.host}{row.path}</p>
        )) : <p className="text-sm text-muted">None yet.</p>}
      </section>
    </div>
  );
}
