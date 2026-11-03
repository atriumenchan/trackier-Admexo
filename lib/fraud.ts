import { all, one, run, setting } from "@/lib/db";
import { nowUtc } from "@/lib/format";
import { stricterAction } from "@/lib/rules";
import { DATACENTER_REASON } from "@/lib/datacenter";

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

const BOT_AGENT = /bot|spider|crawler|headless/i;
const GOOGLE_CRAWLER = /AdsBot-Google|Googlebot|Mediapartners-Google|Google-InspectionTool|GoogleOther|APIs-Google|Google-Ads/i;
export const GOOGLE_CRAWLER_REASON = "Google crawler";

export function isGoogleCrawler(userAgent: string) {
  return GOOGLE_CRAWLER.test(userAgent);
}

/** Google's ad review crawlers must still reach the landing page, so a reject or pause on them is softened to a flag. */
export function botDecision(userAgent: string, action: string) {
  if (!action || !BOT_AGENT.test(userAgent)) return null;
  if (isGoogleCrawler(userAgent)) return { action: "flag", reason: GOOGLE_CRAWLER_REASON };
  return { action, reason: "Bot" };
}

export function datacenterSince() {
  return windowStart(30 * 24 * 60);
}

export async function datacenterAction() {
  return (await one<{ action: string }>("SELECT action FROM fraud_rules WHERE status = 'active' AND metric = 'datacenter' ORDER BY id LIMIT 1"))?.action || "";
}

async function datacenterSeen(ip: string) {
  if (!ip) return false;
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM clicks WHERE ip = ? AND fraud_reason = ? AND created_at >= ?",
    ip, DATACENTER_REASON, datacenterSince(),
  );
  return Number(row?.n ?? 0) > 0;
}

export function fraudLabel(reason: string) {
  const value = (reason || "").trim();
  if (!value) return "Bad traffic";
  if (value === "Bot") return "Bot traffic";
  if (value === GOOGLE_CRAWLER_REASON) return "Google ad check";
  if (value === "Click burst") return "Bad traffic: too many clicks from one IP";
  if (value === "blocked-ip") return "Blocked IP";
  if (value === DATACENTER_REASON) return "Bad traffic: datacenter / hosting IP";
  if (value === "fraud") return "Bad traffic";
  return `Bad traffic: ${value}`;
}

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
  const rules = (await all<FraudRule>("SELECT * FROM fraud_rules WHERE status = 'active' AND metric IN ('burst', 'bot', 'datacenter')"));
  let action = "";
  let reason = "";
  for (const rule of rules) {
    let ruleAction = rule.action;
    let ruleReason = rule.name;
    if (rule.metric === "bot") {
      const bot = botDecision(input.userAgent, rule.action);
      if (!bot) continue;
      ruleAction = bot.action;
      if (bot.reason === GOOGLE_CRAWLER_REASON) ruleReason = bot.reason;
    } else if (rule.metric === "datacenter") {
      if (isGoogleCrawler(input.userAgent) || !(await datacenterSeen(input.ip))) continue;
      ruleReason = DATACENTER_REASON;
    } else if (!(await burstHit(input, rule))) continue;
    if (stricterAction(action, ruleAction) === ruleAction) {
      action = ruleAction;
      reason = ruleReason;
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
