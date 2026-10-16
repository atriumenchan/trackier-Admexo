import { after, NextResponse } from "next/server";
import { all, one, run, setting, transaction } from "@/lib/db";
import { clip, dayStartUtc, nowUtc, shortCode } from "@/lib/format";
import { runAfterResponse } from "@/lib/defer";
import { decideClickFraud, decideConversionFraud, pauseAffiliate } from "@/lib/fraud";
import { postLedger } from "@/lib/ledger";
import { addRollup, rollupDay } from "@/lib/rollup";
import { attributionOpen, scheduleOpen } from "@/lib/rules";
import { assertPublicHttpUrl } from "@/lib/safe-url";
import type { Affiliate, Click, Conversion, Offer, OfferAccess, OfferGoal, SmartLink } from "@/lib/types";

export const MACROS = ["click_id", "affiliate_id", "affiliate_name", "offer_id", "offer_name", "payout", "revenue", "txid", "status", "goal", "sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9", "sub10", "source"];

export async function publicBase() {
  const configured = (await setting("base_url", "")).replace(/\/$/, "");
  const fromApp = (process.env.APP_URL || "").replace(/\/$/, "");
  const fromVercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) return configured;
  return fromApp || fromVercel || configured || "http://localhost:3010";
}

export function fillMacros(template: string, vars: Record<string, string>) {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (match, key: string) => {
    const value = vars[key.toLowerCase()];
    if (value == null || !MACROS.includes(key.toLowerCase())) return match;
    return encodeURIComponent(value);
  });
}

export function detectClient(userAgent: string) {
  const ua = userAgent.toLowerCase();
  let os = "other";
  if (ua.includes("android")) os = "android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "ios";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macos";
  else if (ua.includes("windows")) os = "windows";
  else if (ua.includes("linux")) os = "linux";

  let device: "desktop" | "mobile" | "tablet" = "desktop";
  if (ua.includes("ipad") || ua.includes("tablet")) device = "tablet";
  else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) device = "mobile";
  return { device, os };
}

export function deviceAllowed(offer: Offer, device: string) {
  if (!offer.devices || offer.devices === "all") return true;
  return offer.devices.split(",").includes(device);
}

export function countryAllowed(offer: Offer, country: string) {
  if (!offer.country_mode || offer.country_mode === "all") return true;
  if (!country) return true;
  const list = offer.countries.split(",").filter(Boolean);
  const has = list.includes(country.toUpperCase());
  return offer.country_mode === "allow" ? has : !has;
}

export async function clickCapHit(offer: Offer) {
  if (!offer.daily_click_cap) return false;
  const row = (await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM clicks
     WHERE offer_id = ? AND created_at >= ? AND blocked_reason = '' AND fraud_flag = 0`,
    offer.id,
    dayStartUtc(),
  ));
  return (row?.n ?? 0) >= offer.daily_click_cap;
}

export async function publisherClickCapHit(offer: Offer, affiliateId: number) {
  const access = (await one<OfferAccess>(
    "SELECT * FROM offer_access WHERE offer_id = ? AND affiliate_id = ?",
    offer.id,
    affiliateId,
  ));
  if (!access?.daily_click_cap) return false;
  const row = (await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM clicks
     WHERE offer_id = ? AND affiliate_id = ? AND created_at >= ? AND blocked_reason = '' AND fraud_flag = 0`,
    offer.id,
    affiliateId,
    dayStartUtc(),
  ));
  return (row?.n ?? 0) >= access.daily_click_cap;
}

async function ratesFor(offer: Offer, affiliateId: number, goalName: string): Promise<{ error: string } | { payout: number; revenue: number; goal?: OfferGoal }> {
  const access = (await one<OfferAccess>(
    "SELECT * FROM offer_access WHERE offer_id = ? AND affiliate_id = ? AND status = 'approved'",
    offer.id,
    affiliateId,
  ));
  const goals = (await all<OfferGoal>("SELECT * FROM offer_goals WHERE offer_id = ? ORDER BY is_default DESC, id", offer.id));
  let goal: OfferGoal | undefined;
  if (goals.length) {
    goal = goalName
      ? goals.find((item) => item.name.toLowerCase() === goalName.toLowerCase())
      : goals.find((item) => item.is_default) || goals[0];
    if (goalName && !goal) return { error: `Unknown goal "${goalName}".` };
  }
  const payout = goal?.payout ?? access?.custom_payout ?? offer.payout;
  const revenue = goal?.revenue ?? access?.custom_revenue ?? offer.revenue;
  return { payout, revenue, goal };
}

