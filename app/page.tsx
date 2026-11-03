import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser, homeFor } from "@/lib/auth";
import { Icon, type IconName } from "@/components/icons";
import { DashboardPreview, MarketingFooter, MarketingNav, SampleTag } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Adcliqx · Click, conversion and payout tracking",
  description: "Adcliqx gives performance marketing teams complete visibility into clicks, conversions, attribution and affiliate payouts from one tracking platform.",
};
export const dynamic = "force-dynamic";

const CAPABILITIES: [IconName, string, string][] = [
  ["click", "Click tracking", "#tracking"],
  ["target", "Conversion attribution", "#attribution"],
  ["postback", "Advertiser postbacks", "#attribution"],
  ["users", "Affiliate management", "#payouts"],
  ["wallet", "Revenue and payouts", "#payouts"],
  ["activity", "Real-time analytics", "#analytics"],
  ["shield", "Fraud detection", "#security"],
  ["chart", "Performance reports", "#analytics"],
];

const STEPS: [IconName, string, string][] = [
  ["link", "Affiliate gets a link", "Each affiliate gets its own adcliqx.com/t/ link for an approved offer, with sub1 to sub10 for their own tracking."],
  ["click", "A user clicks", "The browser opens the link. Adcliqx checks the offer status, caps, schedule, targeting and fraud rules."],
  ["zap", "Click recorded, visitor redirected", "A unique click id is stored with IP, device and geo, then the visitor is sent on with a direct HTTPS 302."],
  ["postback", "Advertiser sends a postback", "When the user converts, the advertiser calls its postback URL by GET or POST with the click id and transaction id."],
  ["target", "Conversion attributed", "Adcliqx matches the click, blocks repeat transaction ids, applies the goal payout and sets the status."],
  ["wallet", "Affiliate and payout updated", "Reports, the affiliate's portal and the payout ledger update, and the affiliate's own postback fires."],
];

const FAQ: [string, string][] = [
  ["Who can use Adcliqx?", "Adcliqx is invite-only. Our team runs the full desk. Affiliates sign in to a portal with their offers, conversions and postback settings. Advertisers sign in to an overview of their own offers. There is no public sign-up."],
  ["How are conversions matched to clicks?", "Every click gets a unique click id that is passed to the advertiser in the landing URL. The advertiser returns it in the postback, and Adcliqx joins the conversion to that click, its affiliate and its offer."],
  ["What stops the same conversion being paid twice?", "A transaction id can only be recorded once per offer. A repeated postback with the same txid is logged and answered, but it does not create a second conversion."],
  ["Does Adcliqx work with Google Ads?", "Tracking links redirect with a direct HTTPS 302, support a redirection_url parameter and do not cache the redirect. The tracker's technical details are published on the click tracker documentation page."],
  ["Where is the data stored?", "The application runs on Vercel and the database on Supabase. The privacy policy lists exactly what a click and a conversion store."],
];

