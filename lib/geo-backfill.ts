import { all, run } from "@/lib/db";
import { lookupIp } from "@/lib/geo";
import { packClickAgent, unpackClick } from "@/lib/traffic-meta";
import type { Click } from "@/lib/types";

export async function backfillClickGeo(limit = 8) {
  const rows = await all<Click>(
    "SELECT id, ip, country, user_agent FROM clicks WHERE ip != '' AND user_agent NOT LIKE '%[geo]%' ORDER BY created_at DESC LIMIT ?",
    Math.min(12, Math.max(1, limit)),
  );
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const current = unpackClick(row);
    if (current.city && current.isp) {
      skipped += 1;
      continue;
    }
    const geo = await lookupIp(row.ip, { city: current.city, country: row.country || current.country || "", isp: current.isp });
    if (!geo.city && !geo.isp) {
      skipped += 1;
      continue;
    }
    const ua = (row.user_agent || "").replace(/\[geo\][\s\S]*?\[\/geo\]/, "").trim();
    await run(
      "UPDATE clicks SET user_agent = ?, country = ? WHERE id = ?",
      packClickAgent(ua, { city: geo.city, isp: geo.isp, p1: current.p1, source: current.source }),
      geo.country || row.country || "",
      row.id,
    );
    updated += 1;
  }
  return { updated, skipped, scanned: rows.length };
}
