import { DeskForm, DeskSubmit } from "@/components/desk-form";
import { Banner, PageHeader, Pill, btnDanger, inputClass, td, th, toneFor } from "@/components/ui";
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
        <DeskForm name="saveSyncSource" className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className={inputClass} name="name" placeholder="Source name" required />
          <select className={inputClass} name="advertiser_id" required>
            <option value="">Advertiser</option>
            {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
          </select>
          <input className={inputClass} name="endpoint_url" placeholder="https://advertiser.example/offers.json" required />
          <input className={inputClass} name="api_key" placeholder="API key, optional" />
          <div className="sm:col-span-2"><DeskSubmit>Save source</DeskSubmit></div>
        </DeskForm>
      </section>
      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr><th className={th}>Source</th><th className={th}>Advertiser</th><th className={th}>Last run</th><th className={th}></th></tr></thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td className={`${td} max-w-[220px]`}>
                  <p className="font-medium">{source.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-faint" title={source.endpoint_url}>{source.endpoint_url}</p>
                </td>
                <td className={`${td} whitespace-nowrap`}>{source.advertiser_name}</td>
                <td className={`${td} max-w-sm`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {source.last_status ? <Pill tone={toneFor(source.last_status)}>{source.last_status}</Pill> : <span className="text-muted">—</span>}
                      {source.last_run_at ? <span className="whitespace-nowrap text-[12px] text-muted">{formatStamp(source.last_run_at)}</span> : null}
                    </div>
                    {source.last_message ? <p className="text-[12px] leading-snug text-muted">{source.last_message}</p> : null}
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex items-center justify-end gap-2">
                    {source.endpoint_url.startsWith("http") ? (
                      <DeskForm name="runSync">
                        <input type="hidden" name="id" value={source.id} />
                        <DeskSubmit className="text-sm text-amber" pendingLabel="Syncing…">Sync now</DeskSubmit>
                      </DeskForm>
                    ) : null}
                    <DeskForm name="deleteSyncSource">
                      <input type="hidden" name="id" value={source.id} />
                      <DeskSubmit className={btnDanger} pendingLabel="Removing…">Remove</DeskSubmit>
                    </DeskForm>
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
        <DeskForm name="importFeed" className="mt-3 space-y-3">
          <select className={inputClass} name="advertiser_id" required>
            <option value="">Advertiser</option>
            {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
          </select>
          <textarea className={inputClass} name="json" rows={12} defaultValue={sample} />
          <DeskSubmit>Import offers</DeskSubmit>
        </DeskForm>
      </section>
    </div>
  );
}
