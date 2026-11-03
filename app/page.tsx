import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, homeFor } from "@/lib/auth";
import { btn, btnGhost } from "@/components/ui";

export const metadata: Metadata = {
  title: "Adcliqx · ADMEXO click tracking",
  description: "Adcliqx is the internal click and conversion tracker ADMEXO uses for its affiliate campaigns.",
};
export const dynamic = "force-dynamic";

const FEATURES = [
  ["Click tracking", "Every tracking link records the click id, time, IP, device, country and sub parameters, then redirects with a direct HTTPS 302."],
  ["Conversions and postbacks", "Advertisers confirm conversions by postback. Each one is matched to its click, checked for duplicates, and passed on to the affiliate."],
  ["Reports", "Clicks, conversions, revenue and payout by day, offer, affiliate, country or device, with every row open down to the single click."],
  ["Fraud checks", "Bot user agents, click bursts from one IP and blocked IPs are flagged or rejected before they reach the advertiser."],
];

export default async function Home() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8 text-ink">
      <header className="flex items-center justify-between">
        <p className="font-display text-xl">Adcliqx</p>
        <Link className={btnGhost} href="/login">Sign in</Link>
      </header>

      <section className="py-16 sm:py-24">
        <p className="text-sm text-muted">ADMEXO · internal tool</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">The click and conversion tracker behind ADMEXO campaigns.</h1>
        <p className="mt-4 max-w-xl text-muted">
          Adcliqx tracks clicks on adcliqx.com links, records conversions from advertiser postbacks, and pays affiliates from the same numbers.
          Access is limited to the ADMEXO team, its advertisers and its affiliates.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={btn} href="/login">Sign in to the desk</Link>
          <Link className={btnGhost} href="/click-tracker">How the tracker works</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="surface-card p-5">
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-16 text-[13px] text-muted">
        <span>© {new Date().getFullYear()} Admexo LLP</span>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/click-tracker">Click tracker details</Link>
        <a href="mailto:admin@admexo.com">admin@admexo.com</a>
      </footer>
    </main>
  );
}