export default async function Home() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <div className="bg-surface text-ink">
      <div className="relative overflow-hidden bg-night text-night-text">
        <div className="grid-backdrop pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />
        <MarketingNav />
        <section className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-16 sm:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-night-border bg-night-2/70 px-3 py-1 text-[12.5px] text-night-muted">
              <span className="size-1.5 rounded-full bg-success" />
              Performance tracking platform
            </p>
            <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-[3.6rem]">
              Every click. Every conversion.<br className="hidden sm:block" /> Every payout. <span className="text-brand-soft">Under control.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-relaxed text-night-muted">
              Adcliqx gives performance marketing teams complete visibility into clicks, conversions, attribution and affiliate payouts, all from one tracking platform.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-3 text-[14.5px] font-medium text-white shadow-cta transition hover:bg-brand-hover">
                Access your dashboard
                <Icon name="arrowRight" size={16} />
              </Link>
              <Link href="#platform" className="inline-flex items-center gap-2 rounded-sm border border-night-border bg-night-2/60 px-5 py-3 text-[14.5px] font-medium text-night-text transition hover:border-white/20 hover:text-white">
                Explore the platform
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            <DashboardPreview />
            <p className="mt-3 text-center text-[12px] text-night-muted">Product preview with sample figures. Live numbers are only visible inside the signed-in desk.</p>
          </div>
        </section>
      </div>

      <section className="border-b border-border bg-surface" aria-label="Capabilities">
        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
          <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
            {CAPABILITIES.map(([icon, label, href]) => (
              <li key={label}>
                <Link href={href} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-muted transition hover:text-brand">
                  <Icon name={icon} size={16} className="text-brand" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div id="features">
        <Showcase
          id="tracking"
          eyebrow="Click tracking"
          title="Every hit on a tracking link, recorded before the redirect."
          body="Adcliqx stores a unique click id with the time, IP, device, operating system, country, city, ISP, referrer and every sub parameter, then sends the visitor on with a direct HTTPS 302. Smart links rotate one link across several offers by weight."
          points={["Unique click id on every hit", "sub1 to sub10, source, GCLID and ValueTrack parameters", "Daily click caps, schedules and country targeting per offer", "Smart links with weighted offer rotation"]}
          visual={<ClickLogVisual />}
        />
        <Showcase
          id="attribution"
          flip
          eyebrow="Postbacks and attribution"
          title="Advertiser postbacks matched to the exact click."
          body="Each advertiser gets a private postback URL. Adcliqx accepts it by GET or POST, finds the original click, applies the goal payout, blocks repeat transaction ids, and passes the conversion on to the affiliate's own postback."
          points={["GET and POST postbacks with a per-advertiser token", "Goal-level payout and revenue", "One conversion per transaction id per offer", "Every postback logged with its response"]}
          visual={<PostbackVisual />}
        />
        <Showcase
          id="payouts"
          eyebrow="Affiliates, revenue and payouts"
          title="Partners, payouts and margin in one ledger."
          body="Manage advertisers and affiliates, approve offer access, set custom payouts per affiliate, and build payout batches from approved conversions. Rejected and reversed conversions never reach a payout."
          points={["Advertiser and affiliate accounts with their own sign-in", "Offer access approval and custom affiliate payouts", "Payout batches from approved conversions only", "Revenue, payout and profit on every report row"]}
          visual={<PayoutVisual />}
        />
        <Showcase
          id="analytics"
          flip
          eyebrow="Analytics and reports"
          title="Real-time reports you can open down to a single click."
          body="Group results by hour, day, month, offer, affiliate, advertiser, goal, country, device, OS or source. Click any row to see the clicks and conversions behind it, then open one click to see everything recorded about it."
          points={["Eleven ways to group, four filters, quick date ranges", "Totals, CR and EPC on every report", "Drill down from any row to the raw clicks and conversions", "CSV exports that follow the filters on screen"]}
          visual={<ReportVisual />}
        />
      </div>

      <section id="platform" className="border-y border-border bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="How it works" title="From tracking link to affiliate payout in six steps." body="The same path runs for every offer, so every number in a report can be traced back to a real click." />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([icon, title, body], index) => (
              <li key={title} className="relative bg-surface p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md bg-brand-dim text-brand"><Icon name={icon} size={19} /></span>
                  <span className="font-mono text-[12px] text-faint">Step {index + 1}</span>
                </div>
                <h3 className="mt-4 text-[15.5px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
          <FlowStrip />
        </div>
      </section>

      <section id="security" className="bg-night text-night-text">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-soft">Security and fraud prevention</p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight text-white">Suspicious traffic is flagged before it costs anything.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-night-muted">
              Fraud rules run on every click and every conversion. Each rule can flag, reject or pause, and flagged traffic is kept out of report totals so payouts are based on clean numbers.
            </p>
            <Link href="/click-tracker" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-soft hover:text-white">Read the tracker documentation <Icon name="arrowRight" size={15} /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["shield", "Bot and crawler user agents", "Known bot, spider, crawler and headless agents are caught on the click."],
              ["activity", "Click bursts from one IP", "Too many clicks from one IP on one offer inside a time window."],
              ["lock", "Blocked IP list", "IPs on the block list never reach the advertiser."],
              ["target", "Conversion rate anomalies", "An optional rule flags or rejects conversions when an affiliate's conversion rate on an offer runs too high."],
              ["check", "Duplicate transaction ids", "A txid is recorded once per offer, however many times it is sent."],
              ["globe", "HTTPS and no-cache redirects", "Every redirect is HTTPS with HSTS, no caching and no referrer leak."],
            ].map(([icon, title, body]) => (
              <li key={title} className="rounded-md border border-night-border bg-night-2 p-4">
                <Icon name={icon as IconName} size={18} className="text-brand-soft" />
                <p className="mt-3 text-[14px] font-semibold text-white">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-night-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="Platform overview" title="One platform, three ways in." body="Each role signs in to its own workspace and sees only its own data." />
          <div className="mt-10 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead className="bg-surface-2 text-[12px] uppercase tracking-[0.06em] text-faint">
                <tr><th className="px-5 py-3 font-semibold">Capability</th><th className="px-5 py-3 font-semibold">Our team</th><th className="px-5 py-3 font-semibold">Affiliates</th><th className="px-5 py-3 font-semibold">Advertisers</th></tr>
              </thead>
              <tbody>
                {[
                  ["Offers and tracking links", "Create and manage", "Browse and request access", "Their own offers"],
                  ["Clicks and conversions", "Every row, every field", "Their own conversions", "Totals for their offers"],
                  ["Postbacks", "Advertiser and affiliate logs", "Set their own postback URL", "Private postback URL"],
                  ["Reports and exports", "All reports and CSVs", "Their own results", "Their own results"],
                  ["Fraud rules and payouts", "Full control", "—", "—"],
                ].map(([cap, admin, aff, adv]) => (
                  <tr key={cap} className="border-t border-border">
                    <td className="px-5 py-3.5 font-medium">{cap}</td>
                    <td className="px-5 py-3.5 text-muted">{admin}</td>
                    <td className="px-5 py-3.5 text-muted">{aff}</td>
                    <td className="px-5 py-3.5 text-muted">{adv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-canvas">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading align="left" eyebrow="FAQ" title="Questions about Adcliqx" body="Anything else: marketing@adcliqx.com." />
          <div className="divide-y divide-border rounded-lg border border-border bg-surface">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group px-5 py-4">
                <summary className="flex list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                  {question}
                  <Icon name="plus" size={17} className="shrink-0 text-faint transition group-open:rotate-45" />
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
          <div className="relative overflow-hidden rounded-[20px] bg-night px-8 py-12 text-center text-night-text sm:px-12">
            <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
            <h2 className="relative text-[1.9rem] font-semibold tracking-tight text-white">Your campaigns are already being tracked.</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-night-muted">Sign in to see today&apos;s clicks, conversions and payouts.</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-3 text-[14.5px] font-medium text-white shadow-cta hover:bg-brand-hover">Access your dashboard <Icon name="arrowRight" size={16} /></Link>
              <Link href="/click-tracker" className="inline-flex items-center gap-2 rounded-sm border border-night-border px-5 py-3 text-[14.5px] font-medium text-night-text hover:text-white">Documentation</Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function SectionHeading({ eyebrow, title, body, align = "center" }: { eyebrow: string; title: string; body?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight">{title}</h2>
      {body ? <p className="mt-3 text-[15px] leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

function Showcase({ id, eyebrow, title, body, points, visual, flip }: { id: string; eyebrow: string; title: string; body: string; points: string[]; visual: ReactNode; flip?: boolean }) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-border">
      <div className={`mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand">{eyebrow}</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight">{title}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{body}</p>
          <ul className="mt-6 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[14px]">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-dim text-success"><Icon name="check" size={12} strokeWidth={2.4} /></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div>{visual}</div>
      </div>
    </section>
  );
}

function VisualFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-canvas p-2 shadow-pop">
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[12.5px] font-semibold">{title}</p>
          <span className="text-faint"><SampleTag /></span>
        </div>
        {children}
      </div>
    </div>
  );
}

function ClickLogVisual() {
  const rows = [
    ["14:02:11", "k7f2q9xd", "US", "mobile", "valid"],
    ["14:02:09", "p3m8a1rt", "IN", "desktop", "valid"],
    ["14:01:58", "b9c4z2we", "DE", "mobile", "flagged"],
    ["14:01:44", "x1t6n0kq", "GB", "desktop", "valid"],
    ["14:01:30", "r5y2h8vm", "US", "tablet", "blocked"],
  ];
  return (
    <VisualFrame title="Clicks · live">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-2 text-[10.5px] uppercase tracking-[0.06em] text-faint"><tr><th className="px-4 py-2 text-left font-semibold">Time</th><th className="px-4 py-2 text-left font-semibold">Click id</th><th className="px-4 py-2 text-left font-semibold">Geo</th><th className="px-4 py-2 text-left font-semibold">Device</th><th className="px-4 py-2 text-left font-semibold">State</th></tr></thead>
        <tbody>
          {rows.map(([time, id, geo, device, state]) => (
            <tr key={id} className="border-t border-border">
              <td className="px-4 py-2.5 font-mono text-muted">{time}</td>
              <td className="px-4 py-2.5 font-mono text-brand">{id}</td>
              <td className="px-4 py-2.5">{geo}</td>
              <td className="px-4 py-2.5 text-muted">{device}</td>
              <td className="px-4 py-2.5"><span className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-medium ${state === "valid" ? "bg-success-dim text-success" : state === "flagged" ? "bg-warning-dim text-warning" : "bg-danger-dim text-danger"}`}>{state}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border bg-night px-4 py-3 font-mono text-[11.5px] leading-relaxed text-night-muted">
        <span className="text-success">GET</span> /t/kq82mx?sub1=spring<br />
        <span className="text-brand-soft">302</span> Location: https://advertiser.example/lp?click_id=k7f2q9xd
      </div>
    </VisualFrame>
  );
}

function PostbackVisual() {
  return (
    <VisualFrame title="Postback log">
      <div className="space-y-3 p-4">
        <div className="rounded-md bg-night p-3.5 font-mono text-[11.5px] leading-relaxed text-night-muted">
          <span className="text-success">POST</span> /pb/adv_9x2…?click_id=k7f2q9xd<br />
          &nbsp;&nbsp;&amp;txid=ORD-88213&amp;goal=deposit&amp;revenue=40
        </div>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-[12.5px]">
          {[["Click found", "k7f2q9xd · Affiliate 104 · Fintech CPA"], ["Goal", "deposit · payout $24.00"], ["txid", "ORD-88213 · first time seen"], ["Affiliate postback", "200 OK"]].map(([label, value]) => (
            <div key={label} className="contents">
              <span className="grid size-5 place-items-center rounded-full bg-success-dim text-success"><Icon name="check" size={11} strokeWidth={2.4} /></span>
              <span><span className="font-medium">{label}</span> <span className="text-muted">· {value}</span></span>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-dashed border-border-strong px-3 py-2 text-[12px] text-muted">
          Same txid sent again → <span className="font-medium text-ink">logged, not counted twice</span>
        </div>
      </div>
    </VisualFrame>
  );
}

function PayoutVisual() {
  const rows = [["Affiliate 104", "182", "$4,368.00", "approved"], ["Affiliate 087", "64", "$1,212.80", "approved"], ["Affiliate 131", "9", "$96.00", "pending"]];
  return (
    <VisualFrame title="Payout batch · October">
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
        {[["Revenue", "$9,840"], ["Payout", "$5,676"], ["Profit", "$4,164"]].map(([label, value]) => (
          <div key={label} className="px-3 py-3"><p className="text-[11px] text-muted">{label}</p><p className="text-[16px] font-semibold tabular-nums">{value}</p></div>
        ))}
      </div>
      {rows.map(([aff, conv, amount, status]) => (
        <div key={aff} className="flex items-center gap-3 border-t border-border px-4 py-3 text-[12.5px] first:border-t-0">
          <span className="grid size-7 place-items-center rounded-full bg-brand-dim text-[10.5px] font-semibold text-brand">{aff.slice(-3)}</span>
          <span className="flex-1 font-medium">{aff}</span>
          <span className="text-muted">{conv} conv.</span>
          <span className="w-20 text-right font-semibold tabular-nums">{amount}</span>
          <span className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-medium ${status === "approved" ? "bg-success-dim text-success" : "bg-warning-dim text-warning"}`}>{status}</span>
        </div>
      ))}
    </VisualFrame>
  );
}

function ReportVisual() {
  const rows = [["Fintech CPA", 4210, 312, "$7,488"], ["Gaming CPI", 2960, 401, "$1,283"], ["VPN trial", 1388, 96, "$1,104"]];
  return (
    <VisualFrame title="Report · by offer">
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5 text-[11.5px]">
        {["Last 7 days", "All affiliates", "Country: US", "Group: offer"].map((chip, index) => (
          <span key={chip} className={`rounded-[6px] border px-2 py-0.5 ${index === 3 ? "border-brand/30 bg-brand-dim text-brand" : "border-border text-muted"}`}>{chip}</span>
        ))}
      </div>
      <table className="w-full text-[12px]">
        <thead className="bg-surface-2 text-[10.5px] uppercase tracking-[0.06em] text-faint"><tr><th className="px-4 py-2 text-left font-semibold">Offer</th><th className="px-4 py-2 text-right font-semibold">Clicks</th><th className="px-4 py-2 text-right font-semibold">CR</th><th className="px-4 py-2 text-right font-semibold">Revenue</th></tr></thead>
        <tbody>
          {rows.map(([offer, clicks, conv, revenue]) => (
            <tr key={offer as string} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium text-brand">{offer} ›</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{(clicks as number).toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted">{(((conv as number) / (clicks as number)) * 100).toFixed(1)}%</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border bg-surface-2 px-4 py-2.5 text-[11.5px] text-muted">Click a row → every click and conversion behind it</div>
    </VisualFrame>
  );
}

function FlowStrip() {
  const nodes = ["Affiliate", "adcliqx.com/t/", "Advertiser", "adcliqx.com/pb/", "Reports & payout"];
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[12.5px]" aria-hidden="true">
      {nodes.map((node, index) => (
        <span key={node} className="flex items-center gap-2">
          <span className={`rounded-sm border px-3 py-1.5 font-medium ${index % 2 ? "border-brand/30 bg-brand-dim font-mono text-brand" : "border-border bg-surface text-ink"}`}>{node}</span>
          {index < nodes.length - 1 ? <Icon name="arrowRight" size={15} className="text-faint" /> : null}
        </span>
      ))}
    </div>
  );
}
