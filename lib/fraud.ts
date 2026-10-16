import { all, one, run, setting } from "@/lib/db";
import { nowUtc } from "@/lib/format";
import { stricterAction } from "@/lib/rules";

export type FraudRule = {
  id: number;
  name: string;
  metric: string;
  threshold: number;
  window_minutes: number;
  action: string;
  status: string;
  created_at: string;
};

function windowStart(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

export async function ensureFraudRules() {
  const count = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM fraud_rules"))?.n ?? 0;
  if (count > 0) return;
  const limit = Number((await setting("fraud_click_limit", "30"))) || 30;
  const minutes = Number((await setting("fraud_window_minutes", "10"))) || 10;
  const block = (await setting("block_fraud_clicks", "0")) === "1" ? "reject" : "flag";
  const now = nowUtc();
  (await run(
    "INSERT INTO fraud_rules (name, metric, threshold, window_minutes, action, status, created_at) VALUES (?, 'burst', ?, ?, ?, 'active', ?)",
    "Click burst", limit, minutes, block, now,
  ));
  (await run(
    "INSERT INTO fraud_rules (name, metric, threshold, window_minutes, action, status, created_at) VALUES ('Bot', 'bot', 1, 10, ?, 'active', ?)",
    block, now,
  ));
}

export async function decideClickFraud(input: { ip: string; userAgent: string; offerId: number }) {
  (await ensureFraudRules());
  const rules = (await all<FraudRule>("SELECT * FROM fraud_rules WHERE status = 'active' AND metric IN ('burst', 'bot')"));
  let action = "";
  let reason = "";
  for (const rule of rules) {
    const hit = rule.metric === "bot"
      ? /bot|spider|crawler|headless/i.test(input.userAgent)
      : await burstHit(input, rule);
    if (!hit) continue;
    if (stricterAction(action, rule.action) === rule.action) {
      action = rule.action;
      reason = rule.name;
    }
  }
  return apply(action, reason);
}

async function burstHit(input: { ip: string; offerId: number }, rule: FraudRule) {
  if (!input.ip) return false;
  const count = (await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM clicks WHERE ip = ? AND offer_id = ? AND created_at >= ?",
    input.ip,
    input.offerId,
    windowStart(rule.window_minutes || 10),
  ))?.n ?? 0;
  return count >= rule.threshold;
}

export async function decideConversionFraud(offerId: number, affiliateId: number) {
  (await ensureFraudRules());
  const rules = (await all<FraudRule>("SELECT * FROM fraud_rules WHERE status = 'active' AND metric = 'cr'"));
  let action = "";
  let reason = "";
  for (const rule of rules) {
    const since = windowStart(rule.window_minutes || 60);
    const clicks = (await one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM clicks WHERE offer_id = ? AND affiliate_id = ? AND created_at >= ? AND blocked_reason = '' AND fraud_flag = 0",
      offerId, affiliateId, since,
    ))?.n ?? 0;
    if (clicks < 5) continue;
    const conversions = (await one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM conversions WHERE offer_id = ? AND affiliate_id = ? AND created_at >= ? AND status IN ('approved', 'pending')",
      offerId, affiliateId, since,
    ))?.n ?? 0;
    if ((conversions / clicks) * 100 < rule.threshold) continue;
    if (stricterAction(action, rule.action) === rule.action) {
      action = rule.action;
      reason = rule.name;
    }
  }
  return apply(action, reason);
}

function apply(action: string, reason: string) {
  if (!action) return { fraud: 0, reason: "", blocked: "", pause: false };
  return {
    fraud: 1,
    reason,
    blocked: action === "flag" ? "" : "fraud",
    pause: action === "pause",
  };
}

export async function pauseAffiliate(affiliateId: number) {
  (await run("UPDATE affiliates SET status = 'paused' WHERE id = ? AND status = 'active'", affiliateId));
}
