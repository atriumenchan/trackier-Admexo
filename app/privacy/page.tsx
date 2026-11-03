import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Legal"
      title="Privacy policy"
      intro={<p>Adcliqx · adcliqx.com · 2 November 2026</p>}
    >
      <p>Adcliqx runs the click tracker at adcliqx.com. This page describes what that tracker stores when someone opens a tracking link or when an advertiser sends a conversion postback.</p>

      <h2>What a click stores</h2>
      <p>When a browser opens a link on adcliqx.com/t/ or adcliqx.com/s/, we store the click id, the time, the IP address, the user agent, device and operating system, the referrer, country, city and ISP when a lookup returns them, and the parameters on the link. Those parameters can include sub1 to sub10, source, p1, gclid, creative, device, and campaignid. We also store the offer, the affiliate, and the landing URL we redirected to.</p>

      <h2>What a conversion stores</h2>
      <p>When an advertiser calls the postback URL, we store the click id, the advertiser transaction id (txid), goal, status, payout, revenue, and the time. We connect that row to the earlier click.</p>

      <h2>Why we store it</h2>
      <p>The data is used to count clicks and conversions, pay affiliates, block fraud, and produce reports. We do not sell this click data. Desk users who sign in are the advertiser, affiliate, and Adcliqx admin accounts that operate the campaigns.</p>

      <h2>How long and who can see it</h2>
      <p>Click and conversion rows stay in the tracker database until an admin deletes the related records or the account is closed. Signed-in desk users see the rows their role is allowed to see. The tracker is hosted on Vercel and the database is on Supabase. A click redirect itself is not cached.</p>

      <h2>Cookies</h2>
      <p>The tracking redirect does not set a cookie. The desk sets one session cookie, trk_session, after a person signs in.</p>

      <h2>Contact</h2>
      <p>Questions about this policy: use the contact address in the footer of this page.</p>
    </PublicPage>
  );
}
