import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing";

export const metadata: Metadata = { title: "Click tracker documentation" };

const rows = [
  ["sub1 to sub10", "Publisher values. Stored on the click. sub1 is also used as source and p1 when those are empty."],
  ["source or src", "Traffic source. Stored on the click."],
  ["p1", "Publisher reference. Stored on the click."],
  ["gclid", "Google click id. Stored on the click. Used in the Google Ads template as gclid={gclid}."],
  ["creative", "Google creative id. Stored. Template value {creative}."],
  ["device", "Google device. Stored. Template value {device}."],
  ["campaignid", "Google campaign id. Stored separately from our campaign_id. Template value {campaignid}."],
  ["campaign_id", "Our offer id. Added by Adcliqx on the landing URL in Google mode. Not a Google ValueTrack field."],
  ["click_id", "The id Adcliqx creates for this click. Added to the landing URL. The advertiser sends it back on the postback."],
  ["redirection_url", "Google next hop only. The value is {lpurl}. Ignored for ordinary affiliate links."],
  ["force_transparent", "Set to true in the Google Ads template. Requires redirection_url."],
];

export default function ClickTrackerPage() {
  return (
    <PublicPage
      eyebrow="Documentation"
      title="Adcliqx click tracker"
      intro={<p>Click domain: adcliqx.com. This is the production tracker, not a postback endpoint.</p>}
    >
      <h2>Production click URL</h2>
      <p><code>https://www.adcliqx.com/t/kbqfa3tr</code></p>
      <p>That URL is live. It answers with HTTPS and HTTP 302. The Location for this test link is the offer landing page configured in the desk:</p>
      <p><code>https://manychat.partnerlinks.io/qiqbxip3kwng-ogcg6e</code></p>
      <p>Flow: ad click → www.adcliqx.com → that landing URL. The browser does not stop on another Adcliqx host. manychat.partnerlinks.io is the advertiser destination saved on the offer, not an Adcliqx domain.</p>

      <h2>Next-hop parameter</h2>
      <p>Ordinary tracking links have no url, redirect_url, or destination parameter. The landing page is the Offer URL saved on the offer. The tracker does not redirect to an address taken from the query string.</p>
      <p>Google Ads uses one named parameter, redirection_url, and only when that parameter is present. The tracking template is:</p>
      <pre>{"https://www.adcliqx.com/t/kbqfa3tr?force_transparent=true&campaign_id=9&gclid={gclid}&creative={creative}&device={device}&redirection_url={lpurl}"}</pre>
      <p>In that mode the 302 Location is redirection_url after one decode. The offer URL is not used. Invalid targets, private addresses, and uncertified nested trackers are rejected with HTTP 400. If strict matching is on for the offer, the landing host must match the offer Final URL.</p>

      <h2>Parameters</h2>
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-2 text-left text-[11.5px] uppercase tracking-[0.06em] text-faint">
            <tr><th className="px-4 py-2.5 font-semibold">Parameter</th><th className="px-4 py-2.5 font-semibold">Use</th></tr>
          </thead>
          <tbody>
            {rows.map(([name, use]) => (
              <tr key={name} className="border-t border-border">
                <td className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-[12.5px]">{name}</td>
                <td className="px-4 py-2.5 align-top text-muted">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{"{keyword}"}, {"{adgroupid}"}, {"{matchtype}"}, {"{network}"}, and {"{placement}"} have no columns of their own. Put them in sub1 to sub10 in the tracking template if you need them stored. The offer URL can also contain {"{click_id}"}, {"{affiliate_id}"}, {"{offer_id}"}, {"{sub1}"} to {"{sub10}"}, and {"{source}"}.</p>

      <h2>Domains and HTTPS</h2>
      <p>The click domain for this application is adcliqx.com, including www.adcliqx.com. Clicks, smart links (/s/), and postbacks (/pb/) use that same host. The app is also reachable on trackier-admexo.vercel.app because that is where it is hosted. No other click domain is configured. HTTPS is required. The live response sends Strict-Transport-Security. Click redirects send Cache-Control: no-store.</p>

      <h2>Postback</h2>
      <p>Postbacks are not click URLs. Each advertiser has a token. The advertiser calls:</p>
      <pre>{"https://www.adcliqx.com/pb/TOKEN?click_id={click_id}&txid={txid}&goal={goal}&payout={payout}&revenue={revenue}&status={status}"}</pre>
      <p>click_id is the id we added on the landing URL. txid is the advertiser order id. GET or POST both work. JSON and form posts accept the same names. Aliases: clickid, cid, transaction_id, trans_id.</p>

      <h2>API</h2>
      <p>Machine-readable API description: <a href="/api/openapi">/api/openapi</a>.</p>
    </PublicPage>
  );
}
