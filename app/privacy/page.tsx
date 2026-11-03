import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-ink">
      <p className="font-display text-3xl">Privacy policy</p>
      <p className="mt-2 text-muted">Adcliqx · adcliqx.com · 2 November 2026</p>
      <p className="mt-6">Adcliqx runs the click tracker at adcliqx.com for ADMEXO. This page describes what that tracker stores when someone opens a tracking link or when an advertiser sends a conversion postback.</p>

      <h2 className="mt-8 font-display text-xl">What a click stores</h2>
      <p className="mt-2">When a browser opens a link on adcliqx.com/t/ or adcliqx.com/s/, we store the click id, the time, the IP address, the user agent, device and operating system, the referrer, country, city and ISP when a lookup returns them, and the parameters on the link. Those parameters can include sub1 to sub10, source, p1, gclid, creative, device, and campaignid. We also store the offer, the affiliate, and the landing URL we redirected to.</p>

      <h2 className="mt-8 font-display text-xl">What a conversion stores</h2>
      <p className="mt-2">When an advertiser calls the postback URL, we store the click id, the advertiser transaction id (txid), goal, status, payout, revenue, and the time. We connect that row to the earlier click.</p>

      <h2 className="mt-8 font-display text-xl">Why we store it</h2>
      <p className="mt-2">The data is used to count clicks and conversions, pay affiliates, block fraud, and produce reports. We do not sell this click data. Desk users who sign in are the advertiser, affiliate, and ADMEXO admin accounts that operate the campaigns.</p>

      <h2 className="mt-8 font-display text-xl">How long and who can see it</h2>
      <p className="mt-2">Click and conversion rows stay in the tracker database until an admin deletes the related records or the account is closed. Signed-in desk users see the rows their role is allowed to see. The tracker is hosted on Vercel and the database is on Supabase. A click redirect itself is not cached.</p>

      <h2 className="mt-8 font-display text-xl">Cookies</h2>
      <p className="mt-2">The tracking redirect does not set a cookie. The desk sets one session cookie, trk_session, after a person signs in.</p>

      <h2 className="mt-8 font-display text-xl">Contact</h2>
      <p className="mt-2">Questions about this policy: admin@admexo.com.</p>
      <p className="mt-8 text-muted"><Link href="/click-tracker">Click tracker details</Link> · <Link href="/login">Sign in</Link></p>
    </main>
  );
}
