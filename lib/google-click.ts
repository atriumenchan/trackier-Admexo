import { lookup } from "dns/promises";
import { after } from "next/server";
import { CERTIFIED_PATHS, OWNED_DOMAINS } from "../compliance/google-transparency.config";
import { all, one, run } from "@/lib/db";
import { runAfterResponse } from "@/lib/defer";
import { nowUtc, shortCode } from "@/lib/format";
import { decideClickFraud } from "@/lib/fraud";
import certifiedFile from "../compliance/certified-trackers.json";
import { asCertifiedTrackers } from "@/lib/certified-trackers";
import { googleFailure, googleRedirect, rawQueryParam, readGoogleRequest, resolveGoogleTarget } from "@/lib/google-transparency";
import { TargetError, assertFinalUrl, decodeOnce, rejectResolvedAddress, targetMessage } from "@/lib/google-target";
import { addRollup, rollupDay } from "@/lib/rollup";
import { scheduleOpen } from "@/lib/rules";
import { clickCapHit, countryAllowed, detectClient, deviceAllowed, publisherClickCapHit } from "@/lib/tracking";
import type { Affiliate, Offer } from "@/lib/types";

const wrapped = new Set<string>();

export function markWrapped(path: string) {
  wrapped.add(path);
}

export function assertClickRoutesWrapped() {
  for (const routePath of CERTIFIED_PATHS) {
    if (!wrapped.has(routePath)) throw new Error(`Click route ${routePath} is missing the Google transparency hook.`);
  }
}

async function resolveHost(host: string) {
  let rows: { address: string }[] = [];
  try {
    rows = await lookup(host, { all: true });
  } catch {
    throw new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
  }
  if (!rows.length) throw new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
  for (const row of rows) rejectResolvedAddress(row.address);
}

async function loadContext(code: string, kind: "link" | "smart") {
  if (kind === "link") {
    const link = await one<{ id: number; offer_id: number; affiliate_id: number }>("SELECT * FROM tracking_links WHERE code = ?", code);
    if (!link) return null;
    const offer = await one<Offer>("SELECT * FROM offers WHERE id = ?", link.offer_id);
    const affiliate = await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", link.affiliate_id);
    if (!offer || !affiliate) return null;
    return { offer, affiliate, linkId: link.id, smartLinkId: null as number | null };
  }
  const smart = await one<{ id: number; affiliate_id: number; status: string }>("SELECT * FROM smart_links WHERE code = ?", code);
  if (!smart) return null;
  const affiliate = await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", smart.affiliate_id);
  const child = await one<{ offer_id: number }>("SELECT offer_id FROM smart_link_offers WHERE smart_link_id = ? ORDER BY offer_id LIMIT 1", smart.id);
  if (!affiliate || !child) return null;
  const offer = await one<Offer>("SELECT * FROM offers WHERE id = ?", child.offer_id);
  if (!offer) return null;
  // ASSUMPTION: the click is stored against the first attached offer so the row has an offer id. The Location does not use that offer.
  return { offer, affiliate, linkId: null as number | null, smartLinkId: smart.id };
}

