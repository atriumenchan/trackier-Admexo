"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { nowUtc } from "@/lib/format";
import { cnameChain } from "@/lib/google-dns";
import { runGoogleCanary } from "@/lib/google-canary";
import { applicationPack, checkGoogleTemplate, cnameAllowed, googleAdsTemplate, probeAgrees } from "@/lib/google-policy";
import { asCertifiedTrackers } from "@/lib/certified-trackers";
import certifiedFile from "../compliance/certified-trackers.json";

export async function checkGoogleAction(_prev: unknown, form: FormData) {
  await requireAdmin();
  const template = String(form.get("template") || "");
  const finalUrl = String(form.get("final_url") || "");
  const verified = await all<{ host: string }>("SELECT host FROM google_domains WHERE status = 'verified'");
  const report = checkGoogleTemplate({
    template,
    finalUrl,
    verifiedHosts: verified.map((row) => row.host),
    trackers: asCertifiedTrackers(certifiedFile),
  });
  let probe: { ua: string; status: number; location: string; agrees: boolean; html: boolean }[] = [];
  if (form.get("probe") && report.probeUrl.startsWith("http")) {
    for (const ua of ["Mozilla/5.0", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"]) {
      const response = await fetch(report.probeUrl, { redirect: "manual", headers: { "user-agent": ua } });
      const location = response.headers.get("location");
      const body = response.status === 302 ? "" : await response.text();
      probe.push({
        ua,
        status: response.status,
        location: location || "",
        agrees: probeAgrees(location, response.status, body, finalUrl),
        html: /<html/i.test(body),
      });
    }
  }
  return { ...report, probe };
}

export async function saveGoogleDomain(form: FormData) {
  await requireAdmin();
  const host = String(form.get("host") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const finalUrl = String(form.get("final_url") || "").trim();
  if (!host || !finalUrl) redirect("/google?error=Host+and+Final+URL+are+required");
  const chain = await cnameChain(host);
  const decision = chain.length ? cnameAllowed({ host, finalUrl, cnameTargets: chain }) : { ok: false, reason: "No CNAME record was found. Google mode is off for this host." };
  await run(
    `INSERT INTO google_domains (host, final_url, status, detail, checked_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(host) DO UPDATE SET final_url = excluded.final_url, status = excluded.status, detail = excluded.detail, checked_at = excluded.checked_at`,
    host,
    finalUrl,
    decision.ok ? "verified" : "not_certified",
    decision.reason,
    nowUtc(),
  );
  redirect(`/google?ok=${encodeURIComponent(decision.ok ? "CNAME verified" : "Not Google-certified")}`);
}

export async function runCanaryAction() {
  await requireAdmin();
  const report = await runGoogleCanary();
  redirect(`/google?ok=${encodeURIComponent(report.pass ? "Canary passed" : "Canary failed")}`);
}

export async function buildTemplateAction(_prev: unknown, form: FormData) {
  await requireAdmin();
  return googleAdsTemplate({
    origin: String(form.get("origin") || ""),
    code: String(form.get("code") || ""),
    campaignId: String(form.get("campaign_id") || ""),
    smartLink: form.get("smart_link") === "1",
  });
}

export async function googlePack() {
  await requireAdmin();
  const verified = await all<{ host: string }>("SELECT host FROM google_domains WHERE status = 'verified'");
  return applicationPack({ verifiedHosts: verified.map((row) => row.host) });
}
