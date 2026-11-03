import { clickAgeMs } from "@/lib/rules";
import type { Click, Conversion } from "@/lib/types";

const GEO = /\[geo\]([\s\S]*?)\[\/geo\]/;
const META = /\[meta\]([\s\S]*?)\[\/meta\]/;

export function packClickAgent(userAgent: string, extra: { city: string; isp: string; p1: string; source: string }) {
  const payload = JSON.stringify({
    city: extra.city || "",
    isp: extra.isp || "",
    p1: extra.p1 || "",
    source: extra.source || "",
  });
  return `${userAgent.replace(GEO, "").trim()}\n[geo]${payload}[/geo]`;
}

export function unpackClick<T extends Partial<Click> & { user_agent?: string }>(row: T): T & { city: string; isp: string; p1: string; source: string } {
  const raw = row.user_agent || "";
  const match = raw.match(GEO);
  let extra = { city: row.city || "", isp: row.isp || "", p1: row.p1 || "", source: row.source || "" };
  if (match) {
    try {
      extra = { ...extra, ...(JSON.parse(match[1]) as typeof extra) };
    } catch {
      extra = extra;
    }
  }
  return {
    ...row,
    user_agent: raw.replace(GEO, "").trim(),
    city: extra.city || "",
    isp: extra.isp || "",
    p1: extra.p1 || "",
    source: extra.source || "",
  };
}

export function packConversionMeta(fraudReason: string, extra: {
  method: string;
  note: string;
  goal_value: number | null;
  elapsed_time: number;
  payout_user: number;
}) {
  const payload = JSON.stringify(extra);
  return `${fraudReason.replace(META, "").trim()}\n[meta]${payload}[/meta]`.trim();
}

export function unpackConversion<T extends Partial<Conversion> & { fraud_reason?: string; click_created_at?: string }>(row: T): T {
  const raw = row.fraud_reason || "";
  const match = raw.match(META);
  let extra = {
    method: row.method || "acquisition",
    note: row.note || "",
    goal_value: row.goal_value ?? null,
    elapsed_time: row.elapsed_time || 0,
    payout_user: row.payout_user || 0,
  };
  if (match) {
    try {
      extra = { ...extra, ...(JSON.parse(match[1]) as typeof extra) };
    } catch {
      extra = extra;
    }
  }
  if (!extra.elapsed_time && row.click_created_at && row.created_at) {
    extra.elapsed_time = Math.round(clickAgeMs(row.click_created_at, Date.parse(String(row.created_at).replace(" ", "T") + "Z")) / 1000);
  }
  if (!extra.payout_user) extra.payout_user = Number(row.payout || 0);
  return {
    ...row,
    fraud_reason: raw.replace(META, "").trim(),
    method: extra.method || "acquisition",
    note: extra.note || "",
    goal_value: extra.goal_value,
    elapsed_time: extra.elapsed_time || 0,
    payout_user: extra.payout_user,
  };
}
