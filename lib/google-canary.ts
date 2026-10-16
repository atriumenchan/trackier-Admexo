import { FORCE_PARAM, OWNED_DOMAINS, TRANSPARENCY_PARAM } from "../compliance/google-transparency.config";
import { all, putSetting, run } from "@/lib/db";
import { nowUtc } from "@/lib/format";
import { cnameAllowed } from "@/lib/google-policy";
import { cnameChain } from "@/lib/google-dns";

const AGENTS = [
  "Mozilla/5.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; AdsBot-Google; +http://www.google.com/adsbot.html)",
];

export async function refreshGoogleDomains() {
  const rows = await all<{ host: string; final_url: string }>("SELECT host, final_url FROM google_domains");
  for (const row of rows) {
    const chain = await cnameChain(row.host);
    const decision = chain.length ? cnameAllowed({ host: row.host, finalUrl: row.final_url, cnameTargets: chain }) : { ok: false, reason: "No CNAME record was found. Google mode is off for this host." };
    await run(
      "UPDATE google_domains SET status = ?, detail = ?, checked_at = ? WHERE host = ?",
      decision.ok ? "verified" : "not_certified",
      decision.reason,
      nowUtc(),
      row.host,
    );
  }
}

export async function runGoogleCanary() {
  const verified = await all<{ host: string }>("SELECT host FROM google_domains WHERE status = 'verified'");
  const hosts = [...OWNED_DOMAINS, ...verified.map((row) => row.host)];
  const target = "https://example.com/lp?utm_source=canary";
  const results: { host: string; path: string; ua: string; status: number; ok: boolean }[] = [];
  for (const host of hosts) {
    for (const path of ["/t/canary", "/s/canary"]) {
      const url = `https://${host}${path}?${FORCE_PARAM}=true&${TRANSPARENCY_PARAM}=${encodeURIComponent(target)}`;
      for (const ua of AGENTS) {
        let status = 0;
        let location = "";
        let body = "";
        try {
          const response = await fetch(url, { redirect: "manual", headers: { "user-agent": ua } });
          status = response.status;
          location = response.headers.get("location") || "";
          body = response.status === 302 ? "" : await response.text();
        } catch {
          status = 0;
        }
        const ok = status === 302 && location.startsWith(target) && location.includes("click_id=") && !body.includes("<html");
        results.push({ host, path, ua, status, ok });
      }
    }
  }
  const pass = results.length > 0 && results.every((item) => item.ok);
  const report = { pass, at: nowUtc(), results };
  await putSetting("google_canary", JSON.stringify(report));
  if (!pass && process.env.GOOGLE_ALERT_WEBHOOK) {
    await fetch(process.env.GOOGLE_ALERT_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Google click canary failed. Open Google in the tracking desk." }),
    }).catch(() => undefined);
  }
  return report;
}
