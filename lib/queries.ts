import { all, istDay, one, setting } from "@/lib/db";
import { addDays, istRange, istToday } from "@/lib/format";
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

export async function listClicks(filters: { offerId?: number; affiliateId?: number; from?: string; to?: string; fraud?: boolean }) {
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
  return (await all<Click>(
    `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name
     FROM clicks c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC LIMIT 200`,
    ...params,
  ));
}

export async function listConversions(filters: { offerId?: number; affiliateId?: number; status?: string; from?: string; to?: string }) {
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
  return (await all<Conversion>(
    `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name
     FROM conversions c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC LIMIT 200`,
    ...params,
  ));
}

export async function listPostbacks() {
  return (await all<PostbackLog>("SELECT * FROM postback_logs ORDER BY id DESC LIMIT 200"));
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
  clicks: number;
  conversions: number;
  revenue: number;
  payout: number;
};

export async function report(group: string, from: string, to: string): Promise<ReportRow[]> {
  const range = istRange(from, to);
  const clickBucket =
    group === "offer"
      ? "o.name"
      : group === "affiliate"
        ? "f.name"
        : group === "country"
          ? "CASE WHEN c.country = '' THEN 'Unknown' ELSE c.country END"
          : group === "device"
            ? "c.device"
            : istDay("c.created_at");
  const conversionBucket =
    group === "offer"
      ? "o.name"
      : group === "affiliate"
        ? "f.name"
        : group === "country"
          ? "(SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END FROM clicks WHERE id = c.click_id)"
          : group === "device"
            ? "(SELECT device FROM clicks WHERE id = c.click_id)"
            : istDay("c.created_at");

  const clicks = (await all<{ bucket: string; clicks: number }>(
    `SELECT ${clickBucket} AS bucket, COUNT(*) AS clicks
     FROM clicks c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE c.created_at >= ? AND c.created_at < ? AND c.blocked_reason = '' AND c.fraud_flag = 0
     GROUP BY 1`,
    range.start,
    range.end,
  ));
  const conversions = (await all<{ bucket: string; conversions: number; revenue: number; payout: number }>(
    `SELECT ${conversionBucket} AS bucket, COUNT(*) AS conversions, COALESCE(SUM(c.revenue), 0) AS revenue, COALESCE(SUM(c.payout), 0) AS payout
     FROM conversions c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
     WHERE c.created_at >= ? AND c.created_at < ? AND c.status = 'approved'
     GROUP BY 1`,
    range.start,
    range.end,
  ));
  const map = new Map<string, ReportRow>();
  for (const row of clicks) {
    map.set(row.bucket || "Unknown", { bucket: row.bucket || "Unknown", clicks: row.clicks, conversions: 0, revenue: 0, payout: 0 });
  }
  for (const row of conversions) {
    const key = row.bucket || "Unknown";
    const current = map.get(key) || { bucket: key, clicks: 0, conversions: 0, revenue: 0, payout: 0 };
    current.conversions = row.conversions;
    current.revenue = row.revenue;
    current.payout = row.payout;
    map.set(key, current);
  }
  const rows = [...map.values()];
  if (group === "day") return rows.sort((a, b) => a.bucket.localeCompare(b.bucket));
  return rows.sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
}

export async function dashboard() {
  const today = istToday();
  const start = istRange(today, today);
  const weekFrom = addDays(today, -6);
  const week = istRange(weekFrom, today);
  const totals = async (from: string, to: string) => {
    const clicks = (await one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM clicks WHERE created_at >= ? AND created_at < ? AND blocked_reason = '' AND fraud_flag = 0",
      from,
      to,
    ))?.n ?? 0;
    const money = (await one<{ n: number; revenue: number; payout: number }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(revenue), 0) AS revenue, COALESCE(SUM(payout), 0) AS payout
       FROM conversions WHERE created_at >= ? AND created_at < ? AND status = 'approved'`,
      from,
      to,
    ));
    return {
      clicks,
      conversions: money?.n ?? 0,
      revenue: money?.revenue ?? 0,
      payout: money?.payout ?? 0,
    };
  };
  const series = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const range = istRange(day, day);
    const point = (await totals(range.start, range.end));
    series.push({ day: day.slice(5), ...point });
  }
  const pending = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM offer_access WHERE status = 'pending'"))?.n ?? 0;
  const currency = (await setting("currency", "USD"));
  return {
    today: (await totals(start.start, start.end)),
    week: (await totals(week.start, week.end)),
    series,
    pending,
    currency,
    recent: (await listConversions({})).slice(0, 8),
    topOffers: (await report("offer", weekFrom, today)).slice(0, 5),
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