export async function affiliateCanRun(affiliate: Affiliate, offer: Offer) {
  if (affiliate.status !== "active" || offer.status !== "active") return false;
  const advertiser = (await one<{ status: string }>("SELECT status FROM advertisers WHERE id = ?", offer.advertiser_id));
  if (!advertiser || advertiser.status !== "active") return false;
  if (offer.visibility === "public") return true;
  const access = (await one<OfferAccess>(
    "SELECT * FROM offer_access WHERE offer_id = ? AND affiliate_id = ?",
    offer.id,
    affiliate.id,
  ));
  return access?.status === "approved";
}

export async function ensureLink(offerId: number, affiliateId: number) {
  const existing = (await one<{ code: string }>(
    "SELECT code FROM tracking_links WHERE offer_id = ? AND affiliate_id = ?",
    offerId,
    affiliateId,
  ));
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = shortCode(8);
    try {
      (await run(
        "INSERT INTO tracking_links (code, offer_id, affiliate_id, created_at) VALUES (?, ?, ?, ?)",
        code,
        offerId,
        affiliateId,
        nowUtc(),
      ));
      return code;
    } catch {
      const again = (await one<{ code: string }>(
        "SELECT code FROM tracking_links WHERE offer_id = ? AND affiliate_id = ?",
        offerId,
        affiliateId,
      ));
      if (again) return again.code;
    }
  }
  throw new Error("Could not create a tracking link.");
}

type ClickContext = {
  ip: string;
  userAgent: string;
  country: string;
  referrer: string;
  subs: Record<string, string>;
  origin: string;
};

