import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/marketing";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={<p>Adcliqx · adcliqx.com · Effective 3 November 2026</p>}
    >
      <p>These terms apply to anyone who signs in to Adcliqx or uses its tracking links, smart links, postback URLs or API (together, the &quot;Service&quot;). Adcliqx is a product of Admexo LLC (&quot;we&quot;, &quot;us&quot;). By using the Service you agree to these terms. If you use it for a company, you confirm you may accept them for that company.</p>

      <h2>1. Who can use Adcliqx</h2>
      <p>Adcliqx is invite-only. There is no public sign-up. Accounts are created by our team for three roles:</p>
      <ul>
        <li><strong>Admins</strong> run offers, advertisers, affiliates, reports, fraud rules and payouts.</li>
        <li><strong>Affiliates</strong> (publishers) see the offers opened to them, their own click counts, conversions, flagged traffic, balance and statements, and set their own postback URL.</li>
        <li><strong>Advertisers</strong> see their own offers, flagged traffic on those offers, pending conversions and their postback URL.</li>
      </ul>
      <p>Each person keeps their login and API token private and is responsible for activity on their account. Tell us straight away at <a href="mailto:marketing@adcliqx.com">marketing@adcliqx.com</a> if you think an account or token has been misused. We may rotate tokens or suspend access to protect the Service.</p>

      <h2>2. What the Service does</h2>
      <p>Adcliqx records clicks on tracking links, redirects each click to the landing page saved on the offer, receives conversion postbacks from advertisers, matches them to the original click, calculates payouts, runs fraud checks and produces reports. How it works in detail is described in the <Link href="/click-tracker">click tracker documentation</Link>.</p>

      <h2>3. Transparent click tracking</h2>
      <p>Adcliqx is a redirect tracker. For Google Ads and other ad platforms it:</p>
      <ul>
        <li>sends the visitor with an HTTP redirect to the landing page saved on the offer, or, in Google mode, to the final URL passed by Google in <code>redirection_url</code>;</li>
        <li>does not show its own content, ads or interstitial pages to the visitor and does not change the landing page;</li>
        <li>does not cloak, meaning it does not send ad reviewers or crawlers to a different destination than real visitors;</li>
        <li>rejects invalid targets, private network addresses and uncertified nested trackers, and can require the landing host to match the offer&apos;s final URL;</li>
        <li>serves every tracking link over HTTPS.</li>
      </ul>
      <p>Advertisers are responsible for making sure their landing pages and ads follow the policies of the ad platforms they use, including the Google Ads policies and the guidelines for third-party click tracking.</p>

      <h2>4. Your responsibilities</h2>
      <p>You agree not to:</p>
      <ul>
        <li>send fake, automated, incentivised (unless the offer allows it) or otherwise invalid clicks or conversions;</li>
        <li>use bots, click farms, proxies or scripts to inflate clicks or conversions, or fire postbacks for conversions that did not happen;</li>
        <li>use cookie stuffing, forced clicks, ad injection, misleading ads or brand bidding that an offer does not allow;</li>
        <li>promote illegal products, malware, phishing, or content that breaks an ad platform&apos;s policies;</li>
        <li>try to break, overload, scan or reverse-engineer the Service, or reach data that belongs to another account;</li>
        <li>use tracking links to redirect visitors anywhere other than the destination set on the offer.</li>
      </ul>
      <p>Affiliates must follow the traffic rules of each offer (allowed countries, devices, schedules, caps). Advertisers must only send postbacks for real, attributable conversions and must send the correct click id and transaction id.</p>

      <h2>5. Fraud checks and invalid traffic</h2>
      <p>Every click and conversion is checked automatically. Current checks include bot and crawler user agents, too many clicks from one IP in a short window, a blocked IP list, unusual conversion rates, click expiry (attribution window), unknown click ids and repeated transaction ids.</p>
      <ul>
        <li>Traffic caught by a check is still recorded, marked as flagged with the reason, and shown to the affiliate and advertiser concerned.</li>
        <li>Flagged clicks are not counted in reports and earn nothing. Depending on the rule, the click is sent away instead of to the landing page.</li>
        <li>Conversions on flagged clicks are rejected automatically with the reason shown.</li>
        <li>We may also reject or reverse a conversion after review, and pause an affiliate whose traffic keeps breaking these terms.</li>
      </ul>
      <p>Our records of clicks, conversions and fraud results are used to settle any dispute about counts or payouts.</p>

      <h2>6. Conversions and payouts</h2>
      <ul>
        <li>Only approved conversions are payable. Pending conversions wait for a decision; rejected and reversed conversions earn nothing.</li>
        <li>A transaction id is counted once per offer, and a click can convert once per goal.</li>
        <li>Payout amounts come from the offer, or from a custom payout set for the affiliate on that offer.</li>
        <li>Payouts are grouped into statements. A conversion reversed before its statement is paid is taken off that statement.</li>
        <li>Payment terms, currencies, minimums and dates are set in the separate agreement between Admexo LLC and each affiliate or advertiser. If that agreement conflicts with these terms on money, the agreement wins.</li>
      </ul>

      <h2>7. Data and privacy</h2>
      <p>What a click and a conversion store, why, and who can see it is described in our <Link href="/privacy">Privacy Policy</Link>. Each role only sees the data its role allows. Advertisers and affiliates are responsible for having the right notices and consents on their own sites and ads for the tracking they ask us to run.</p>

      <h2>8. Availability and changes</h2>
      <p>We work to keep tracking links, postbacks and the desk available, but the Service is provided &quot;as is&quot; and we do not promise it will never be interrupted or error-free. We may change, add or remove features. If a change affects how clicks, conversions or payouts are counted, we will tell active users before it applies.</p>

      <h2>9. Ownership</h2>
      <p>Adcliqx, its software, design and documentation belong to Admexo LLC. You keep ownership of your offers, creatives and the data you send us, and you allow us to use that data to run the Service for you.</p>

      <h2>10. Limitation of liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential losses, lost profits or lost data that come from using or not being able to use the Service, including losses caused by third-party ad platforms, advertiser postbacks or landing pages we do not control. Our total liability for any claim is limited to the amounts paid to us for the Service in the three months before the claim.</p>

      <h2>11. Suspension and ending access</h2>
      <p>You can stop using the Service at any time. We may suspend or close an account that breaks these terms, sends invalid traffic, or puts the Service or other users at risk. Approved conversions earned before closing are settled under the payout agreement, minus anything rejected or reversed for fraud.</p>

      <h2>12. Changes to these terms</h2>
      <p>We may update these terms. The date at the top shows when they last changed. Continuing to use the Service after a change means you accept the updated terms.</p>

      <h2>13. Contact</h2>
      <p>Questions about these terms: <a href="mailto:marketing@adcliqx.com">marketing@adcliqx.com</a>.</p>
    </PublicPage>
  );
}
