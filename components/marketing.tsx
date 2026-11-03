import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";

const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/#features", label: "Features" },
  { href: "/#tracking", label: "Tracking" },
  { href: "/#analytics", label: "Analytics" },
  { href: "/click-tracker", label: "Documentation" },
];

export function MarketingNav({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${dark ? "border-night-border bg-night/80 text-night-text" : "border-border bg-surface/85 text-ink"}`}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Adcliqx home">
          <Logo />
          <span className="text-[16px] font-semibold tracking-tight">Adcliqx</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-sm px-3 py-2 text-[13.5px] transition ${dark ? "text-night-muted hover:text-white" : "text-muted hover:text-ink"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/login" className={`rounded-sm px-3 py-2 text-[13.5px] font-medium transition ${dark ? "text-night-text hover:text-white" : "text-ink hover:text-brand"}`}>Sign in</Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-3.5 py-2 text-[13.5px] font-medium text-white shadow-cta transition hover:bg-brand-hover">
            Access your dashboard
            <Icon name="arrowRight" size={15} />
          </Link>
        </div>
        <details className="relative ml-auto md:hidden">
          <summary className={`grid size-9 list-none place-items-center rounded-sm border [&::-webkit-details-marker]:hidden ${dark ? "border-night-border" : "border-border"}`} aria-label="Menu">
            <Icon name="menu" size={18} />
          </summary>
          <div className="absolute right-0 top-full mt-2 w-60 rounded-md border border-border bg-surface p-2 text-ink shadow-pop">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-sm px-3 py-2 text-[14px] hover:bg-surface-2">{item.label}</Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link href="/login" className="block rounded-sm bg-brand px-3 py-2 text-center text-[14px] font-medium text-white">Sign in</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-night-border bg-night text-night-muted">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-night-text">
            <Logo />
            <span className="text-[16px] font-semibold tracking-tight">Adcliqx</span>
          </Link>
          <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed">Click, conversion and payout tracking for ADMEXO performance campaigns.</p>
        </div>
        <FooterColumn title="Platform" links={[["Features", "/#features"], ["How it works", "/#platform"], ["Tracking", "/#tracking"], ["Analytics", "/#analytics"]]} />
        <FooterColumn title="Resources" links={[["Click tracker documentation", "/click-tracker"], ["Tracker API (OpenAPI)", "/api/openapi"], ["Sign in", "/login"]]} />
        <FooterColumn title="Company" links={[["Privacy policy", "/privacy"], ["admin@admexo.com", "mailto:admin@admexo.com"]]} />
      </div>
      <div className="border-t border-night-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-[12.5px] sm:px-8">
          <span>© {new Date().getFullYear()} Admexo LLP. Adcliqx is an internal ADMEXO platform.</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={13} />HTTPS on every tracking domain</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-night-text">{title}</p>
      <ul className="mt-3 space-y-2 text-[13.5px]">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="transition hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export function SampleTag({ children = "Sample data" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] border border-dashed border-current/40 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] opacity-80">
      {children}
    </span>
  );
}

const SAMPLE_SERIES = [38, 52, 47, 61, 58, 74, 69, 83, 77, 92, 88, 104, 97, 112];
const SAMPLE_CONV = [9, 12, 11, 15, 13, 18, 16, 21, 18, 24, 22, 27, 24, 30];

export function DashboardPreview() {
  const max = Math.max(...SAMPLE_SERIES);
  const maxConv = Math.max(...SAMPLE_CONV);
  const points = SAMPLE_CONV.map((value, index) => `${(index / (SAMPLE_CONV.length - 1)) * 100},${100 - (value / maxConv) * 82}`).join(" ");
  return (
    <div className="relative rounded-[18px] border border-night-border bg-night-2/80 p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
      <div className="overflow-hidden rounded-[12px] border border-border bg-canvas text-ink">
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
          <span className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#ff6159]" /><span className="size-2.5 rounded-full bg-[#ffbd2e]" /><span className="size-2.5 rounded-full bg-[#28c941]" /></span>
          <span className="mx-auto rounded-sm bg-surface-2 px-3 py-0.5 font-mono text-[11px] text-faint">www.adcliqx.com/dashboard</span>
          <span className="text-faint"><SampleTag /></span>
        </div>
        <div className="grid grid-cols-[132px_1fr] max-sm:grid-cols-1">
          <div className="hidden bg-night px-3 py-4 text-[11.5px] text-night-muted sm:block">
            {[["dashboard", "Dashboard"], ["click", "Clicks"], ["target", "Conversions"], ["offer", "Offers"], ["users", "Affiliates"], ["chart", "Reports"], ["shield", "Fraud"]].map(([icon, label], index) => (
              <div key={label} className={`mb-0.5 flex items-center gap-2 rounded-[6px] px-2 py-1.5 ${index === 0 ? "bg-night-3 text-white" : ""}`}>
                <Icon name={icon as "dashboard"} size={13} />
                {label}
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[["Clicks", "1,052"], ["Conversions", "260"], ["Revenue", "$5,240"], ["Profit", "$2,180"]].map(([label, value]) => (
                <div key={label} className="rounded-[8px] border border-border bg-surface px-3 py-2">
                  <p className="text-[10.5px] text-muted">{label}</p>
                  <p className="text-[15px] font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-[8px] border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold">Clicks and conversions</p>
                <p className="text-[10.5px] text-faint">14 days</p>
              </div>
              <div className="relative mt-2 h-28">
                <div className="absolute inset-0 flex items-end gap-[5px]">
                  {SAMPLE_SERIES.map((value, index) => <span key={index} className="flex-1 rounded-t-[3px] bg-brand/85" style={{ height: `${(value / max) * 88}%` }} />)}
                </div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <polyline points={points} fill="none" stroke="var(--success)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>
            <div className="mt-2 overflow-hidden rounded-[8px] border border-border bg-surface">
              {[["Fintech CPA · US", "Affiliate 104", "approved", "$24.00"], ["Gaming CPI · IN", "Affiliate 087", "pending", "$3.20"], ["VPN trial · DE", "Affiliate 104", "approved", "$11.50"]].map(([offer, aff, status, payout]) => (
                <div key={offer} className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11.5px] first:border-t-0">
                  <span className="min-w-0 flex-1 truncate font-medium">{offer}</span>
                  <span className="hidden text-muted sm:inline">{aff}</span>
                  <span className={`rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium ${status === "approved" ? "bg-success-dim text-success" : "bg-warning-dim text-warning"}`}>{status}</span>
                  <span className="w-14 text-right font-medium tabular-nums">{payout}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicPage({ title, eyebrow, intro, children }: { title: string; eyebrow?: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingNav tone="light" />
      <div className="border-b border-border bg-canvas">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
          {eyebrow ? <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand">{eyebrow}</p> : null}
          <h1 className="mt-2 text-[2.2rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.6rem]">{title}</h1>
          {intro ? <div className="mt-3 text-[15px] leading-relaxed text-muted">{intro}</div> : null}
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-5 py-12 text-[15px] leading-relaxed text-ink sm:px-8 [&_a]:font-medium [&_a]:text-brand [&_code]:rounded-[5px] [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-10 [&_h2]:text-[1.25rem] [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:mt-1.5 [&_p]:mt-3 [&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-night [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:text-night-text [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
