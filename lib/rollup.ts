import { all, istDay, one, putSetting, run, setting } from "@/lib/db";
import { addDays, istDate, istToday } from "@/lib/format";

export async function ensureRollups() {
  if ((await setting("rollup_built", "")) === "1") return;
  (await run("DELETE FROM traffic_rollups WHERE day <> ''"));
  const clicks = (await all<{ day: string; offer_id: number; affiliate_id: number; clicks: number }>(
    `SELECT ${istDay("created_at")} AS day, offer_id, affiliate_id, COUNT(*) AS clicks
     FROM clicks WHERE blocked_reason = '' AND fraud_flag = 0
     GROUP BY 1, offer_id, affiliate_id`,
  ));
  for (const row of clicks) (await upsert(row.day, row.offer_id, row.affiliate_id, { clicks: row.clicks }));
  const conversions = (await all<{ day: string; offer_id: number; affiliate_id: number; conversions: number; revenue: number; payout: number }>(
    `SELECT ${istDay("created_at")} AS day, offer_id, affiliate_id, COUNT(*) AS conversions,
            COALESCE(SUM(revenue), 0) AS revenue, COALESCE(SUM(payout), 0) AS payout
     FROM conversions WHERE status = 'approved'
     GROUP BY 1, offer_id, affiliate_id`,
  ));
  for (const row of conversions) {
    (await upsert(row.day, row.offer_id, row.affiliate_id, {
      conversions: row.conversions,
      revenue: row.revenue,
      payout: row.payout,
    }));
  }
  (await putSetting("rollup_built", "1"));
}

export async function addRollup(
  day: string,
  offerId: number,
  affiliateId: number,
  delta: { clicks?: number; conversions?: number; revenue?: number; payout?: number },
) {
  if (!day || (await setting("rollup_built", "")) !== "1") return;
  (await upsert(day, offerId, affiliateId, delta));
}

async function upsert(
  day: string,
  offerId: number,
  affiliateId: number,
  delta: { clicks?: number; conversions?: number; revenue?: number; payout?: number },
) {
  (await run(
    `INSERT INTO traffic_rollups (day, offer_id, affiliate_id, clicks, conversions, revenue, payout)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day, offer_id, affiliate_id) DO UPDATE SET
       clicks = traffic_rollups.clicks + excluded.clicks,
       conversions = traffic_rollups.conversions + excluded.conversions,
       revenue = traffic_rollups.revenue + excluded.revenue,
       payout = traffic_rollups.payout + excluded.payout`,
    day,
    offerId,
    affiliateId,
    delta.clicks || 0,
    delta.conversions || 0,
    delta.revenue || 0,
    delta.payout || 0,
  ));
}

export async function rollupRange(from: string, to: string) {
  (await ensureRollups());
  return (await one<{ clicks: number; conversions: number; revenue: number; payout: number }>(
    `SELECT COALESCE(SUM(clicks), 0) AS clicks, COALESCE(SUM(conversions), 0) AS conversions,
            COALESCE(SUM(revenue), 0) AS revenue, COALESCE(SUM(payout), 0) AS payout
     FROM traffic_rollups WHERE day >= ? AND day <= ?`,
    from,
    to,
  )) || { clicks: 0, conversions: 0, revenue: 0, payout: 0 };
}

export async function rollupSeries(days: number) {
  (await ensureRollups());
  const today = istToday();
  const from = addDays(today, -(days - 1));
  const rows = (await all<{ day: string; clicks: number; conversions: number; revenue: number; payout: number }>(
    `SELECT day, COALESCE(SUM(clicks), 0) AS clicks, COALESCE(SUM(conversions), 0) AS conversions,
            COALESCE(SUM(revenue), 0) AS revenue, COALESCE(SUM(payout), 0) AS payout
     FROM traffic_rollups WHERE day >= ? AND day <= ? GROUP BY day`,
    from,
    today,
  ));
  const map = new Map(rows.map((row) => [row.day, row]));
  const series = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = addDays(today, -index);
    const row = map.get(day);
    series.push({
      day: day.slice(5),
      clicks: row?.clicks ?? 0,
      conversions: row?.conversions ?? 0,
      revenue: row?.revenue ?? 0,
      payout: row?.payout ?? 0,
    });
  }
  return series;
}

export async function rollupOffers(from: string, to: string) {
  (await ensureRollups());
  return (await all<{ bucket_id: string; bucket: string; clicks: number; conversions: number; revenue: number; payout: number }>(
    `SELECT CAST(r.offer_id AS TEXT) AS bucket_id, o.name AS bucket,
            COALESCE(SUM(r.clicks), 0) AS clicks, COALESCE(SUM(r.conversions), 0) AS conversions,
            COALESCE(SUM(r.revenue), 0) AS revenue, COALESCE(SUM(r.payout), 0) AS payout
     FROM traffic_rollups r JOIN offers o ON o.id = r.offer_id
     WHERE r.day >= ? AND r.day <= ?
     GROUP BY r.offer_id, o.name
     ORDER BY revenue DESC, clicks DESC`,
    from,
    to,
  ));
}

export function rollupDay(stamp: string) {
  return istDate(stamp);
}
