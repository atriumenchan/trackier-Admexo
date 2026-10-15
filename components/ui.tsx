import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint";
export const th = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-faint whitespace-nowrap";
export const td = "px-3 py-2.5 align-middle border-t border-border text-sm text-ink";
export const btn = "inline-flex items-center justify-center rounded-sm bg-amber px-3 py-2 text-sm font-medium text-white shadow-cta disabled:opacity-60";
export const btnGhost = "inline-flex items-center justify-center rounded-sm border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-border-strong";
export const btnDanger = "inline-flex items-center justify-center rounded-sm border border-coral/30 bg-coral-dim px-3 py-2 text-sm font-medium text-coral";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[1.7rem] leading-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-sm px-3 py-2 text-sm ${error ? "bg-coral-dim text-coral" : "bg-teal-dim text-teal"}`}>
      {error || ok}
    </p>
  );
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card p-4 sm:p-5">
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-ink">{title}</h2>
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
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ label, name, defaultValue, type = "text", required, hint, placeholder }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string; placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input className={inputClass} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue ?? ""} />
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

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "ok" | "warn" | "bad" | "neutral" }) {
  const tones = { ok: "bg-teal-dim text-teal", warn: "bg-amber-dim text-amber", bad: "bg-coral-dim text-coral", neutral: "bg-surface-2 text-muted" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function toneFor(status: string): "ok" | "warn" | "bad" | "neutral" {
  if (["active", "approved", "paid", "sent", "public", "ok"].includes(status)) return "ok";
  if (["pending", "approval"].includes(status)) return "warn";
  if (["blocked", "rejected", "failed", "paused", "error"].includes(status)) return "bad";
  return "neutral";
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-xl text-ink">{value}</p>
      {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
