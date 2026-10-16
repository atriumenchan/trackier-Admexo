"use server";

import { redirect } from "next/navigation";
import { clearSession, checkLogin, requireAdmin, requireAffiliate, requireAdvertiser, requireUser, setSession, homeFor } from "@/lib/auth";
import { all, one, run, setting } from "@/lib/db";
import { postLedger } from "@/lib/ledger";
import { addRollup, rollupDay } from "@/lib/rollup";
import { clip, countryList, istRange, nowUtc, shortCode } from "@/lib/format";
import { randomBytes } from "crypto";
import { pauseOffer, testRedirects } from "@/lib/link-test";
import { hashPassword } from "@/lib/password";
import { cleanScheduleDays } from "@/lib/rules";
import { applyOfferFeed, fetchOfferFeed } from "@/lib/sync";
import { ensureLink, fireAffiliatePostback, publicBase, recordConversion } from "@/lib/tracking";
import type { Affiliate, Offer, SyncSource, User } from "@/lib/types";

function bubble(error: unknown): asserts error is Error {
  if (typeof error === "object" && error && "digest" in error) throw error;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalNumber(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a number that is zero or greater.");
  return value;
}

function httpUrl(value: string, label: string, required = false) {
  if (!value) {
    if (required) throw new Error(`${label} is required.`);
    return "";
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a full URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`${label} must start with http or https.`);
  return value;
}

function oneOf(value: string, allowed: string[], fallback: string) {
  return allowed.includes(value) ? value : fallback;
}

async function savePortalUser(input: {
  email: string;
  name: string;
  password: string;
  role: "affiliate" | "advertiser";
  affiliateId?: number;
  advertiserId?: number;
}) {
  const email = input.email.trim().toLowerCase();
  if (input.password && input.password.length < 6) throw new Error("Portal password must be at least 6 characters.");
  if (input.password && !email) throw new Error("Add an email before setting a portal password.");
  const existing = input.affiliateId
    ? (await one<User>("SELECT * FROM users WHERE affiliate_id = ?", input.affiliateId))
    : input.advertiserId
      ? (await one<User>("SELECT * FROM users WHERE advertiser_id = ?", input.advertiserId))
      : undefined;
  if (!existing && !input.password) return;
  if (email) {
    const clash = (await one<User>("SELECT * FROM users WHERE email = ?", email));
    if (clash && clash.id !== existing?.id) throw new Error("That email is already used by another login.");
  }
  if (existing) {
    const nextEmail = email || existing.email;
    if (input.password) {
      (await run("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?", input.name, nextEmail, hashPassword(input.password), existing.id));
    } else {
      (await run("UPDATE users SET name = ?, email = ? WHERE id = ?", input.name, nextEmail, existing.id));
    }
    return;
  }
  (await run(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    email,
    input.name,
    hashPassword(input.password),
    input.role,
    input.affiliateId ?? null,
    input.advertiserId ?? null,
    nowUtc(),
  ));
}

export async function login(form: FormData) {
  const result = (await checkLogin(str(form, "email"), str(form, "password")));
  if ("error" in result && result.error) redirect(`/login?error=${encodeURIComponent(result.error)}`);
  if (!result.user) redirect("/login?error=Those+details+do+not+match.");
  await setSession(result.user.id);
  redirect(homeFor(result.user.role));
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function saveAdvertiser(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const path = id ? `/advertisers/${id}` : "/advertisers/new";
  try {
    const name = str(form, "name");
    if (!name) throw new Error("Name is required.");
    const status = oneOf(str(form, "status"), ["active", "paused"], "active");
    const fields = [name, str(form, "company"), str(form, "email").toLowerCase(), httpUrl(str(form, "website"), "Website"), status, str(form, "notes")];
    let saved = id;
    if (id) {
      (await run("UPDATE advertisers SET name = ?, company = ?, email = ?, website = ?, status = ?, notes = ? WHERE id = ?", ...fields, id));
    } else {
      saved = (await run(
        `INSERT INTO advertisers (name, company, email, website, status, notes, postback_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ...fields,
        shortCode(24),
        nowUtc(),
      )).id;
    }
    await savePortalUser({
      email: str(form, "email"),
      name,
      password: str(form, "password"),
      role: "advertiser",
      advertiserId: saved,
    });
    redirect(`/advertisers/${saved}?ok=${encodeURIComponent("Advertiser saved")}`);
  } catch (error) {
    bubble(error);
    fail(path, error);
  }
}

export async function deleteAdvertiser(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const offers = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM offers WHERE advertiser_id = ?", id))?.n ?? 0;
  if (offers) redirect(`/advertisers/${id}?error=${encodeURIComponent("Pause this advertiser, or delete its offers first.")}`);
  (await run("DELETE FROM users WHERE advertiser_id = ?", id));
  (await run("DELETE FROM advertisers WHERE id = ?", id));
  redirect("/advertisers?ok=Advertiser+deleted");
}

export async function regenerateToken(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  (await run("UPDATE advertisers SET postback_token = ? WHERE id = ?", shortCode(24), id));
  redirect(`/advertisers/${id}?ok=${encodeURIComponent("Postback URL updated")}`);
}

export async function saveAffiliate(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const path = id ? `/affiliates/${id}` : "/affiliates/new";
  try {
    const name = str(form, "name");
    if (!name) throw new Error("Name is required.");
    const email = str(form, "email").toLowerCase();
    const status = oneOf(str(form, "status"), ["pending", "active", "blocked"], "pending");
    const postback = str(form, "postback_url");
    if (postback) httpUrl(postback, "Postback URL");
    let saved = id;
    if (id) {
      (await run(
        "UPDATE affiliates SET name = ?, company = ?, email = ?, status = ?, postback_url = ?, notes = ? WHERE id = ?",
        name, str(form, "company"), email, status, postback, str(form, "notes"), id,
      ));
    } else {
      saved = (await run(
        `INSERT INTO affiliates (name, company, email, status, postback_url, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        name, str(form, "company"), email, status, postback, str(form, "notes"), nowUtc(),
      )).id;
    }
    await savePortalUser({ email, name, password: str(form, "password"), role: "affiliate", affiliateId: saved });
    redirect(`/affiliates/${saved}?ok=${encodeURIComponent("Affiliate saved")}`);
  } catch (error) {
    bubble(error);
    fail(path, error);
  }
}

export async function deleteAffiliate(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const clicks = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM clicks WHERE affiliate_id = ?", id))?.n ?? 0;
  if (clicks) redirect(`/affiliates/${id}?error=${encodeURIComponent("This affiliate has clicks. Block them instead of deleting.")}`);
  (await run("DELETE FROM tracking_links WHERE affiliate_id = ?", id));
  (await run("DELETE FROM offer_access WHERE affiliate_id = ?", id));
  (await run("DELETE FROM smart_link_offers WHERE smart_link_id IN (SELECT id FROM smart_links WHERE affiliate_id = ?)", id));
  (await run("DELETE FROM smart_links WHERE affiliate_id = ?", id));
  (await run("DELETE FROM users WHERE affiliate_id = ?", id));
  (await run("DELETE FROM affiliates WHERE id = ?", id));
  redirect("/affiliates?ok=Affiliate+deleted");
}

function readOffer(form: FormData) {
  const name = str(form, "name");
  const advertiserId = Number(form.get("advertiser_id") || 0);
  if (!name) throw new Error("Offer name is required.");
  if (!advertiserId) throw new Error("Choose an advertiser.");
  const offerUrl = httpUrl(str(form, "offer_url"), "Offer URL", true);
  const countries = countryList(str(form, "countries")).join(",");
  const countryMode = oneOf(str(form, "country_mode"), ["all", "allow", "block"], "all");
  return {
    name,
    advertiserId,
    description: str(form, "description"),
    previewUrl: httpUrl(str(form, "preview_url"), "Preview URL"),
    offerUrl,
    model: oneOf(str(form, "model"), ["CPA", "CPL", "CPS", "RevShare"], "CPA"),
    currency: (str(form, "currency") || "USD").toUpperCase().slice(0, 3),
    payout: optionalNumber(form, "payout") ?? 0,
    revenue: optionalNumber(form, "revenue") ?? 0,
    status: oneOf(str(form, "status"), ["active", "paused"], "active"),
    visibility: oneOf(str(form, "visibility"), ["public", "private", "approval"], "private"),
    countryMode,
    countries,
    devices: oneOf(str(form, "devices"), ["all", "mobile", "desktop", "tablet"], "all"),
    dailyClickCap: optionalNumber(form, "daily_click_cap"),
    dailyConversionCap: optionalNumber(form, "daily_conversion_cap"),
    dailyBudgetCap: optionalNumber(form, "daily_budget_cap"),
    fallbackUrl: httpUrl(str(form, "fallback_url"), "Fallback URL"),
    finalUrl: httpUrl(str(form, "final_url"), "Final URL"),
    googleStrict: form.get("google_strict") ? 1 : 0,
    attributionHours: attributionHours(form),
    scheduleDays: cleanScheduleDays(str(form, "schedule_days")),
    scheduleStart: hourField(form, "schedule_start_hour"),
    scheduleEnd: hourField(form, "schedule_end_hour"),
  };
}

function attributionHours(form: FormData) {
  const value = optionalNumber(form, "attribution_hours");
  if (value == null) return 720;
  return Math.min(8760, Math.max(1, Math.round(value)));
}

function hourField(form: FormData, key: string) {
  const raw = str(form, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 23) throw new Error("Schedule hours must be from 0 to 23.");
  return value;
}

export async function saveOffer(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const path = id ? `/offers/${id}` : "/offers/new";
  try {
    const offer = readOffer(form);
    const now = nowUtc();
    let saved = id;
    if ((offer.scheduleStart == null) !== (offer.scheduleEnd == null)) {
      throw new Error("Set both schedule hours, or leave both blank.");
    }
    if (offer.googleStrict && !offer.finalUrl) throw new Error("Final URL is required when strict matching is on.");
    const values = [
      offer.advertiserId, offer.name, offer.description, offer.previewUrl, offer.offerUrl, offer.model, offer.currency,
      offer.payout, offer.revenue, offer.status, offer.visibility, offer.countryMode, offer.countries, offer.devices,
      offer.attributionHours, offer.scheduleDays, offer.scheduleStart, offer.scheduleEnd,
      offer.dailyClickCap, offer.dailyConversionCap, offer.dailyBudgetCap, offer.fallbackUrl, offer.finalUrl, offer.googleStrict,
    ];
    if (id) {
      (await run(
        `UPDATE offers SET advertiser_id = ?, name = ?, description = ?, preview_url = ?, offer_url = ?, model = ?, currency = ?,
         payout = ?, revenue = ?, status = ?, visibility = ?, country_mode = ?, countries = ?, devices = ?,
         attribution_hours = ?, schedule_days = ?, schedule_start_hour = ?, schedule_end_hour = ?,
         daily_click_cap = ?, daily_conversion_cap = ?, daily_budget_cap = ?, fallback_url = ?, final_url = ?, google_strict = ?, updated_at = ? WHERE id = ?`,
        ...values, now, id,
      ));
    } else {
      saved = (await run(
        `INSERT INTO offers (
          advertiser_id, name, description, preview_url, offer_url, model, currency, payout, revenue, status, visibility,
          country_mode, countries, devices, attribution_hours, schedule_days, schedule_start_hour, schedule_end_hour,
          daily_click_cap, daily_conversion_cap, daily_budget_cap, fallback_url, final_url, google_strict, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...values, now, now,
      )).id;
    }
    redirect(`/offers/${saved}?ok=${encodeURIComponent("Offer saved")}`);
  } catch (error) {
    bubble(error);
    fail(path, error);
  }
}

export async function deleteOffer(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const clicks = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM clicks WHERE offer_id = ?", id))?.n ?? 0;
  if (clicks) redirect(`/offers/${id}?error=${encodeURIComponent("This offer has clicks. Pause it instead of deleting.")}`);
  (await run("DELETE FROM offer_goals WHERE offer_id = ?", id));
  (await run("DELETE FROM offer_access WHERE offer_id = ?", id));
  (await run("DELETE FROM tracking_links WHERE offer_id = ?", id));
  (await run("DELETE FROM smart_link_offers WHERE offer_id = ?", id));
  (await run("DELETE FROM offers WHERE id = ?", id));
  redirect("/offers?ok=Offer+deleted");
}

export async function saveGoal(form: FormData) {
  await requireAdmin();
  const offerId = Number(form.get("offer_id") || 0);
  try {
    const name = str(form, "name").toLowerCase().replace(/\s+/g, "-");
    if (!name) throw new Error("Goal name is required.");
    const payout = optionalNumber(form, "payout") ?? 0;
    const revenue = optionalNumber(form, "revenue") ?? 0;
    const isDefault = form.get("is_default") ? 1 : 0;
    if (isDefault) (await run("UPDATE offer_goals SET is_default = 0 WHERE offer_id = ?", offerId));
    const id = Number(form.get("id") || 0);
    if (id) (await run("UPDATE offer_goals SET name = ?, payout = ?, revenue = ?, is_default = ? WHERE id = ?", name, payout, revenue, isDefault, id));
    else (await run("INSERT INTO offer_goals (offer_id, name, payout, revenue, is_default) VALUES (?, ?, ?, ?, ?)", offerId, name, payout, revenue, isDefault));
    redirect(`/offers/${offerId}?ok=${encodeURIComponent("Goal saved")}`);
  } catch (error) {
    bubble(error);
    fail(`/offers/${offerId}`, error);
  }
}

export async function deleteGoal(form: FormData) {
  await requireAdmin();
  const offerId = Number(form.get("offer_id") || 0);
  (await run("DELETE FROM offer_goals WHERE id = ?", Number(form.get("id") || 0)));
  redirect(`/offers/${offerId}?ok=Goal+removed`);
}

export async function saveAccess(form: FormData) {
  await requireAdmin();
  const offerId = Number(form.get("offer_id") || 0);
  const affiliateId = Number(form.get("affiliate_id") || 0);
  try {
    if (!affiliateId) throw new Error("Choose an affiliate.");
    const status = oneOf(str(form, "status"), ["pending", "approved", "blocked"], "approved");
    const customPayout = optionalNumber(form, "custom_payout");
    const customRevenue = optionalNumber(form, "custom_revenue");
    const dailyClickCap = optionalNumber(form, "daily_click_cap");
    const dailyConversionCap = optionalNumber(form, "daily_conversion_cap");
    const existing = (await one("SELECT id FROM offer_access WHERE offer_id = ? AND affiliate_id = ?", offerId, affiliateId));
    if (existing) {
      (await run(
        "UPDATE offer_access SET status = ?, custom_payout = ?, custom_revenue = ?, daily_click_cap = ?, daily_conversion_cap = ? WHERE offer_id = ? AND affiliate_id = ?",
        status, customPayout, customRevenue, dailyClickCap, dailyConversionCap, offerId, affiliateId,
      ));
    } else {
      (await run(
        "INSERT INTO offer_access (offer_id, affiliate_id, status, custom_payout, custom_revenue, daily_click_cap, daily_conversion_cap) VALUES (?, ?, ?, ?, ?, ?, ?)",
        offerId, affiliateId, status, customPayout, customRevenue, dailyClickCap, dailyConversionCap,
      ));
    }
    if (status === "approved") (await ensureLink(offerId, affiliateId));
    redirect(`/offers/${offerId}?ok=${encodeURIComponent("Affiliate access saved")}`);
  } catch (error) {
    bubble(error);
    fail(`/offers/${offerId}`, error);
  }
}

export async function deleteAccess(form: FormData) {
  await requireAdmin();
  const offerId = Number(form.get("offer_id") || 0);
  (await run("DELETE FROM offer_access WHERE id = ?", Number(form.get("id") || 0)));
  redirect(`/offers/${offerId}?ok=Access+removed`);
}

export async function testConversion(form: FormData) {
  await requireAdmin();
  const clickId = str(form, "click_id");
  const result = await recordConversion({
    clickId,
    txid: `test-${shortCode(8)}`,
    sourceUrl: "manual-test",
    status: "approved",
  });
  const target = `/clicks?ok=${encodeURIComponent(result.message)}`;
  if (!result.ok) redirect(`/clicks?error=${encodeURIComponent(result.message)}`);
  redirect(target);
}

export async function setConversionStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const status = oneOf(str(form, "status"), ["approved", "rejected", "reversed"], "approved");
  if (status === "reversed") {
    try {
      await applyReversal(id);
      redirect("/conversions?ok=Conversion+reversed");
    } catch (error) {
      bubble(error);
      fail("/conversions", error);
    }
  }
  const row = (await one<{ status: string }>("SELECT status FROM conversions WHERE id = ?", id));
  if (!row || row.status !== "pending") redirect("/conversions?error=Only+pending+conversions+can+be+changed");
  (await run(
    "UPDATE conversions SET status = ?, reject_reason = ? WHERE id = ?",
    status,
    status === "rejected" ? "manual" : "",
    id,
  ));
  if (status === "approved") (await noteApproval(id));
  redirect(`/conversions?ok=${encodeURIComponent(status === "approved" ? "Conversion approved" : "Conversion rejected")}`);
}

async function noteApproval(id: number) {
  const row = (await one<{ affiliate_id: number; offer_id: number; payout: number; revenue: number; currency: string; created_at: string; status: string }>(
    "SELECT affiliate_id, offer_id, payout, revenue, currency, created_at, status FROM conversions WHERE id = ?",
    id,
  ));
  if (!row || row.status !== "approved") return;
  (await postLedger({
    affiliateId: row.affiliate_id,
    conversionId: id,
    kind: "credit",
    amount: row.payout,
    currency: row.currency,
    note: "Approved conversion",
  }));
  (await addRollup(rollupDay(row.created_at), row.offer_id, row.affiliate_id, { conversions: 1, revenue: row.revenue, payout: row.payout }));
  await fireAffiliatePostback(id);
}

async function applyReversal(id: number) {
  const row = (await one<{ status: string; payout_id: number | null; payout: number; revenue: number; currency: string; affiliate_id: number; offer_id: number; created_at: string }>(
    "SELECT status, payout_id, payout, revenue, currency, affiliate_id, offer_id, created_at FROM conversions WHERE id = ?",
    id,
  ));
  if (!row || row.status !== "approved") throw new Error("Only an approved conversion can be reversed.");
  const payoutId = row.payout_id;
  if (payoutId) {
    const payout = (await one<{ status: string; amount: number }>("SELECT status, amount FROM payouts WHERE id = ?", payoutId));
    if (!payout || payout.status === "paid") throw new Error("This conversion is already on a paid statement.");
    const next = Math.max(0, Math.round((payout.amount - row.payout) * 100) / 100);
    (await run("UPDATE payouts SET amount = ? WHERE id = ?", next, payoutId));
  }
  (await run(
    "UPDATE conversions SET status = 'reversed', reject_reason = 'reversed', payout_id = NULL WHERE id = ?",
    id,
  ));
  if ((await setting("ledger_built", "")) === "1") {
    (await postLedger({
      affiliateId: row.affiliate_id,
      conversionId: id,
      kind: "reversal",
      amount: -row.payout,
      currency: row.currency,
      note: "Reversed conversion",
    }));
    if (payoutId) {
      (await postLedger({
        affiliateId: row.affiliate_id,
        payoutId,
        kind: "adjust",
        amount: row.payout,
        currency: row.currency,
        note: "Statement reduced",
      }));
    }
  }
  (await addRollup(rollupDay(row.created_at), row.offer_id, row.affiliate_id, { conversions: -1, revenue: -row.revenue, payout: -row.payout }));
}

export async function advertiserDecision(form: FormData) {
  const { advertiser } = await requireAdvertiser();
  const id = Number(form.get("id") || 0);
  const status = oneOf(str(form, "status"), ["approved", "rejected"], "rejected");
  const row = (await one<{ status: string; advertiser_id: number }>(
    `SELECT c.status, o.advertiser_id AS advertiser_id
     FROM conversions c JOIN offers o ON o.id = c.offer_id WHERE c.id = ?`,
    id,
  ));
  if (!row || row.advertiser_id !== advertiser.id || row.status !== "pending") {
    redirect("/brand?error=Only+your+pending+conversions+can+be+changed");
  }
  (await run(
    "UPDATE conversions SET status = ?, reject_reason = ? WHERE id = ?",
    status,
    status === "rejected" ? "advertiser" : "",
    id,
  ));
  if (status === "approved") (await noteApproval(id));
  redirect(`/brand?ok=${encodeURIComponent(status === "approved" ? "Conversion approved" : "Conversion rejected")}`);
}

export async function retryPostback(form: FormData) {
  await requireAdmin();
  await fireAffiliatePostback(Number(form.get("id") || 0));
  redirect("/postbacks?ok=Postback+retried");
}

export async function saveSmartLink(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const path = id ? `/smart-links/${id}` : "/smart-links/new";
  try {
    const name = str(form, "name");
    const affiliateId = Number(form.get("affiliate_id") || 0);
    if (!name || !affiliateId) throw new Error("Name and affiliate are required.");
    const sortMode = oneOf(str(form, "sort_mode"), ["weight", "random", "cr", "profit"], "weight");
    const status = oneOf(str(form, "status"), ["active", "paused"], "active");
    const fallback = httpUrl(str(form, "fallback_url"), "Fallback URL");
    let saved = id;
    if (id) {
      (await run("UPDATE smart_links SET name = ?, affiliate_id = ?, sort_mode = ?, status = ?, fallback_url = ? WHERE id = ?", name, affiliateId, sortMode, status, fallback, id));
    } else {
      saved = (await run(
        `INSERT INTO smart_links (name, code, affiliate_id, sort_mode, status, fallback_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        name, shortCode(8), affiliateId, sortMode, status, fallback, nowUtc(),
      )).id;
    }
    (await run("DELETE FROM smart_link_offers WHERE smart_link_id = ?", saved));
    for (const value of form.getAll("offer_id")) {
      const offerId = Number(value);
      if (!offerId) continue;
      const weight = Math.max(1, Math.round(Number(form.get(`weight_${offerId}`)) || 1));
      (await run("INSERT INTO smart_link_offers (smart_link_id, offer_id, weight) VALUES (?, ?, ?)", saved, offerId, weight));
    }
    redirect(`/smart-links/${saved}?ok=${encodeURIComponent("Smart link saved")}`);
  } catch (error) {
    bubble(error);
    fail(path, error);
  }
}

export async function deleteSmartLink(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  (await run("DELETE FROM smart_link_offers WHERE smart_link_id = ?", id));
  (await run("DELETE FROM smart_links WHERE id = ?", id));
  redirect("/smart-links?ok=Smart+link+deleted");
}

export async function saveSyncSource(form: FormData) {
  await requireAdmin();
  try {
    const name = str(form, "name");
    const advertiserId = Number(form.get("advertiser_id") || 0);
    const endpoint = httpUrl(str(form, "endpoint_url"), "API URL", true);
    if (!name || !advertiserId) throw new Error("Name and advertiser are required.");
    const id = Number(form.get("id") || 0);
    if (id) {
      (await run("UPDATE sync_sources SET name = ?, advertiser_id = ?, endpoint_url = ?, api_key = ? WHERE id = ?", name, advertiserId, endpoint, str(form, "api_key"), id));
    } else {
      (await run(
        `INSERT INTO sync_sources (name, advertiser_id, endpoint_url, api_key, created_at) VALUES (?, ?, ?, ?, ?)`,
        name, advertiserId, endpoint, str(form, "api_key"), nowUtc(),
      ));
    }
    redirect("/sync?ok=Sync+source+saved");
  } catch (error) {
    bubble(error);
    fail("/sync", error);
  }
}

export async function deleteSyncSource(form: FormData) {
  await requireAdmin();
  (await run("DELETE FROM sync_sources WHERE id = ?", Number(form.get("id") || 0)));
  redirect("/sync?ok=Sync+source+removed");
}

async function rememberSync(source: SyncSource, job: () => Promise<{ created: number; updated: number; paused: number; total: number }>) {
  try {
    const result = await job();
    const message = `${result.total} in the feed. ${result.created} new, ${result.updated} updated, ${result.paused} paused.`;
    (await run("UPDATE sync_sources SET last_run_at = ?, last_status = 'ok', last_message = ? WHERE id = ?", nowUtc(), message, source.id));
    return message;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    (await run("UPDATE sync_sources SET last_run_at = ?, last_status = 'error', last_message = ? WHERE id = ?", nowUtc(), clip(message, 300), source.id));
    throw error;
  }
}

export async function runSync(form: FormData) {
  await requireAdmin();
  const source = (await one<SyncSource>("SELECT * FROM sync_sources WHERE id = ?", Number(form.get("id") || 0)));
  if (!source) redirect("/sync?error=Sync+source+not+found");
  try {
    const message = await rememberSync(source, async () => (await applyOfferFeed(source, await fetchOfferFeed(source), true)));
    redirect(`/sync?ok=${encodeURIComponent(message)}`);
  } catch (error) {
    bubble(error);
    fail("/sync", error);
  }
}

export async function importFeed(form: FormData) {
  await requireAdmin();
  try {
    const advertiserId = Number(form.get("advertiser_id") || 0);
    if (!advertiserId) throw new Error("Choose an advertiser.");
    const payload = JSON.parse(str(form, "json")) as unknown;
    let source = (await one<SyncSource>("SELECT * FROM sync_sources WHERE advertiser_id = ? AND endpoint_url = 'manual://import'", advertiserId));
    if (!source) {
      const id = (await run(
        `INSERT INTO sync_sources (name, advertiser_id, endpoint_url, api_key, created_at) VALUES ('Manual import', ?, 'manual://import', '', ?)`,
        advertiserId,
        nowUtc(),
      )).id;
      source = (await one<SyncSource>("SELECT * FROM sync_sources WHERE id = ?", id));
    }
    if (!source) throw new Error("Could not save the import.");
    const message = await rememberSync(source, async () => (await applyOfferFeed(source, payload, false)));
    redirect(`/sync?ok=${encodeURIComponent(message)}`);
  } catch (error) {
    bubble(error);
    fail("/sync", error instanceof SyntaxError ? new Error("That is not valid JSON.") : error);
  }
}

export async function createPayout(form: FormData) {
  await requireAdmin();
  try {
    const affiliateId = Number(form.get("affiliate_id") || 0);
    const from = str(form, "from");
    const to = str(form, "to");
    if (!affiliateId || !from || !to) throw new Error("Choose an affiliate and a date range.");
    const range = istRange(from, to);
    const rows = (await all<{ id: number; payout: number; currency: string }>(
      `SELECT id, payout, currency FROM conversions
       WHERE affiliate_id = ? AND status = 'approved' AND payout_id IS NULL AND created_at >= ? AND created_at < ?`,
      affiliateId,
      range.start,
      range.end,
    ));
    if (!rows.length) throw new Error("No unpaid approved conversions in that range.");
    const groups = new Map<string, { ids: number[]; amount: number }>();
    for (const row of rows) {
      const group = groups.get(row.currency) || { ids: [], amount: 0 };
      group.ids.push(row.id);
      group.amount += row.payout;
      groups.set(row.currency, group);
    }
    const now = nowUtc();
    for (const [currency, group] of groups) {
      const payoutId = (await run(
        `INSERT INTO payouts (affiliate_id, period_start, period_end, amount, currency, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        affiliateId, from, to, Math.round(group.amount * 100) / 100, currency, str(form, "notes"), now,
      )).id;
      for (const conversionId of group.ids) (await run("UPDATE conversions SET payout_id = ? WHERE id = ?", payoutId, conversionId));
      (await postLedger({
        affiliateId,
        payoutId,
        kind: "payout",
        amount: -Math.round(group.amount * 100) / 100,
        currency,
        note: "Statement",
      }));
    }
    redirect(`/payouts?ok=${encodeURIComponent(`${groups.size} payout${groups.size === 1 ? "" : "s"} created`)}`);
  } catch (error) {
    bubble(error);
    fail("/payouts", error);
  }
}

export async function markPayoutPaid(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  (await run("UPDATE payouts SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'", nowUtc(), id));
  redirect(`/payouts/${id}?ok=Marked+paid`);
}

export async function voidPayout(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const payout = (await one<{ status: string; affiliate_id: number; amount: number; currency: string }>(
    "SELECT status, affiliate_id, amount, currency FROM payouts WHERE id = ?",
    id,
  ));
  if (payout?.status !== "pending") redirect(`/payouts/${id}?error=Paid+payouts+stay+on+record`);
  if (payout && (await setting("ledger_built", "")) === "1") {
    (await postLedger({
      affiliateId: payout.affiliate_id,
      payoutId: id,
      kind: "void",
      amount: payout.amount,
      currency: payout.currency,
      note: "Statement voided",
    }));
  }
  (await run("UPDATE conversions SET payout_id = NULL WHERE payout_id = ?", id));
  (await run("DELETE FROM payouts WHERE id = ?", id));
  redirect("/payouts?ok=Payout+voided");
}

export async function saveFraudRule(form: FormData) {
  await requireAdmin();
  try {
    const name = str(form, "name");
    if (!name) throw new Error("Name the rule.");
    const metric = oneOf(str(form, "metric"), ["burst", "bot", "cr"], "burst");
    const actionName = oneOf(str(form, "action"), ["flag", "reject", "pause"], "flag");
    const status = oneOf(str(form, "status"), ["active", "paused"], "active");
    const threshold = optionalNumber(form, "threshold") ?? (metric === "cr" ? 40 : 30);
    const minutes = optionalNumber(form, "window_minutes") ?? 60;
    const id = Number(form.get("id") || 0);
    if (id) {
      (await run(
        "UPDATE fraud_rules SET name = ?, metric = ?, threshold = ?, window_minutes = ?, action = ?, status = ? WHERE id = ?",
        name, metric, threshold, minutes, actionName, status, id,
      ));
    } else {
      (await run(
        "INSERT INTO fraud_rules (name, metric, threshold, window_minutes, action, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        name, metric, threshold, minutes, actionName, status, nowUtc(),
      ));
    }
    redirect("/fraud?ok=Rule+saved");
  } catch (error) {
    bubble(error);
    fail("/fraud", error);
  }
}

export async function deleteFraudRule(form: FormData) {
  await requireAdmin();
  (await run("DELETE FROM fraud_rules WHERE id = ?", Number(form.get("id") || 0)));
  redirect("/fraud?ok=Rule+removed");
}

export async function rotateApiToken() {
  const user = await requireUser();
  const token = randomBytes(24).toString("hex");
  (await run("UPDATE users SET api_token = ? WHERE id = ?", token, user.id));
  redirect(`${user.role === "admin" ? "/settings" : user.role === "advertiser" ? "/brand" : "/portal/postback"}?ok=API+token+saved`);
}

export async function saveSettings(form: FormData) {
  const admin = await requireAdmin();
  try {
    const base = httpUrl(str(form, "base_url"), "Tracking domain", true).replace(/\/$/, "");
    const currency = (str(form, "currency") || "USD").toUpperCase().slice(0, 3);
    const limit = optionalNumber(form, "fraud_click_limit") ?? 30;
    const minutes = optionalNumber(form, "fraud_window_minutes") ?? 10;
    (await run("INSERT INTO settings (key, value) VALUES ('base_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", base));
    (await run("INSERT INTO settings (key, value) VALUES ('currency', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", currency));
    (await run("INSERT INTO settings (key, value) VALUES ('company_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", str(form, "company_name") || "ADMEXO"));
    (await run("INSERT INTO settings (key, value) VALUES ('fraud_click_limit', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", String(limit)));
    (await run("INSERT INTO settings (key, value) VALUES ('fraud_window_minutes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", String(minutes)));
    (await run(
      "INSERT INTO settings (key, value) VALUES ('block_fraud_clicks', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      form.get("block_fraud_clicks") ? "1" : "0",
    ));
    (await run("DELETE FROM blocked_ips"));
    const seen = new Set<string>();
    for (const line of str(form, "blocked_ips").split(/\s+/)) {
      const ip = line.trim();
      if (!ip || seen.has(ip)) continue;
      seen.add(ip);
      (await run("INSERT INTO blocked_ips (ip, reason, created_at) VALUES (?, '', ?)", ip, nowUtc()));
    }
    const password = str(form, "password");
    if (password) {
      if (password.length < 6) throw new Error("Your new password must be at least 6 characters.");
      (await run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), admin.id));
    }
    redirect("/settings?ok=Settings+saved");
  } catch (error) {
    bubble(error);
    fail("/settings", error);
  }
}

export async function runLinkTest(prev: unknown, form: FormData) {
  await requireAdmin();
  const offerId = Number(form.get("offer_id") || 0);
  const offer = offerId ? (await one<Offer>("SELECT * FROM offers WHERE id = ?", offerId)) : undefined;
  const url = str(form, "url") || offer?.offer_url || "";
  const result = await testRedirects(url, oneOf(str(form, "device"), ["desktop", "mobile", "tablet"], "desktop"));
  let pausedOffer = false;
  if (offer && form.get("pause_if_unhealthy") && !result.ok) {
    (await pauseOffer(offer.id));
    pausedOffer = true;
  }
  return { ...result, pausedOffer };
}

export async function requestAccess(form: FormData) {
  const { affiliate } = await requireAffiliate();
  const offerId = Number(form.get("offer_id") || 0);
  const offer = (await one<Offer>("SELECT * FROM offers WHERE id = ?", offerId));
  if (!offer || offer.visibility !== "approval") redirect("/portal/offers?error=This+offer+cannot+be+requested");
  const existing = (await one("SELECT id FROM offer_access WHERE offer_id = ? AND affiliate_id = ?", offerId, affiliate.id));
  if (!existing) {
    (await run("INSERT INTO offer_access (offer_id, affiliate_id, status) VALUES (?, ?, 'pending')", offerId, affiliate.id));
  }
  redirect("/portal/offers?ok=Request+sent");
}

export async function saveOwnPostback(form: FormData) {
  const { affiliate } = await requireAffiliate();
  try {
    const postback = str(form, "postback_url");
    if (postback) httpUrl(postback, "Postback URL");
    (await run("UPDATE affiliates SET postback_url = ? WHERE id = ?", postback, affiliate.id));
    redirect("/portal/postback?ok=Postback+saved");
  } catch (error) {
    bubble(error);
    fail("/portal/postback", error);
  }
}

export async function portalHome() {
  const { affiliate } = await requireAffiliate();
  return affiliate;
}

export async function brandGuard() {
  return requireAdvertiser();
}

export async function trackingLinksForAffiliate(affiliate: Affiliate) {
  const offers = (await all<Offer>(
    `SELECT * FROM offers o WHERE o.status = 'active' AND (
      o.visibility = 'public' OR EXISTS (
        SELECT 1 FROM offer_access x WHERE x.offer_id = o.id AND x.affiliate_id = ? AND x.status = 'approved'
      )
    )`,
    affiliate.id,
  ));
  const base = await publicBase();
  const links = [];
  for (const offer of offers) links.push({ offer, code: await ensureLink(offer.id, affiliate.id), base });
  return links;
}
