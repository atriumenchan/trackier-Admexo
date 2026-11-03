import { all, istDay, istHour, istMonth, one, setting } from "@/lib/db";
import { addDays, istRange, istToday } from "@/lib/format";
import { ensureRollups, rollupOffers, rollupRange, rollupSeries } from "@/lib/rollup";
import { unpackClick, unpackConversion } from "@/lib/traffic-meta";
import type {
  Advertiser,
  Affiliate,
  Click,
  Conversion,
  Offer,
  OfferAccess,
  OfferGoal,
  Payout,
  PostbackLog,
  SmartLink,
  SmartLinkOffer,
  SyncSource,
  TrackingLink,
} from "@/lib/types";

function like(q: string) {
  return `%${q.replace(/[%_]/g, "")}%`;
}

export async function listAdvertisers(q = "") {
  if (!q) return (await all<Advertiser>("SELECT * FROM advertisers ORDER BY name"));
  return (await all<Advertiser>("SELECT * FROM advertisers WHERE name LIKE ? OR company LIKE ? OR email LIKE ? ORDER BY name", like(q), like(q), like(q)));
}

export async function getAdvertiser(id: number) {
  return (await one<Advertiser>("SELECT * FROM advertisers WHERE id = ?", id));
}

export async function listAffiliates(q = "") {
  if (!q) return (await all<Affiliate>("SELECT * FROM affiliates ORDER BY name"));
  return (await all<Affiliate>("SELECT * FROM affiliates WHERE name LIKE ? OR company LIKE ? OR email LIKE ? ORDER BY name", like(q), like(q), like(q)));
}

