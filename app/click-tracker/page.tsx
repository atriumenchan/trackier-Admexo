import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Click tracker" };

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
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-ink">
      <p className="font-display text-3xl">Adcliqx click tracker</p>
      <p className="mt-2 text-muted">Click domain: adcliqx.com. This is the production tracker, not a postback endpoint.</p>

      <h2 className="mt-8 font-display text-xl">Production click URL</h2>
      <p className="mt-2 font-mono text-[13px] break-all">https://www.adcliqx.com/t/kbqfa3tr</p>
      <p className="mt-2">That URL is live. It answers with HTTPS and HTTP 302. The Location for this test link is the offer landing page configured in the desk:</p>
      <p className="mt-2 font-mono text-[13px] break-all">https://manychat.partnerlinks.io/qiqbxip3kwng-ogcg6e</p>
      <p className="mt-2">Flow: ad click → www.adcliqx.com → that landing URL. The browser does not stop on another Adcliqx host. manychat.partnerlinks.io is the advertiser destination saved on the offer, not an Adcliqx domain.</p>

      <h2 className="mt-8 font-display text-xl">Next-hop parameter</h2>
      <p className="mt-2">Ordinary tracking links have no url, redirect_url, or destination parameter. The landing page is the Offer URL saved on the offer. The tracker does not redirect to an address taken from the query string.</p>
      <p className="mt-2">Google Ads uses one named parameter, redirection_url, and only when that parameter is present. The tracking template is:</p>
      <p className="mt-2 font-mono text-[13px] break-all">https://www.adcliqx.com/t/kbqfa3tr?force_transparent=true&campaign_id=9&gclid={"{gclid}"}&creative={"{creative}"}&device={"{device}"}&redirection_url={"{lpurl}"}</p>
      <p className="mt-2">In that mode the 302 Location is redirection_url after one decode. The offer URL is not used. Invalid targets, private addresses, and uncertified nested trackers are rejected with HTTP 400. If strict matching is on for the offer, the landing host must match the offer Final URL.</p>

      <h2 className="mt-8 font-display text-xl">Parameters</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <tbody>
            {rows.map(([name, use]) => (
              <tr key={name}>
                <td className="border-t border-border py-2 pr-3 align-top font-mono text-[12px]">{name}</td>
                <td className="border-t border-border py-2 align-top">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3">{"{keyword}"}, {"{adgroupid}"}, {"{matchtype}"}, {"{network}"}, and {"{placement}"} have no columns of their own. Put them in sub1 to sub10 in the tracking template if you need them stored. The offer URL can also contain {"{click_id}"}, {"{affiliate_id}"}, {"{offer_id}"}, {"{sub1}"} to {"{sub10}"}, and {"{source}"}.</p>

      <h2 className="mt-8 font-display text-xl">Domains and HTTPS</h2>
      <p className="mt-2">The click domain for this application is adcliqx.com, including www.adcliqx.com. Clicks, smart links (/s/), and postbacks (/pb/) use that same host. The app is also reachable on trackier-admexo.vercel.app because that is where it is hosted. No other click domain is configured. HTTPS is required. The live response sends Strict-Transport-Security. Click redirects send Cache-Control: no-store.</p>

      <h2 className="mt-8 font-display text-xl">Postback</h2>
      <p className="mt-2">Postbacks are not click URLs. Each advertiser has a token. The advertiser calls:</p>
      <p className="mt-2 font-mono text-[13px] break-all">https://www.adcliqx.com/pb/TOKEN?click_id={"{click_id}"}&txid={"{txid}"}&goal={"{goal}"}&payout={"{payout}"}&revenue={"{revenue}"}&status={"{status}"}</p>
      <p className="mt-2">click_id is the id we added on the landing URL. txid is the advertiser order id. GET or POST both work. JSON and form posts accept the same names. Aliases: clickid, cid, transaction_id, trans_id.</p>

      <h2 className="mt-8 font-display text-xl">API</h2>
      <p className="mt-2">Machine-readable API description: <a href="/api/openapi">/api/openapi</a>.</p>
      <p className="mt-8 text-muted"><Link href="/privacy">Privacy policy</Link> · <Link href="/login">Sign in</Link></p>
    </main>
  );
}
