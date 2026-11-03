"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LandingInner() {
  const params = useSearchParams();
  const clickId = params.get("click_id") || "";
  const sub1 = params.get("sub1") || "";
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function convert() {
    if (!clickId || busy) return;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/lab/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ click_id: clickId, txid: `order-${clickId}` }),
      });
      setResult(`${response.status} ${await response.text()}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Convert failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="surface-card w-full max-w-md p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">Advertiser landing</p>
        <h1 className="mt-2 font-display text-2xl text-ink">Finish signup</h1>
        <p className="mt-2 text-sm text-muted">This page stands in for the brand site. The tracker already appended click_id to this URL.</p>
        <p className="mt-4 break-all font-mono text-[12px] text-ink">click_id={clickId || "(missing)"}</p>
        {sub1 ? <p className="mt-1 font-mono text-[12px] text-muted">sub1={sub1}</p> : null}
        <button
          className="mt-5 inline-flex min-w-40 cursor-pointer items-center justify-center rounded-sm bg-brand px-3 py-2 text-sm font-medium text-white shadow-cta disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          data-lab-convert="1"
          disabled={!clickId || busy}
          onClick={convert}
        >
          {busy ? "Sending…" : "Complete signup"}
        </button>
        {result ? <p className="mt-3 text-sm text-muted" data-lab-result="1">{result}</p> : null}
      </div>
    </main>
  );
}

export default function LabLandingPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center px-4"><p className="text-sm text-muted">Loading landing…</p></main>}>
      <LandingInner />
    </Suspense>
  );
}
