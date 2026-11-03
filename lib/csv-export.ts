import { csvCell, istPartsStamp } from "@/lib/format";
import type { Click, Conversion } from "@/lib/types";

export const TRACKIER_CONVERSION_HEADERS = [
  "publisher_name",
  "source",
  "p1",
  "campaign_name",
  "goalName",
  "goalValue",
  "payout",
  "click_ip",
  "city",
  "country",
  "isp",
  "conversion_id",
  "click_id",
  "elapsed_time",
  "method",
  "note",
  "created",
  "status",
  "payout_in_campaign_currency",
  "payout_in_user_currency",
  "created_date",
  "created_time",
];

export const TRACKIER_CLICK_HEADERS = [
  "publisher_name",
  "source",
  "p1",
  "campaign_name",
  "click_ip",
  "city",
  "country",
  "isp",
  "click_id",
  "device",
  "os",
  "created",
  "created_date",
  "created_time",
  "status",
];

export function trackierConversionLine(row: Conversion) {
  const stamp = istPartsStamp(row.created_at);
  return [
    row.affiliate_name || "",
    row.source || "",
    row.p1 || "",
    row.offer_name || "",
    row.goal_name || "Default",
    row.goal_value ?? "",
    row.payout,
    row.click_ip || row.ip || "",
    row.city || "",
    row.country || "",
    row.isp || "",
    row.id,
    row.click_id || "",
    row.elapsed_time || 0,
    !row.method || row.method === "lab" ? "acquisition" : row.method,
    row.note || row.reject_reason || "",
    `${stamp.date} ${stamp.time}`.trim(),
    row.status,
    row.payout,
    row.payout_user || row.payout,
    stamp.date,
    stamp.time,
  ];
}

export function trackierClickLine(row: Click) {
  const stamp = istPartsStamp(row.created_at);
  return [
    row.affiliate_name || "",
    row.source || row.sub1 || "",
    row.p1 || "",
    row.offer_name || "",
    row.ip || "",
    row.city || "",
    row.country || "",
    row.isp || "",
    row.id,
    row.device || "",
    row.os || "",
    `${stamp.date} ${stamp.time}`.trim(),
    stamp.date,
    stamp.time,
    row.blocked_reason || (row.fraud_flag ? row.fraud_reason || "fraud" : "sent"),
  ];
}

export function toCsv(lines: Array<Array<string | number | null | undefined>>) {
  return lines.map((line) => line.map((cell) => csvCell(cell)).join(",")).join("\n");
}
