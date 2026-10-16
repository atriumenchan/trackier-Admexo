"use client";

import { useActionState } from "react";
import { buildTemplateAction, checkGoogleAction } from "@/lib/google-actions";
import { btn, inputClass } from "@/components/ui";

type CheckState = Awaited<ReturnType<typeof checkGoogleAction>> | null;
type TemplateState = Awaited<ReturnType<typeof buildTemplateAction>> | null;

export function GoogleDesk({ origin }: { origin: string }) {
  const [template, build, building] = useActionState(buildTemplateAction, null as TemplateState);
  const [report, check, checking] = useActionState(checkGoogleAction, null as CheckState);
  return (
    <div className="grid gap-4">
      <form action={build} className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <h2 className="font-display text-lg text-ink sm:col-span-2">Google Ads template</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Click host</span>
          <input className={inputClass} name="origin" defaultValue={origin} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Tracking code</span>
          <input className={inputClass} name="code" defaultValue="CODE" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Campaign id</span>
          <input className={inputClass} name="campaign_id" defaultValue="CAMPAIGN" />
        </label>
        <div className="sm:col-span-2 grid gap-2 text-sm text-muted">
          <label className="flex items-center gap-2" title="Smart links choose the offer on the server. Google mode cannot use them.">
            <input type="checkbox" name="smart_link" value="1" />
            Smart link (not allowed in Google mode)
          </label>
          <label className="flex items-center gap-2 opacity-60" title="Caps can be recorded, but they cannot change the Google redirect.">
            <input type="checkbox" disabled />
            Send capped clicks to a fallback URL
          </label>
          <label className="flex items-center gap-2 opacity-60" title="Publisher sub IDs stay on this tracking URL. They are not added to the landing URL.">
            <input type="checkbox" disabled />
            Append sub IDs to the landing URL
          </label>
        </div>
        <div className="sm:col-span-2"><button className={btn} disabled={building}>{building ? "Building" : "Build template"}</button></div>
        {template ? <p className="sm:col-span-2 break-all font-mono text-sm text-ink">{template.ok ? template.template : template.reason}</p> : null}
      </form>
      <form action={check} className="surface-card grid gap-4 p-4 sm:p-5">
        <h2 className="font-display text-lg text-ink">Template checker</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Tracking template</span>
          <textarea className={inputClass} name="template" rows={3} defaultValue={template?.ok ? template.template : ""} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[12px] font-medium text-muted">Final URL</span>
          <input className={inputClass} name="final_url" placeholder="https://brand.example/landing" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="probe" value="1" />
          Live probe (does not follow the redirect)
        </label>
        <div><button className={btn} disabled={checking}>{checking ? "Checking" : "Check"}</button></div>
        {report ? (
          <div className="grid gap-2">
            {report.items.map((item) => (
              <p key={item.code} className={`rounded-sm px-3 py-2 text-sm ${item.pass ? "bg-teal-dim text-teal" : "bg-coral-dim text-coral"}`}>
                {item.pass ? "Pass" : "Fail"} · {item.code} · {item.detail}
              </p>
            ))}
            {report.probe.map((item) => (
              <p key={item.ua} className="break-all text-sm text-muted">
                {item.agrees ? "Probe matched" : "Probe did not match"} · {item.status} · {item.ua.slice(0, 48)} · {item.location}
              </p>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
