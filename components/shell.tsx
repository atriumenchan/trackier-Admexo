"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";

export type NavItem = { href: string; label: string; icon?: IconName };
export type NavGroup = { label: string; items: NavItem[] };

const ROOTS = new Set(["/dashboard", "/portal", "/brand"]);

function isActive(pathname: string, href: string) {
  return ROOTS.has(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function crumbsFor(pathname: string, groups: NavGroup[]) {
  let best: { group: string; item: NavItem } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (isActive(pathname, item.href) && (!best || item.href.length > best.item.href.length)) best = { group: group.label, item };
    }
  }
  if (!best) return [{ label: pathname === "/privacy" ? "Privacy" : "Adcliqx" }];
  const rest = pathname.slice(best.item.href.length).split("/").filter(Boolean);
  const tail = rest.length ? [{ label: rest[0] === "new" ? "New" : rest[0] === "detail" ? "Detail" : decodeURIComponent(rest[0]) }] : [];
  return [{ label: best.group }, { label: best.item.label, href: tail.length ? best.item.href : undefined }, ...tail];
}

export function Shell({ user, groups, children, role = "Admin", action }: {
  user: { name: string; email: string };
  groups: NavGroup[];
  children: ReactNode;
  role?: string;
  action?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const crumbs = crumbsFor(pathname, groups);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      {open ? <button aria-label="Close menu" className="fixed inset-0 z-30 bg-night/50 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-night text-night-text transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-night-border px-5">
          <Link href={groups[0]?.items[0]?.href || "/"} className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">Adcliqx</span>
          </Link>
          <span className="rounded-[5px] bg-night-3 px-1.5 py-0.5 text-[10.5px] font-medium text-night-muted">{role}</span>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-night-muted/80">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-night-border px-3 py-3">
          <SideLink item={{ href: "/privacy", label: "Privacy policy", icon: "lock" }} active={pathname === "/privacy"} />
          <form action="/api/logout" method="post">
            <button className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13.5px] text-night-muted transition hover:bg-night-3 hover:text-night-text">
              <Icon name="logout" size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button className="grid size-9 place-items-center rounded-sm border border-border text-muted lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" size={18} />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                {index ? <Icon name="chevronRight" size={14} className="shrink-0 text-faint" /> : null}
                {"href" in crumb && crumb.href ? (
                  <Link href={crumb.href} className="truncate text-muted hover:text-ink">{crumb.label}</Link>
                ) : (
                  <span className={`truncate ${index === crumbs.length - 1 ? "font-medium text-ink" : "text-muted"}`}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Clock />
            {action ? (
              <Link href={action.href} className="hidden items-center gap-1.5 rounded-sm bg-brand px-3 py-1.5 text-[13px] font-medium text-white shadow-cta transition hover:bg-brand-hover sm:inline-flex">
                <Icon name="plus" size={15} />
                {action.label}
              </Link>
            ) : null}
            <UserMenu user={user} role={role} />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  useEffect(() => setPending(false), [pathname]);
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      onClick={() => !active && setPending(true)}
      className={`group flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] transition ${
        active ? "bg-night-3 font-medium text-white" : pending ? "bg-night-2 text-white" : "text-night-muted hover:bg-night-2 hover:text-night-text"
      }`}
    >
      {item.icon ? <Icon name={item.icon} size={17} className={active ? "text-brand-soft" : "text-night-muted group-hover:text-night-text"} /> : null}
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto h-4 w-0.5 rounded-full bg-brand-soft" /> : null}
    </Link>
  );
}

function UserMenu({ user, role }: { user: { name: string; email: string }; role: string }) {
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A";
  return (
    <details className="relative">
      <summary className="flex list-none items-center gap-2 rounded-sm py-1 pl-1 pr-2 transition hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-full bg-brand-dim text-[12px] font-semibold text-brand">{initials}</span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[140px] truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] text-faint">{role}</span>
        </span>
        <Icon name="chevronDown" size={15} className="hidden text-faint md:block" />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-md border border-border bg-surface p-1.5 shadow-pop">
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
          <p className="truncate text-[12px] text-muted">{user.email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link href="/privacy" className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-ink"><Icon name="lock" size={15} />Privacy policy</Link>
        <form action="/api/logout" method="post">
          <button className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] text-danger hover:bg-danger-dim"><Icon name="logout" size={15} />Sign out</button>
        </form>
      </div>
    </details>
  );
}

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="hidden items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-mono text-[12px] text-muted sm:inline-flex" title="India Standard Time">
      <Icon name="clock" size={14} />
      {time || "--:--"} IST
    </span>
  );
}