async function reportFlags(req: Request, offer: Offer, affiliate: Affiliate) {
  const ua = req.headers.get("user-agent") || "";
  const country = (req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const { device, os } = detectClient(ua);
  const reasons: string[] = [];
  if (affiliate.status !== "active" || offer.status !== "active") reasons.push("not_approved");
  if (!deviceAllowed(offer, device)) reasons.push("device_mismatch");
  if (!countryAllowed(offer, /^[A-Z]{2}$/.test(country) ? country : "")) reasons.push("geo_mismatch");
  if (!scheduleOpen({ days: offer.schedule_days || "", startHour: offer.schedule_start_hour, endHour: offer.schedule_end_hour })) reasons.push("schedule_mismatch");
  if ((await clickCapHit(offer)) || (await publisherClickCapHit(offer, affiliate.id))) reasons.push("over_cap");
  const fraud = await decideClickFraud({ ip, userAgent: ua, offerId: offer.id });
  if (fraud.fraud) reasons.push("fraud_suspect");
  return { reasons, device, os, ip, ua, country: /^[A-Z]{2}$/.test(country) ? country : "", fraud: fraud.fraud ? 1 : 0, fraudReason: fraud.reason };
}

function inboundValue(url: URL, name: string) {
  const raw = rawQueryParam(url.search, name);
  if (!raw) return "";
  try {
    return decodeOnce(raw).slice(0, 200);
  } catch {
    return "";
  }
}

function inboundParams(url: URL) {
  return {
    sub1: inboundValue(url, "sub1"),
    sub2: inboundValue(url, "sub2"),
    sub3: inboundValue(url, "sub3"),
    sub4: inboundValue(url, "sub4"),
    sub5: inboundValue(url, "sub5"),
    sub6: inboundValue(url, "sub6"),
    sub7: inboundValue(url, "sub7"),
    sub8: inboundValue(url, "sub8"),
    sub9: inboundValue(url, "sub9"),
    sub10: inboundValue(url, "sub10"),
    gclid: inboundValue(url, "gclid"),
    creative: inboundValue(url, "creative"),
    vtDevice: inboundValue(url, "device"),
    vtCampaign: inboundValue(url, "campaignid"),
  };
}

function logRejection(req: Request, error: TargetError) {
  const url = new URL(req.url);
  runAfterResponse(async () => {
    await run(
      "INSERT INTO google_rejections (error_code, path, host, created_at) VALUES (?, ?, ?, ?)",
      error.code,
      url.pathname.slice(0, 200),
      url.host.slice(0, 200),
      nowUtc(),
    );
  }, (task) => after(() => task));
}

function failGoogle(req: Request, error: TargetError) {
  logRejection(req, error);
  return googleFailure(error);
}

async function controlledHosts() {
  try {
    const verified = await all<{ host: string }>("SELECT host FROM google_domains WHERE status = 'verified'");
    return [...OWNED_DOMAINS, ...verified.map((row) => row.host)];
  } catch {
    return [...OWNED_DOMAINS];
  }
}

export async function enforceGoogleClick(req: Request, code: string, kind: "link" | "smart") {
  const requestUrl = new URL(req.url);
  const read = readGoogleRequest(requestUrl);
  if (!read.active) return null;
  if ("error" in read) return failGoogle(req, read.error);
  const clickId = shortCode(12);
  const context = await loadContext(code, kind);
  const campaignId = context ? String(context.offer.id) : code;
  let resolved: ReturnType<typeof resolveGoogleTarget>;
  try {
    resolved = resolveGoogleTarget({ target: read.target, clickId, campaignId, trackers: asCertifiedTrackers(certifiedFile), ownHosts: await controlledHosts() });
    for (const host of resolved.hosts) await resolveHost(host);
  } catch (error) {
    const coded = error instanceof TargetError ? error : new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
    return failGoogle(req, coded);
  }
  if (context?.offer.google_strict) {
    try {
      assertFinalUrl(resolved.landingHost, context.offer.final_url || "");
    } catch (error) {
      const coded = error instanceof TargetError ? error : new TargetError("FINAL_URL_MISMATCH", targetMessage("FINAL_URL_MISMATCH"));
      return failGoogle(req, coded);
    }
  }
  const location = resolved.location;
  const inbound = inboundParams(requestUrl);
  if (context) {
    const offer = context.offer;
    const affiliate = context.affiliate;
    const linkId = context.linkId;
    const smartLinkId = context.smartLinkId;
    runAfterResponse(async () => {
      const flag = await reportFlags(req, offer, affiliate);
      if (resolved.warning) flag.reasons.push(resolved.warning);
      const blocked = flag.reasons.join(",");
      const createdAt = nowUtc();
      await run(
        `INSERT INTO clicks (
          id, link_id, smart_link_id, offer_id, affiliate_id, ip, user_agent, country, device, os, referrer,
          sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8, sub9, sub10, gclid, creative, vt_device, vt_campaign,
          fraud_flag, fraud_reason, blocked_reason, destination, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        clickId,
        linkId,
        smartLinkId,
        offer.id,
        affiliate.id,
        flag.ip.slice(0, 80),
        flag.ua.slice(0, 400),
        flag.country,
        flag.device,
        flag.os,
        (req.headers.get("referer") || "").slice(0, 400),
        inbound.sub1, inbound.sub2, inbound.sub3, inbound.sub4, inbound.sub5, inbound.sub6, inbound.sub7, inbound.sub8, inbound.sub9, inbound.sub10,
        inbound.gclid, inbound.creative, inbound.vtDevice, inbound.vtCampaign,
        flag.fraud,
        flag.fraudReason,
        blocked,
        location,
        createdAt,
      );
      if (!blocked && !flag.fraud) await addRollup(rollupDay(createdAt), offer.id, affiliate.id, { clicks: 1 });
    }, (task) => after(() => task));
  }
  return googleRedirect(location);
}
