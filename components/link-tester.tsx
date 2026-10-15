"use client";

import { useActionState } from "react";
import { runLinkTest } from "@/lib/actions";
import { btn, inputClass } from "@/components/ui";
import type { LinkTestResult } from "@/lib/types";

export function LinkTester({ offers }: { offers: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(runLinkTest, null as LinkTestResult | null);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-muted">URL</span>
        <input className={inputClass} name="url" placeholder="https://advertiser.example/click" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-muted">Or test an offer URL</span>
          <select className={inputClass} name="offer_id" defaultValue="">
            <option value="">None</option>
            {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-muted">Device</span>
          <select className={inputClass} name="device" defaultValue="desktop">
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="pause_if_unhealthy" value="1" />
        Pause the selected offer if the chain is unhealthy
      </label>
      <button className={btn} disabled={pending}>{pending ? "Testing…" : "Test link"}</button>
      {state ? (
        <div className="space-y-3">
          <p className={`text-sm ${state.ok ? "text-teal" : "text-coral"}`}>{state.message}{state.pausedOffer ? " The offer was paused." : ""}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="py-2 pr-3">Hop</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2">URL</th>
                </tr>
              </thead>
              <tbody>
                {state.hops.map((hop, index) => (
                  <tr key={`${hop.url}-${index}`} className="border-t border-border">
                    <td className="py-2 pr-3 font-mono">{index + 1}</td>
                    <td className="py-2 pr-3 font-mono">{hop.status ?? hop.error ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{hop.ms}ms</td>
                    <td className="py-2 break-all text-muted">{hop.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </form>
  );
}