export async function getAffiliate(id: number) {
  return (await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", id));
}

export async function listOffers(q = "") {
  const sql = `SELECT o.*, a.name AS advertiser_name FROM offers o JOIN advertisers a ON a.id = o.advertiser_id`;
  if (!q) return (await all<Offer>(`${sql} ORDER BY o.updated_at DESC`));
  return (await all<Offer>(`${sql} WHERE o.name LIKE ? OR a.name LIKE ? ORDER BY o.updated_at DESC`, like(q), like(q)));
}

export async function getOffer(id: number) {
  return (await one<Offer>(
    `SELECT o.*, a.name AS advertiser_name FROM offers o JOIN advertisers a ON a.id = o.advertiser_id WHERE o.id = ?`,
    id,
  ));
}

export async function offerGoals(offerId: number) {
  return (await all<OfferGoal>("SELECT * FROM offer_goals WHERE offer_id = ? ORDER BY is_default DESC, id", offerId));
}

export async function offerAccess(offerId: number) {
  return (await all<OfferAccess>(
    `SELECT x.*, f.name AS affiliate_name FROM offer_access x JOIN affiliates f ON f.id = x.affiliate_id
     WHERE x.offer_id = ? ORDER BY f.name`,
    offerId,
  ));
}

export async function offerLinks(offerId: number) {
  return (await all<TrackingLink>(
    `SELECT t.*, f.name AS affiliate_name FROM tracking_links t JOIN affiliates f ON f.id = t.affiliate_id
     WHERE t.offer_id = ? ORDER BY f.name`,
    offerId,
  ));
}

const PAGE_SIZE = 50;

function paging(page?: number) {
  const current = Math.max(1, page || 1);
  return { current, limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE };
}

export async function listClicks(filters: { offerId?: number; affiliateId?: number; advertiserId?: number; country?: string; from?: string; to?: string; fraud?: boolean; page?: number; capped?: boolean }) {
  const where = ["1 = 1"];
  const params: Array<string | number | null> = [];
  if (filters.advertiserId) {
    where.push("o.advertiser_id = ?");
    params.push(filters.advertiserId);
  }
  if (filters.country) {
    where.push("c.country = ?");
    params.push(filters.country.toUpperCase());
  }
  if (filters.offerId) {
    where.push("c.offer_id = ?");
    params.push(filters.offerId);
  }
  if (filters.affiliateId) {
    where.push("c.affiliate_id = ?");
    params.push(filters.affiliateId);
  }
  if (filters.from && filters.to) {
    const range = istRange(filters.from, filters.to);
    where.push("c.created_at >= ? AND c.created_at < ?");
    params.push(range.start, range.end);
  }
  if (filters.fraud) where.push("(c.fraud_flag = 1 OR c.blocked_reason != '')");
  const page = paging(filters.page);
  const limit = filters.capped === false ? "" : " LIMIT ? OFFSET ?";
  if (filters.capped !== false) params.push(page.limit, page.offset);
  return (await all<Click>(
    `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name
     FROM clicks c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC${limit}`,
    ...params,
  )).map((row) => unpackClick(row));
}

export async function listConversions(filters: { offerId?: number; affiliateId?: number; advertiserId?: number; country?: string; status?: string; from?: string; to?: string; page?: number; capped?: boolean }) {
  const where = ["1 = 1"];
  const params: Array<string | number | null> = [];
  if (filters.advertiserId) {
    where.push("o.advertiser_id = ?");
    params.push(filters.advertiserId);
  }
  if (filters.country) {
    where.push("k.country = ?");
    params.push(filters.country.toUpperCase());
  }
  if (filters.offerId) {
    where.push("c.offer_id = ?");
    params.push(filters.offerId);
  }
  if (filters.affiliateId) {
    where.push("c.affiliate_id = ?");
    params.push(filters.affiliateId);
  }
  if (filters.status) {
    where.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.from && filters.to) {
    const range = istRange(filters.from, filters.to);
    where.push("c.created_at >= ? AND c.created_at < ?");
    params.push(range.start, range.end);
  }
  const page = paging(filters.page);
  const limit = filters.capped === false ? "" : " LIMIT ? OFFSET ?";
  if (filters.capped !== false) params.push(page.limit, page.offset);
  const fx = Number((await setting("fx_rate", "1")) || "1") || 1;
  return (await all<Conversion & { click_user_agent?: string; click_created_at?: string }>(
    `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name,
      k.ip AS click_ip, k.country AS country, k.user_agent AS click_user_agent, k.created_at AS click_created_at, k.sub1 AS source
     FROM conversions c
     JOIN offers o ON o.id = c.offer_id
     JOIN affiliates f ON f.id = c.affiliate_id
     LEFT JOIN clicks k ON k.id = c.click_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC${limit}`,
    ...params,
  )).map((row) => {
    const click = unpackClick({ user_agent: row.click_user_agent || "", source: row.source || "" });
    const unpacked = unpackConversion({
      ...row,
      city: click.city,
      isp: click.isp,
      p1: click.p1,
      source: click.source || row.source || "",
    });
    if (!unpacked.payout_user || unpacked.payout_user === unpacked.payout) {
      unpacked.payout_user = Math.round((unpacked.payout || 0) * fx * 100) / 100;
    }
    return unpacked;
  });
}

export type TrafficDetail = Click & {
  advertiser_name?: string;
  offer_model?: string;
  conversion_id?: number | null;
  conversion_created_at?: string | null;
  conversion_ip?: string | null;
  conversion_status?: string | null;
  conversion_payout?: number | null;
  conversion_revenue?: number | null;
  conversion_currency?: string | null;
  conversion_txid?: string | null;
  conversion_postback?: string | null;
  conversion_reject?: string | null;
  conversion_meta?: string | null;
  goal_name?: string | null;
  method?: string;
  note?: string;
  goal_value?: number | null;
  elapsed_time?: number;
  payout_user?: number;
};

export async function listTrafficDetail(from: string, to: string) {
  const range = istRange(from, to);
  const fx = Number((await setting("fx_rate", "1")) || "1") || 1;
  const rows = await all<TrafficDetail>(
    `SELECT k.*, o.name AS offer_name, o.model AS offer_model, a.name AS advertiser_name, f.name AS affiliate_name,
      v.id AS conversion_id, v.created_at AS conversion_created_at, v.ip AS conversion_ip, v.status AS conversion_status,
      v.payout AS conversion_payout, v.revenue AS conversion_revenue, v.currency AS conversion_currency, v.txid AS conversion_txid,
      v.postback_status AS conversion_postback, v.reject_reason AS conversion_reject, v.fraud_reason AS conversion_meta,
      v.goal_name AS goal_name
     FROM clicks k
     JOIN offers o ON o.id = k.offer_id
     JOIN affiliates f ON f.id = k.affiliate_id
     LEFT JOIN advertisers a ON a.id = o.advertiser_id
     LEFT JOIN conversions v ON v.click_id = k.id
     WHERE k.created_at >= ? AND k.created_at < ?
     ORDER BY k.created_at DESC`,
    range.start,
    range.end,
  );
  return rows.map((row) => {
    const click = unpackClick(row);
    const converted = unpackConversion({
      fraud_reason: row.conversion_meta || "",
      payout: row.conversion_payout || 0,
      created_at: row.conversion_created_at || "",
      click_created_at: row.created_at,
      method: "",
      note: "",
      goal_value: null,
      elapsed_time: 0,
      payout_user: 0,
    });
    const payout = Number(row.conversion_payout || 0);
    const payoutUser = converted.payout_user && converted.payout_user !== payout
      ? converted.payout_user
      : Math.round(payout * fx * 100) / 100;
    return {
      ...click,
      method: converted.method,
      note: converted.note || row.conversion_reject || "",
      goal_value: converted.goal_value,
      elapsed_time: converted.elapsed_time,
      payout_user: payoutUser,
    };
  });
}

export async function listPostbacks(page = 1) {
  const window = paging(page);
  return (await all<PostbackLog>("SELECT * FROM postback_logs ORDER BY id DESC LIMIT ? OFFSET ?", window.limit, window.offset));
}

export async function listSmartLinks() {
  return (await all<SmartLink>(
    `SELECT s.*, f.name AS affiliate_name FROM smart_links s JOIN affiliates f ON f.id = s.affiliate_id ORDER BY s.id DESC`,
  ));
}

export async function getSmartLink(id: number) {
  return (await one<SmartLink>(
    `SELECT s.*, f.name AS affiliate_name FROM smart_links s JOIN affiliates f ON f.id = s.affiliate_id WHERE s.id = ?`,
    id,
  ));
}

export async function smartLinkOffers(id: number) {
  return (await all<SmartLinkOffer>(
    `SELECT s.*, o.name AS offer_name FROM smart_link_offers s JOIN offers o ON o.id = s.offer_id WHERE s.smart_link_id = ?`,
    id,
  ));
}

export async function listSyncSources() {
  return (await all<SyncSource>(
    `SELECT s.*, a.name AS advertiser_name FROM sync_sources s JOIN advertisers a ON a.id = s.advertiser_id ORDER BY s.id DESC`,
  ));
}

export async function listPayouts() {
  return (await all<Payout>(
    `SELECT p.*, f.name AS affiliate_name FROM payouts p JOIN affiliates f ON f.id = p.affiliate_id ORDER BY p.id DESC`,
  ));
}

export async function getPayout(id: number) {
  return (await one<Payout>(
    `SELECT p.*, f.name AS affiliate_name FROM payouts p JOIN affiliates f ON f.id = p.affiliate_id WHERE p.id = ?`,
    id,
  ));
}

export async function payoutConversions(id: number) {
  return (await all<Conversion>(
    `SELECT c.*, o.name AS offer_name FROM conversions c JOIN offers o ON o.id = c.offer_id WHERE c.payout_id = ? ORDER BY c.created_at`,
    id,
  ));
}

export type ReportRow = {
  bucket: string;
  bucketId: string;
  clicks: number;
  conversions: number;
  revenue: number;
  payout: number;
};

export type ReportFilter = { offerId?: number; affiliateId?: number; advertiserId?: number; country?: string };

export const REPORT_GROUPS = [
  ["day", "By day"],
  ["hour", "By hour"],
  ["month", "By month"],
  ["offer", "By offer"],
  ["affiliate", "By affiliate"],
  ["advertiser", "By advertiser"],
  ["goal", "By goal"],
  ["country", "By country"],
  ["device", "By device"],
  ["os", "By OS"],
  ["source", "By source (sub1)"],
] as const;

const TIME_GROUPS = new Set(["day", "hour", "month"]);

export function reportFilterFrom(get: (key: string) => string | null | undefined): ReportFilter {
  const id = (key: string) => Number(get(key) || 0) || undefined;
  const country = (get("country") || "").trim().toUpperCase();
  return {
    offerId: id("offer_id"),
    affiliateId: id("affiliate_id"),
    advertiserId: id("advertiser_id"),
    country: /^[A-Z]{2}$/.test(country) ? country : undefined,
  };
}

export function reportFilterQuery(filter: ReportFilter) {
  const query: Record<string, string> = {};
  if (filter.offerId) query.offer_id = String(filter.offerId);
  if (filter.affiliateId) query.affiliate_id = String(filter.affiliateId);
  if (filter.advertiserId) query.advertiser_id = String(filter.advertiserId);
  if (filter.country) query.country = filter.country;
  return query;
}

export function reportFileTag(filter: ReportFilter) {
  return [
    filter.offerId ? `offer${filter.offerId}` : "",
    filter.affiliateId ? `aff${filter.affiliateId}` : "",
    filter.advertiserId ? `adv${filter.advertiserId}` : "",
    filter.country ? filter.country.toLowerCase() : "",
  ].filter(Boolean).map((part) => `_${part}`).join("");
}

function reportDimension(group: string, time: string) {
  const text = (expr: string, empty: string) => {
    const value = `COALESCE(NULLIF(${expr}, ''), '${empty}')`;
    return { id: value, label: value };
  };
  if (group === "hour") return { id: istHour(time), label: istHour(time) };
  if (group === "month") return { id: istMonth(time), label: istMonth(time) };
  if (group === "offer") return { id: "CAST(o.id AS TEXT)", label: "o.name" };
  if (group === "affiliate") return { id: "CAST(f.id AS TEXT)", label: "f.name" };
  if (group === "advertiser") return { id: "CAST(a.id AS TEXT)", label: "a.name" };
  if (group === "country") return text("k.country", "Unknown");
  if (group === "device") return text("k.device", "Unknown");
  if (group === "os") return text("k.os", "Unknown");
  if (group === "source") return text("k.sub1", "(none)");
  return { id: istDay(time), label: istDay(time) };
}

export async function report(group: string, from: string, to: string, page?: number, filter: ReportFilter = {}): Promise<ReportRow[]> {
  const range = istRange(from, to);
  const scope = (alias: string) => {
    const where: string[] = [];
    const params: Array<string | number> = [];
    if (filter.offerId) {
      where.push(`${alias}.offer_id = ?`);
      params.push(filter.offerId);
    }
    if (filter.affiliateId) {
      where.push(`${alias}.affiliate_id = ?`);
      params.push(filter.affiliateId);
    }
    if (filter.advertiserId) {
      where.push("o.advertiser_id = ?");
      params.push(filter.advertiserId);
    }
    if (filter.country) {
      where.push("k.country = ?");
      params.push(filter.country.toUpperCase());
    }
    return { sql: where.map((item) => ` AND ${item}`).join(""), params };
  };
  const clickScope = scope("k");
  const conversionScope = scope("v");
  const clickDim = reportDimension(group, "k.created_at");
  const conversionDim = group === "goal"
    ? { id: "COALESCE(NULLIF(v.goal_name, ''), 'Default')", label: "COALESCE(NULLIF(v.goal_name, ''), 'Default')" }
    : reportDimension(group, "v.created_at");

  const [clicks, conversions] = await Promise.all([
    group === "goal"
      ? Promise.resolve([] as { bucket_id: string; bucket: string; clicks: number }[])
      : all<{ bucket_id: string; bucket: string; clicks: number }>(
        `SELECT ${clickDim.id} AS bucket_id, ${clickDim.label} AS bucket, COUNT(*) AS clicks
         FROM clicks k JOIN offers o ON o.id = k.offer_id JOIN affiliates f ON f.id = k.affiliate_id
         LEFT JOIN advertisers a ON a.id = o.advertiser_id
         WHERE k.created_at >= ? AND k.created_at < ? AND k.blocked_reason = '' AND k.fraud_flag = 0${clickScope.sql}
         GROUP BY 1, 2`,
        range.start,
        range.end,
        ...clickScope.params,
      ),
    all<{ bucket_id: string; bucket: string; conversions: number; revenue: number; payout: number }>(
      `SELECT ${conversionDim.id} AS bucket_id, ${conversionDim.label} AS bucket, COUNT(*) AS conversions,
        COALESCE(SUM(v.revenue), 0) AS revenue, COALESCE(SUM(v.payout), 0) AS payout
       FROM conversions v JOIN offers o ON o.id = v.offer_id JOIN affiliates f ON f.id = v.affiliate_id
       LEFT JOIN advertisers a ON a.id = o.advertiser_id
       LEFT JOIN clicks k ON k.id = v.click_id
       WHERE v.created_at >= ? AND v.created_at < ? AND v.status = 'approved'${conversionScope.sql}
       GROUP BY 1, 2`,
      range.start,
      range.end,
      ...conversionScope.params,
    ),
  ]);
  const map = new Map<string, ReportRow>();
  for (const row of clicks) {
    const key = row.bucket_id || "Unknown";
    map.set(key, { bucketId: key, bucket: row.bucket || "Unknown", clicks: row.clicks, conversions: 0, revenue: 0, payout: 0 });
  }
  for (const row of conversions) {
    const key = row.bucket_id || "Unknown";
    const current = map.get(key) || { bucketId: key, bucket: row.bucket || "Unknown", clicks: 0, conversions: 0, revenue: 0, payout: 0 };
    current.conversions = row.conversions;
    current.revenue = row.revenue;
    current.payout = row.payout;
    if (row.bucket) current.bucket = row.bucket;
    map.set(key, current);
  }
  const rows = [...map.values()];
  const sorted = TIME_GROUPS.has(group)
    ? rows.sort((a, b) => b.bucket.localeCompare(a.bucket))
    : rows.sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
  if (!page) return sorted;
  const window = paging(page);
  return sorted.slice(window.offset, window.offset + window.limit);
}

export async function reportCountries() {
  return (await all<{ country: string }>("SELECT DISTINCT country FROM clicks WHERE country != '' ORDER BY country")).map((row) => row.country);
}

export async function dashboard() {
  const today = istToday();
  await ensureRollups();
  return loadDashboard(today);
}

async function loadDashboard(today: string) {
  const weekFrom = addDays(today, -6);
  const [pendingRow, currency, top, todayStats, week, series] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) AS n FROM offer_access WHERE status = 'pending'"),
    setting("currency", "USD"),
    rollupOffers(weekFrom, today),
    rollupRange(today, today),
    rollupRange(weekFrom, today),
    rollupSeries(14),
  ]);
  return {
    today: todayStats,
    week,
    series,
    pending: pendingRow?.n ?? 0,
    currency,
    topOffers: top.slice(0, 5).map((row) => ({ bucket: row.bucket, bucketId: row.bucket_id, clicks: row.clicks, conversions: row.conversions, revenue: row.revenue, payout: row.payout })),
  };
}