function readContext(req: Request): ClickContext {
  const url = new URL(req.url);
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip = forwarded || req.headers.get("x-real-ip") || "";
  const country = (req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const subs: Record<string, string> = {};
  for (let index = 1; index <= 10; index += 1) subs[`sub${index}`] = clip(url.searchParams.get(`sub${index}`) || "", 200);
  return {
    ip: clip(ip, 80),
    userAgent: clip(req.headers.get("user-agent") || "", 400),
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    referrer: clip(req.headers.get("referer") || "", 400),
    subs,
    origin: url.origin,
  };
}

function unavailable(origin: string) {
  return NextResponse.redirect(`${origin}/unavailable`);
}

function redirectTo(url: string) {
  return NextResponse.redirect(url, 302);
}

export async function handleTrackingClick(req: Request, code: string, kind: "link" | "smart") {
  const ctx = readContext(req);
  if (kind === "smart") return (await handleSmart(code, ctx));
  return (await handleDirect(code, ctx));
}

async function handleDirect(code: string, ctx: ClickContext) {
  const link = (await one<{ id: number; code: string; offer_id: number; affiliate_id: number }>(
    "SELECT * FROM tracking_links WHERE code = ?",
    code,
  ));
  if (!link) return unavailable(ctx.origin);
  const offer = (await one<Offer>("SELECT * FROM offers WHERE id = ?", link.offer_id));
  const affiliate = (await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", link.affiliate_id));
  if (!offer || !affiliate) return unavailable(ctx.origin);
  return (await finishClick({ ctx, offer, affiliate, linkId: link.id, smartLinkId: null }));
}

async function handleSmart(code: string, ctx: ClickContext) {
  const smart = (await one<SmartLink>("SELECT * FROM smart_links WHERE code = ?", code));
  if (!smart || smart.status !== "active") return unavailable(ctx.origin);
  const affiliate = (await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", smart.affiliate_id));
  if (!affiliate || affiliate.status !== "active") return unavailable(ctx.origin);
  const children = (await all<{ offer_id: number; weight: number }>(
    "SELECT offer_id, weight FROM smart_link_offers WHERE smart_link_id = ?",
    smart.id,
  ));
  const { device } = detectClient(ctx.userAgent);
  const eligible: { offer: Offer; weight: number; score: number }[] = [];
  for (const child of children) {
    const offer = (await one<Offer>("SELECT * FROM offers WHERE id = ?", child.offer_id));
    if (!offer || !(await affiliateCanRun(affiliate, offer))) continue;
    if (!deviceAllowed(offer, device) || !countryAllowed(offer, ctx.country)) continue;
    if ((await clickCapHit(offer))) continue;
    eligible.push({ offer, weight: Math.max(1, child.weight || 1), score: (await scoreOffer(offer, smart.sort_mode)) });
  }
  const chosen = pickOffer(eligible, smart.sort_mode);
  if (!chosen) {
    if (smart.fallback_url) return redirectTo(smart.fallback_url);
    return unavailable(ctx.origin);
  }
  const linkCode = (await ensureLink(chosen.id, affiliate.id));
  const link = (await one<{ id: number }>("SELECT id FROM tracking_links WHERE code = ?", linkCode));
  return (await finishClick({ ctx, offer: chosen, affiliate, linkId: link?.id ?? null, smartLinkId: smart.id }));
}

async function scoreOffer(offer: Offer, mode: string) {
  if (mode !== "cr" && mode !== "profit") return 0;
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19).replace("T", " ");
  const clicks = (await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM clicks WHERE offer_id = ? AND created_at >= ? AND fraud_flag = 0 AND blocked_reason = ''",
    offer.id,
    since,
  ))?.n ?? 0;
  const money = (await one<{ n: number; profit: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(revenue - payout), 0) AS profit
     FROM conversions WHERE offer_id = ? AND status = 'approved' AND created_at >= ?`,
    offer.id,
    since,
  ));
  if (mode === "cr") return clicks ? (money?.n ?? 0) / clicks : 0;
  return money?.profit || offer.revenue - offer.payout;
}

function pickOffer(eligible: { offer: Offer; weight: number; score: number }[], mode: string) {
  if (!eligible.length) return null;
  if (mode === "cr" || mode === "profit") {
    return [...eligible].sort((a, b) => b.score - a.score)[0].offer;
  }
  if (mode === "random") return eligible[Math.floor(Math.random() * eligible.length)].offer;
  const total = eligible.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of eligible) {
    cursor -= item.weight;
    if (cursor <= 0) return item.offer;
  }
  return eligible[eligible.length - 1].offer;
}

async function finishClick(input: {
  ctx: ClickContext;
  offer: Offer;
  affiliate: Affiliate;
  linkId: number | null;
  smartLinkId: number | null;
}) {
  const { ctx, offer, affiliate } = input;
  const { device, os } = detectClient(ctx.userAgent);
  let blocked = "";
  let fraud = 0;
  let fraudReason = "";

  if (!(await affiliateCanRun(affiliate, offer))) blocked = "not-approved";
  else if (!deviceAllowed(offer, device)) blocked = "device";
  else if (!countryAllowed(offer, ctx.country)) blocked = "country";
  else if (!scheduleOpen({ days: offer.schedule_days || "", startHour: offer.schedule_start_hour, endHour: offer.schedule_end_hour })) blocked = "schedule";
  else if (ctx.ip && (await one("SELECT ip FROM blocked_ips WHERE ip = ?", ctx.ip))) {
    fraud = 1;
    fraudReason = "blocked-ip";
    blocked = "fraud";
  } else if ((await clickCapHit(offer)) || (await publisherClickCapHit(offer, affiliate.id))) blocked = "click-cap";
  else {
    const decision = (await decideClickFraud({ ip: ctx.ip, userAgent: ctx.userAgent, offerId: offer.id }));
    fraud = decision.fraud;
    fraudReason = decision.reason;
    if (decision.blocked) blocked = decision.blocked;
    if (decision.pause) (await pauseAffiliate(affiliate.id));
  }

  const destination = blocked
    ? ""
    : fillMacros(offer.offer_url, {
        click_id: "",
        affiliate_id: String(affiliate.id),
        affiliate_name: affiliate.name,
        offer_id: String(offer.id),
        offer_name: offer.name,
        source: "admexo",
        ...ctx.subs,
      });

  const clickId = shortCode(12);
  const finalDestination = destination ? fillMacros(offer.offer_url, {
    click_id: clickId,
    affiliate_id: String(affiliate.id),
    affiliate_name: affiliate.name,
    offer_id: String(offer.id),
    offer_name: offer.name,
    payout: String(offer.payout),
    source: "admexo",
    ...ctx.subs,
  }) : "";

  const saved = runAfterResponse(async () => {
    const createdAt = nowUtc();
    (await run(
      `INSERT INTO clicks (
        id, link_id, smart_link_id, offer_id, affiliate_id, ip, user_agent, country, device, os, referrer,
        sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, fraud_flag, fraud_reason, blocked_reason, destination, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      clickId,
      input.linkId,
      input.smartLinkId,
      offer.id,
      affiliate.id,
      ctx.ip,
      ctx.userAgent,
      ctx.country,
      device,
      os,
      ctx.referrer,
      ctx.subs.sub1 || "",
      ctx.subs.sub2 || "",
      ctx.subs.sub3 || "",
      ctx.subs.sub4 || "",
      ctx.subs.sub5 || "",
      ctx.subs.sub6 || "",
      ctx.subs.sub7 || "",
      ctx.subs.sub8 || "",
      ctx.subs.sub9 || "",
      ctx.subs.sub10 || "",
      fraud,
      fraudReason,
      blocked,
      finalDestination,
      createdAt,
    ));
    if (!blocked && !fraud) (await addRollup(rollupDay(createdAt), offer.id, affiliate.id, { clicks: 1 }));
  }, (task) => after(() => task));

  if (blocked) {
    (await saved);
    if (offer.fallback_url && blocked !== "fraud") return redirectTo(offer.fallback_url);
    return unavailable(ctx.origin);
  }
  return redirectTo(finalDestination);
}

