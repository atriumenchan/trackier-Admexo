import { deleteSyncSource, importFeed, runSync, saveSyncSource } from "@/lib/actions";
import { Banner, PageHeader, Pill, btn, btnDanger, inputClass, td, th, toneFor } from "@/components/ui";
import { formatStamp } from "@/lib/format";
import { listAdvertisers, listSyncSources } from "@/lib/queries";

export const metadata = { title: "Offer sync" };

const sample = `{
  "offers": [
    {
      "id": "adv-1001",
      "name": "US install",
      "payout": 1.2,
      "revenue": 1.8,
      "preview_url": "https://example.com",
      "tracking_url": "https://example.com/click?cid={click_id}",
      "countries": ["US"],
      "model": "CPA",
      "status": "active"
    }
  ]
}`;

export default async function SyncPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const sources = (await listSyncSources());
  const advertisers = (await listAdvertisers());
  return (
    <div className="space-y-4">
      <PageHeader title="Offer sync" description="Pull offers from an advertiser JSON feed, or paste a feed. Offers that disappear from a live feed are paused." />
      <Banner error={sp.error} ok={sp.ok} />
      <section className="surface-card p-4 sm:p-5">
        <h2 className="font-display text-lg">New source</h2>
        <form action={saveSyncSource} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className={inputClass} name="name" placeholder="Source name" required />
          <select className={inputClass} name="advertiser_id" required>
            <option value="">Advertiser</option>
            {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
          </select>
          <input className={inputClass} name="endpoint_url" placeholder="https://advertiser.example/offers.json" required />
          <input className={inputClass} name="api_key" placeholder="API key, optional" />
          <button className={btn}>Save source</button>
        </form>
      </section>
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Source</th><th className={th}>Advertiser</th><th className={th}>Last run</th><th className={th}></th></tr></thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td className={td}>{source.name}<div className="max-w-xs truncate font-mono text-[11px] text-faint">{source.endpoint_url}</div></td>
                <td className={td}>{source.advertiser_name}</td>
                <td className={td}>{source.last_status ? <Pill tone={toneFor(source.last_status)}>{source.last_status}</Pill> : "—"} <span className="text-[12px] text-muted">{formatStamp(source.last_run_at)} {source.last_message}</span></td>
                <td className={td}>
                  <div className="flex gap-2">
                    {source.endpoint_url.startsWith("http") ? <form action={runSync}><input type="hidden" name="id" value={source.id} /><button className="text-sm text-amber">Sync now</button></form> : null}
                    <form action={deleteSyncSource}><input type="hidden" name="id" value={source.id} /><button className={btnDanger}>Remove</button></form>
                  </div>
                </td>
              </tr>
            ))}
            {!sources.length ? <tr><td className={td} colSpan={4}>No sync sources yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <section className="surface-card p-4 sm:p-5">
        <h2 className="font-display text-lg">Paste JSON</h2>
        <form action={importFeed} className="mt-3 space-y-3">
          <select className={inputClass} name="advertiser_id" required>
            <option value="">Advertiser</option>
            {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
          </select>
          <textarea className={inputClass} name="json" rows={12} defaultValue={sample} />
          <button className={btn}>Import offers</button>
        </form>
      </section>
    </div>
  );
}
