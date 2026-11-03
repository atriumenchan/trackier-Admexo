import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

const control =
  "w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink shadow-[0_1px_0_rgba(14,23,38,0.02)] outline-none transition placeholder:text-faint hover:border-border-strong focus:border-brand focus:ring-3 focus:ring-brand-dim disabled:bg-surface-2 disabled:text-faint";

export const inputClass = control;
export const th = "px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-faint whitespace-nowrap";
export const td = "px-3.5 py-3 align-middle border-t border-border text-[13.5px] text-ink";

const base = "inline-flex !cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition disabled:!cursor-not-allowed disabled:opacity-55";
export const btn = `${base} bg-brand px-3.5 py-2 text-white shadow-cta hover:bg-brand-hover active:translate-y-px`;
export const btnGhost = `${base} border border-border bg-surface px-3.5 py-2 text-ink shadow-card hover:border-border-strong hover:bg-surface-2`;
export const btnDanger = `${base} border border-danger/25 bg-danger-dim px-3.5 py-2 text-danger hover:border-danger/45`;
export const btnQuiet = `${base} px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-ink`;
export const btnSm = "!px-2.5 !py-1.5 !text-[13px]";
export const linkClass = "font-medium text-brand hover:text-brand-hover";

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.6rem] font-semibold leading-tight text-ink">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`sticky top-16 z-20 mb-5 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm shadow-card ${error ? "border-danger/25 bg-[#fff6f6] text-danger" : "border-success/25 bg-[#f2fbf7] text-success"}`}
    >
      <Icon name={error ? "shield" : "check"} size={17} className="mt-0.5 shrink-0" />
      <span>{error || ok}</span>
    </div>
  );
}

export function Card({ title, action, children, description, padded = true }: { title?: string; action?: ReactNode; children: ReactNode; description?: string; padded?: boolean }) {
  return (
    <section className={`surface-card ${padded ? "p-5" : ""}`}>
      {title ? (
        <div className={`flex items-start justify-between gap-3 ${padded ? "mb-4" : "border-b border-border px-5 py-4"}`}>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] leading-snug text-faint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ label, name, defaultValue, type = "text", required, hint, placeholder }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string; placeholder?: string;
}) {
  return (
    <Field label={required ? `${label} *` : label} hint={hint}>
      <input className={inputClass} name={name} type={type} step={type === "number" ? "any" : undefined} required={required} placeholder={placeholder} defaultValue={defaultValue ?? ""} />
    </Field>
  );
}

export function SelectInput({ label, name, defaultValue, children, hint }: {
  label: string; name: string; defaultValue?: string; children: ReactNode; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select className={inputClass} name={name} defaultValue={defaultValue}>{children}</select>
    </Field>
  );
}

export function SearchInput({ name = "q", defaultValue, placeholder = "Search" }: { name?: string; defaultValue?: string; placeholder?: string }) {
  return (
    <span className="relative block">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input className={`${inputClass} pl-9`} name={name} type="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} />
    </span>
  );
}

type Tone = "ok" | "warn" | "bad" | "neutral" | "info";

const TONES: Record<Tone, string> = {
  ok: "bg-success-dim text-success",
  warn: "bg-warning-dim text-warning",
  bad: "bg-danger-dim text-danger",
  info: "bg-brand-dim text-brand",
  neutral: "bg-surface-2 text-muted",
};

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[11.5px] font-medium capitalize ${TONES[tone]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

export const Badge = Pill;

export function toneFor(status: string): Tone {
  if (["active", "approved", "paid", "sent", "public", "ok", "valid", "delivered"].includes(status)) return "ok";
  if (["pending", "approval", "flagged"].includes(status)) return "warn";
  if (["blocked", "rejected", "failed", "paused", "error", "reversed"].includes(status)) return "bad";
  return "neutral";
}

export function Stat({ label, value, hint, icon, tone = "brand" }: { label: string; value: string; hint?: string; icon?: IconName; tone?: "brand" | "success" | "warning" | "danger" }) {
  const tones = { brand: "bg-brand-dim text-brand", success: "bg-success-dim text-success", warning: "bg-warning-dim text-warning", danger: "bg-danger-dim text-danger" };
  return (
    <div className="surface-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        {icon ? <span className={`grid size-7 place-items-center rounded-sm ${tones[tone]}`}><Icon name={icon} size={15} /></span> : null}
      </div>
      <p className="mt-1.5 text-[1.45rem] font-semibold leading-tight tracking-tight text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function EmptyState({ title, children, action, icon = "inbox" }: { title: string; children?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-md bg-surface-2 text-faint"><Icon name={icon} size={20} /></span>
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-sm text-[13px] text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TableCard({ children, toolbar, footer }: { children: ReactNode; toolbar?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="surface-card overflow-hidden">
      {toolbar ? <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">{children}</div>
      {footer ? <div className="border-t border-border px-4 py-3 text-[13px] text-muted">{footer}</div> : null}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="surface-card mb-4 p-3"><div className="grid gap-2">{children}</div></div>;
}

export function Pager({ page, hasNext, prevHref, nextHref, label }: { page: number; hasNext: boolean; prevHref: string; nextHref: string; label?: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-muted">
      <span>{label || `Page ${page}`}</span>
      <span className="flex gap-2">
        {page > 1 ? <Link className={`${btnGhost} ${btnSm}`} href={prevHref}>Previous</Link> : <span className={`${btnGhost} ${btnSm} pointer-events-none opacity-50`}>Previous</span>}
        {hasNext ? <Link className={`${btnGhost} ${btnSm}`} href={nextHref}>Next</Link> : <span className={`${btnGhost} ${btnSm} pointer-events-none opacity-50`}>Next</span>}
      </span>
    </div>
  );
}

export function Tabs({ items, className = "mb-4" }: { items: { href: string; label: ReactNode; active: boolean }[]; className?: string }) {
  return (
    <div className={`${className} inline-flex flex-wrap gap-1 rounded-md border border-border bg-surface-2 p-1`}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition ${item.active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px] text-ink">{children}</span>;
}