export type ConversionInput = {
  clickId: string;
  txid?: string;
  goal?: string;
  status?: string;
  payout?: number | null;
  revenue?: number | null;
  amount?: number | null;
  ip?: string;
  advertiserId?: number | null;
  sourceUrl?: string;
};

export async function recordConversion(input: ConversionInput) {
  const click = (await one<Click>("SELECT * FROM clicks WHERE id = ?", input.clickId));
  if (!click) return (await finishLog(input, null, 400, "Unknown click id."));
  const offer = (await one<Offer>("SELECT * FROM offers WHERE id = ?", click.offer_id));
  if (!offer) return (await finishLog(input, click, 400, "Offer is missing."));
  if (input.advertiserId && offer.advertiser_id !== input.advertiserId) {
    return (await finishLog(input, click, 403, "This postback token does not belong to the offer."));
  }
  if (!attributionOpen(click.created_at, offer.attribution_hours)) {
    return (await finishLog(input, click, 400, "This click is outside the attribution window."));
  }

  const txid = clip(input.txid || "", 120);
  if (txid) {
    const existing = (await one<Conversion>("SELECT * FROM conversions WHERE offer_id = ? AND txid = ?", offer.id, txid));
    if (existing) return (await finishLog(input, click, 200, "Already recorded.", existing.id));
  }

  const rates = (await ratesFor(offer, click.affiliate_id, clip(input.goal || "", 80)));
  if ("error" in rates) return (await finishLog(input, click, 400, rates.error || "Unknown goal."));

  const goalName = rates.goal?.name || "";
  const duplicate = (await one<Conversion>(
    `SELECT * FROM conversions WHERE click_id = ? AND goal_name = ? AND status != 'rejected'`,
    click.id,
    goalName,
  ));
  if (duplicate) return (await finishLog(input, click, 200, "Already recorded.", duplicate.id));

  let status = (input.status || "approved").toLowerCase();
  if (!["approved", "pending", "rejected"].includes(status)) status = "approved";
  let reject = status === "rejected" ? "advertiser" : "";

  const percentModel = offer.model === "CPS" || offer.model === "RevShare";
  if (percentModel && input.payout == null && input.amount == null) {
    return (await finishLog(input, click, 400, "This offer needs a sale amount or a payout."));
  }
  let payout = input.payout ?? null;
  let revenue = input.revenue ?? null;
  if (payout == null) {
    payout = percentModel && input.amount != null ? (input.amount * rates.payout) / 100 : rates.payout;
  }
  if (revenue == null) {
    revenue = percentModel && input.amount != null ? (input.amount * rates.revenue) / 100 : rates.revenue;
  }
  payout = Math.max(0, payout ?? 0);
  revenue = Math.max(0, revenue ?? 0);

  if (status !== "rejected") {
    const start = dayStartUtc();
    const access = (await one<OfferAccess>(
      "SELECT * FROM offer_access WHERE offer_id = ? AND affiliate_id = ?",
      offer.id,
      click.affiliate_id,
    ));
    if (access?.daily_conversion_cap) {
      const own = (await one<{ n: number }>(
        `SELECT COUNT(*) AS n FROM conversions
         WHERE offer_id = ? AND affiliate_id = ? AND created_at >= ? AND status IN ('approved', 'pending')`,
        offer.id,
        click.affiliate_id,
        start,
      ));
      if ((own?.n ?? 0) >= access.daily_conversion_cap) {
        status = "rejected";
        reject = "conversion-cap";
      }
    }
    const today = (await one<{ n: number; revenue: number }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(revenue), 0) AS revenue
       FROM conversions WHERE offer_id = ? AND created_at >= ? AND status IN ('approved', 'pending')`,
      offer.id,
      start,
    ));
    if (offer.daily_conversion_cap && (today?.n ?? 0) >= offer.daily_conversion_cap) {
      status = "rejected";
      reject = "conversion-cap";
    } else if (offer.daily_budget_cap && (today?.revenue ?? 0) + revenue > offer.daily_budget_cap) {
      status = "rejected";
      reject = "budget-cap";
    }
  }

  if (click.fraud_flag && status !== "rejected") {
    status = "rejected";
    reject = click.fraud_reason || "fraud";
  }
  let fraudReason = "";
  if (status !== "rejected") {
    const decision = (await decideConversionFraud(offer.id, click.affiliate_id));
    if (decision.blocked) {
      status = "rejected";
      reject = decision.reason || "fraud";
    } else if (decision.fraud) fraudReason = decision.reason;
    if (decision.pause) (await pauseAffiliate(click.affiliate_id));
  }

  let conversionId = 0;
  const created = nowUtc();
  const storedPayout = status === "rejected" ? 0 : payout;
  const storedRevenue = status === "rejected" ? 0 : revenue;
  try {
    conversionId = await transaction(async () => {
      const inserted = await run(
        `INSERT INTO conversions (
          click_id, offer_id, affiliate_id, goal_id, goal_name, payout, revenue, currency, status,
          reject_reason, txid, ip, postback_status, fraud_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'skipped', ?, ?)`,
        click.id,
        offer.id,
        click.affiliate_id,
        rates.goal?.id ?? null,
        goalName,
        storedPayout,
        storedRevenue,
        offer.currency,
        status,
        reject,
        txid,
        clip(input.ip || "", 80),
        fraudReason,
        created,
      );
      return inserted.id;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the conversion.";
    if (message.includes("idx_conv_txid_unique")) return (await finishLog(input, click, 200, "Already recorded."));
    return (await finishLog(input, click, 400, message));
  }

  if (status === "approved") {
    (await postLedger({
      affiliateId: click.affiliate_id,
      conversionId,
      kind: "credit",
      amount: storedPayout,
      currency: offer.currency,
      note: "Approved conversion",
    }));
    (await addRollup(rollupDay(created), offer.id, click.affiliate_id, { conversions: 1, revenue: storedRevenue, payout: storedPayout }));
    await fireAffiliatePostback(conversionId);
  }
  const logged = (await finishLog(input, click, 200, status === "approved" ? "OK" : status, conversionId));
  return logged;
}

async function finishLog(input: ConversionInput, click: Click | null, http: number, message: string, conversionId?: number) {
  (await run(
    `INSERT INTO postback_logs (direction, click_id, conversion_id, url, status_code, body, ok, created_at)
     VALUES ('in', ?, ?, ?, ?, ?, ?, ?)`,
    click?.id || input.clickId,
    conversionId ?? null,
    clip(input.sourceUrl || "", 500),
    http,
    clip(message, 500),
    http < 400 ? 1 : 0,
    nowUtc(),
  ));
  return { ok: http < 400, http, message, conversionId };
}

export async function fireAffiliatePostback(conversionId: number) {
  const conversion = (await one<Conversion>("SELECT * FROM conversions WHERE id = ?", conversionId));
  if (!conversion || conversion.status !== "approved") return;
  const affiliate = (await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", conversion.affiliate_id));
  const offer = (await one<Offer>("SELECT * FROM offers WHERE id = ?", conversion.offer_id));
  const click = conversion.click_id ? (await one<Click>("SELECT * FROM clicks WHERE id = ?", conversion.click_id)) : undefined;
  if (!affiliate?.postback_url || !offer) {
    (await run("UPDATE conversions SET postback_status = 'skipped' WHERE id = ?", conversionId));
    return;
  }
  const url = fillMacros(affiliate.postback_url, {
    click_id: conversion.click_id || "",
    affiliate_id: String(affiliate.id),
    affiliate_name: affiliate.name,
    offer_id: String(offer.id),
    offer_name: offer.name,
    payout: String(conversion.payout),
    revenue: String(conversion.revenue),
    txid: conversion.txid,
    status: conversion.status,
    goal: conversion.goal_name,
    source: "admexo",
    sub1: click?.sub1 || "",
    sub2: click?.sub2 || "",
    sub3: click?.sub3 || "",
    sub4: click?.sub4 || "",
    sub5: click?.sub5 || "",
    sub6: click?.sub6 || "",
    sub7: click?.sub7 || "",
    sub8: click?.sub8 || "",
    sub9: click?.sub9 || "",
    sub10: click?.sub10 || "",
  });
  let target = url;
  try {
    target = await assertPublicHttpUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Postback URL was blocked.";
    (await run(
      `INSERT INTO postback_logs (direction, click_id, conversion_id, url, status_code, body, ok, created_at)
       VALUES ('out', ?, ?, ?, NULL, ?, 0, ?)`,
      conversion.click_id || "",
      conversionId,
      clip(url, 500),
      clip(message, 500),
      nowUtc(),
    ));
    (await run("UPDATE conversions SET postback_status = 'failed' WHERE id = ?", conversionId));
    return;
  }
  try {
    const response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const body = clip(await response.text().catch(() => ""), 500);
    (await run(
      `INSERT INTO postback_logs (direction, click_id, conversion_id, url, status_code, body, ok, created_at)
       VALUES ('out', ?, ?, ?, ?, ?, ?, ?)`,
      conversion.click_id || "",
      conversionId,
      clip(url, 500),
      response.status,
      body,
      response.ok ? 1 : 0,
      nowUtc(),
    ));
    (await run(
      "UPDATE conversions SET postback_status = ? WHERE id = ?",
      response.ok ? "sent" : "failed",
      conversionId,
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Postback failed";
    (await run(
      `INSERT INTO postback_logs (direction, click_id, conversion_id, url, status_code, body, ok, created_at)
       VALUES ('out', ?, ?, ?, NULL, ?, 0, ?)`,
      conversion.click_id || "",
      conversionId,
      clip(url, 500),
      clip(message, 500),
      nowUtc(),
    ));
    (await run("UPDATE conversions SET postback_status = 'failed' WHERE id = ?", conversionId));
  }
}

export async function readPostbackParams(req: Request) {
  const url = new URL(req.url);
  const params = new Map<string, string>();
  url.searchParams.forEach((value, key) => params.set(key.toLowerCase(), value));
  if (req.method === "POST") {
    const type = req.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (json && typeof json === "object") {
        for (const [key, value] of Object.entries(json)) {
          if (value != null && typeof value !== "object") params.set(key.toLowerCase(), String(value));
        }
      }
    } else {
      const form = await req.formData().catch(() => null);
      form?.forEach((value, key) => {
        if (typeof value === "string") params.set(key.toLowerCase(), value);
      });
    }
  }
  const pick = (...keys: string[]) => keys.map((key) => params.get(key)).find((value) => value != null && value !== "") || "";
  const asNumber = (value: string) => {
    if (!value) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    clickId: pick("click_id", "clickid", "cid"),
    txid: pick("txid", "transaction_id", "trans_id"),
    goal: pick("goal", "event", "goal_name"),
    status: pick("status"),
    payout: asNumber(pick("payout")),
    revenue: asNumber(pick("revenue")),
    amount: asNumber(pick("amount", "sale_amount", "order_amount")),
    sourceUrl: url.pathname + url.search,
  };
}
