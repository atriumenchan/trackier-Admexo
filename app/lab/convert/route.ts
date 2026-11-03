import { one } from "@/lib/db";
import { recordConversion } from "@/lib/tracking";
import type { Click, Offer } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { click_id?: string; txid?: string; goal?: string } | null;
  const clickId = String(body?.click_id || "").trim();
  if (!clickId) return new Response("click_id is required.", { status: 400 });
  const click = await one<Click>("SELECT * FROM clicks WHERE id = ?", clickId);
  if (!click) return new Response("Unknown click id.", { status: 400 });
  const offer = await one<Offer>("SELECT * FROM offers WHERE id = ?", click.offer_id);
  if (!offer || !offer.offer_url.includes("/lab/landing")) {
    return new Response("This click is not from the lab landing.", { status: 403 });
  }
  const result = await recordConversion({
    clickId,
    txid: body?.txid || `order-${clickId}`,
    goal: body?.goal || "",
    status: "approved",
    sourceUrl: "/lab/convert",
    method: "lab",
  });
  return new Response(result.message, { status: result.http });
}
