import { apiUser, unauthorized } from "@/lib/api-auth";
import { all } from "@/lib/db";
import { listClicks } from "@/lib/queries";
import type { Click } from "@/lib/types";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") || 1) || 1);
  if (user.role === "advertiser" && user.advertiser_id) {
    const offset = (page - 1) * 50;
    const rows = await all<Click>(
      `SELECT c.*, o.name AS offer_name, f.name AS affiliate_name
       FROM clicks c JOIN offers o ON o.id = c.offer_id JOIN affiliates f ON f.id = c.affiliate_id
       WHERE o.advertiser_id = ? ORDER BY c.created_at DESC LIMIT 50 OFFSET ?`,
      user.advertiser_id,
      offset,
    );
    return Response.json(rows);
  }
  const affiliateId = user.role === "affiliate" ? user.affiliate_id || undefined : undefined;
  return Response.json(await listClicks({ page, affiliateId }));
}
