"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type NavGroup = { label: string; items: { href: string; label: string }[] };

export function Shell({ user, groups, children }: { user: { name: string; email: string }; groups: NavGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="no-print border-b border-border bg-page md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:block">
          <div>
            <p className="font-display text-lg leading-none text-ink">ADMEXO Track</p>
            <p className="mt-1 text-[12px] text-muted">Performance desk</p>
          </div>
          <div className="flex items-center gap-3">
            <Clock />
            <form action="/api/logout" method="post" className="md:hidden">
              <button className="text-sm text-muted">Sign out</button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-4 md:px-3 md:pb-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 hidden px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-faint md:block">{group.label}</p>
              <div className="flex gap-1 md:block md:space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/dashboard" || item.href === "/portal" || item.href === "/brand"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm ${active ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:text-ink"}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <form action="/api/logout" method="post" className="hidden border-t border-border px-3 py-3 md:block">
          <p className="truncate px-2 text-[12px] text-muted">{user.name}</p>
          <p className="truncate px-2 text-[11px] text-faint">{user.email}</p>
          <button className="mt-2 px-2 text-left text-sm text-muted hover:text-ink">Sign out</button>
        </form>
      </aside>
      <div className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">{children}</div>
      </div>
    </div>
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
  return <p className="font-mono text-[13px] text-ink">{time || "--:--"} IST</p>;
}