export async function blockedIpText() {
  return (await all<{ ip: string }>("SELECT ip FROM blocked_ips ORDER BY ip")).map((row) => row.ip).join("\n");
}

export async function countClicks(offerId: number) {
  return (await one<{ n: number }>("SELECT COUNT(*) AS n FROM clicks WHERE offer_id = ?", offerId))?.n ?? 0;
}

export async function affiliateOffers(affiliateId: number) {
  return (await all<Offer & { access_status: string | null }>(
    `SELECT o.*, a.name AS advertiser_name,
      (SELECT status FROM offer_access WHERE offer_id = o.id AND affiliate_id = ?) AS access_status
     FROM offers o JOIN advertisers a ON a.id = o.advertiser_id
     WHERE o.status = 'active' AND (
       o.visibility = 'public'
       OR o.visibility = 'approval'
       OR EXISTS (SELECT 1 FROM offer_access x WHERE x.offer_id = o.id AND x.affiliate_id = ? AND x.status = 'approved')
     )
     ORDER BY o.name`,
    affiliateId,
    affiliateId,
  ));
}

export async function advertiserOffers(advertiserId: number) {
  return (await all<Offer>("SELECT * FROM offers WHERE advertiser_id = ? ORDER BY updated_at DESC", advertiserId));
}
