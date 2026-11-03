"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { btn } from "@/components/ui";

const Pending = createContext(false);

export function DeskForm({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Pending.Provider value={pending}>
      <form action="/api/desk" method="post" className={className} onSubmit={() => setPending(true)}>
        <input type="hidden" name="_action" value={name} />
        {children}
      </form>
    </Pending.Provider>
  );
}

export function DeskSubmit({ children, className, pendingLabel = "Working…" }: { children: string; className?: string; pendingLabel?: string }) {
  const pending = useContext(Pending);
  return (
    <button className={className || `${btn} relative z-10 min-w-40`} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
