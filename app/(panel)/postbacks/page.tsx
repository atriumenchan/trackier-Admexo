import { retryPostback } from "@/lib/actions";
import { Banner, PageHeader, Pill, td, th, toneFor } from "@/components/ui";
import { formatStamp } from "@/lib/format";
import { listPostbacks } from "@/lib/queries";

export const metadata = { title: "Postbacks" };

export default async function PostbacksPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const rows = (await listPostbacks());
  return (
    <div>
      <PageHeader title="Postbacks" description="Inbound calls from advertisers, and the outbound calls we make to affiliates." />
      <Banner error={sp.error} ok={sp.ok} />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className={th}>Time</th><th className={th}>Way</th><th className={th}>Click</th><th className={th}>Result</th><th className={th}>URL</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={td}>{formatStamp(row.created_at)}</td>
                <td className={td}>{row.direction === "in" ? "In" : "Out"}</td>
                <td className={`${td} font-mono text-[12px]`}>{row.click_id || "—"}</td>
                <td className={td}><Pill tone={row.ok ? "ok" : "bad"}>{row.status_code ?? "—"}</Pill> <span className="text-[12px] text-muted">{row.body}</span></td>
                <td className={`${td} max-w-sm truncate font-mono text-[12px]`}>{row.url}</td>
                <td className={td}>
                  {row.direction === "out" && row.conversion_id ? (
                    <form action={retryPostback}><input type="hidden" name="id" value={row.conversion_id} /><button className="text-sm text-amber">Retry</button></form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td className={td} colSpan={6}>No postbacks yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
