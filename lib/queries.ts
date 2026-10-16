import { all, istDay, one, setting } from "@/lib/db";
import { addDays, istRange, istToday } from "@/lib/format";
import { rollupOffers, rollupRange, rollupSeries } from "@/lib/rollup";
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

export async function listClicks(filters: { offerId?: number; affiliateId?: number; from?: string; to?: string; fraud?: boolean; page?: number; capped?: boolean }) {
  const where = ["1 = 1"];
  const params: Array<string | number | null> = [];
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
  ));
}

export async function listConversions(filters: { offerId?: number; affiliateId?: number; status?: string; from?: string; to?: string; page?: number; capped?: boolean }) {
  const where = ["1 = 1"];
  const params: Array<string | number | null> = [];
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
  return (await all<Conversion>(
    `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name
     FROM conversions c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC${limit}`,
    ...params,
  ));
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

export async function report(group: string, from: string, to: string, page?: number): Promise<ReportRow[]> {
  const range = istRange(from, to);
  const clickGroup = group === "offer"
    ? { id: "CAST(o.id AS TEXT)", label: "o.name" }
    : group === "affiliate"
      ? { id: "CAST(f.id AS TEXT)", label: "f.name" }
      : group === "country"
        ? { id: "CASE WHEN c.country = '' THEN 'Unknown' ELSE c.country END", label: "CASE WHEN c.country = '' THEN 'Unknown' ELSE c.country END" }
        : group === "device"
          ? { id: "CASE WHEN c.device = '' THEN 'Unknown' ELSE c.device END", label: "CASE WHEN c.device = '' THEN 'Unknown' ELSE c.device END" }
          : { id: istDay("c.created_at"), label: istDay("c.created_at") };
  const conversionGroup = group === "offer"
    ? { id: "CAST(o.id AS TEXT)", label: "o.name" }
    : group === "affiliate"
      ? { id: "CAST(f.id AS TEXT)", label: "f.name" }
      : group === "country"
        ? { id: "(SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END FROM clicks WHERE id = c.click_id)", label: "(SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END FROM clicks WHERE id = c.click_id)" }
        : group === "device"
          ? { id: "(SELECT CASE WHEN device = '' THEN 'Unknown' ELSE device END FROM clicks WHERE id = c.click_id)", label: "(SELECT CASE WHEN device = '' THEN 'Unknown' ELSE device END FROM clicks WHERE id = c.click_id)" }
          : { id: istDay("c.created_at"), label: istDay("c.created_at") };

  const clicks = (await all<{ bucket_id: string; bucket: string; clicks: number }>(
    `SELECT ${clickGroup.id} AS bucket_id, ${clickGroup.label} AS bucket, COUNT(*) AS clicks
     FROM clicks c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE c.created_at >= ? AND c.created_at < ? AND c.blocked_reason = '' AND c.fraud_flag = 0
     GROUP BY 1, 2`,
    range.start,
    range.end,
  ));
  const conversions = (await all<{ bucket_id: string; bucket: string; conversions: number; revenue: number; payout: number }>(
    `SELECT ${conversionGroup.id} AS bucket_id, ${conversionGroup.label} AS bucket, COUNT(*) AS conversions, COALESCE(SUM(c.revenue), 0) AS revenue, COALESCE(SUM(c.payout), 0) AS payout
     FROM conversions c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE c.created_at >= ? AND c.created_at < ? AND c.status = 'approved'
     GROUP BY 1, 2`,
    range.start,
    range.end,
  ));
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
  const sorted = group === "day" ? rows.sort((a, b) => a.bucket.localeCompare(b.bucket)) : rows.sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
  if (!page) return sorted;
  const window = paging(page);
  return sorted.slice(window.offset, window.offset + window.limit);
}

export async function dashboard() {
  const today = istToday();
  const weekFrom = addDays(today, -6);
  const pending = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM offer_access WHERE status = 'pending'"))?.n ?? 0;
  const currency = (await setting("currency", "USD"));
  const top = (await rollupOffers(weekFrom, today)).slice(0, 5);
  return {
    today: (await rollupRange(today, today)),
    week: (await rollupRange(weekFrom, today)),
    series: (await rollupSeries(14)),
    pending,
    currency,
    recent: (await listConversions({})).slice(0, 8),
    topOffers: top.map((row) => ({ bucket: row.bucket, bucketId: row.bucket_id, clicks: row.clicks, conversions: row.conversions, revenue: row.revenue, payout: row.payout })),
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
