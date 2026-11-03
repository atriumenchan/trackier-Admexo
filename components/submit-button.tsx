"use client";

import { useFormStatus } from "react-dom";
import { btn } from "@/components/ui";

export function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${btn} relative z-10 min-w-40`} type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
