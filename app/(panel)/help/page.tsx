import { PageHeader } from "@/components/ui";
import { MACROS } from "@/lib/tracking";

export const metadata = { title: "Help" };

const rows = [
  ["click_id", "The click this conversion belongs to"],
  ["affiliate_id", "Publisher id"],
  ["affiliate_name", "Publisher name"],
  ["offer_id", "Offer id"],
  ["offer_name", "Offer name"],
  ["payout", "Publisher payout"],
  ["revenue", "Advertiser revenue"],
  ["txid", "Advertiser transaction id"],
  ["status", "approved, pending, rejected, or reversed"],
  ["goal", "Goal name"],
  ["source", "Always admexo"],
  ["sub1 to sub10", "Values passed on the tracking link"],
];

export default function HelpPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Help" description="These are the macros the tracker replaces. Anything else is left as written." />
      <div className="surface-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="px-3 py-2 text-left text-[12px] font-medium text-muted">Macro</th><th className="px-3 py-2 text-left text-[12px] font-medium text-muted">Meaning</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <td className="px-3 py-2 font-mono text-[12px]">{`{${row[0]}}`}</td>
                <td className="px-3 py-2 text-sm">{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="surface-card p-4 text-sm leading-relaxed text-muted sm:p-5">
        <p>The API uses a bearer token from Settings. Offers and clicks are GET. Postbacks are POST and only an advertiser token can record one.</p>
        <p className="mt-2 font-mono text-[12px]">GET /api/v1/offers</p>
        <p className="font-mono text-[12px]">GET /api/v1/clicks?page=1</p>
        <p className="font-mono text-[12px]">POST /api/v1/postbacks</p>
        <p className="mt-2">The machine-readable description is at <a className="text-teal" href="/api/openapi">/api/openapi</a>.</p>
        <p className="mt-2">Working macros: {MACROS.map((name) => `{${name}}`).join(" ")}</p>
      </section>
    </div>
  );
}
