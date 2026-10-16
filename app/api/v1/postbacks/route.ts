import { apiUser, unauthorized } from "@/lib/api-auth";
import { recordConversion } from "@/lib/tracking";

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user || user.role !== "advertiser" || !user.advertiser_id) return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.click_id !== "string") return Response.json({ error: "click_id is required." }, { status: 400 });
  const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  const result = await recordConversion({
    clickId: body.click_id,
    txid: typeof body.txid === "string" ? body.txid : "",
    goal: typeof body.goal === "string" ? body.goal : "",
    status: typeof body.status === "string" ? body.status : "approved",
    payout: numberOrNull(body.payout),
    revenue: numberOrNull(body.revenue),
    amount: numberOrNull(body.amount),
    advertiserId: user.advertiser_id,
    sourceUrl: "api",
  });
  return Response.json({ ok: result.ok, message: result.message }, { status: result.http });
}
