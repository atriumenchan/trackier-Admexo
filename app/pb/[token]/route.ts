import { one } from "@/lib/db";
import { readPostbackParams, recordConversion } from "@/lib/tracking";
import type { Advertiser } from "@/lib/types";

export const dynamic = "force-dynamic";

async function handle(req: Request, token: string) {
  const advertiser = (await one<Advertiser>("SELECT * FROM advertisers WHERE postback_token = ?", token));
  const params = await readPostbackParams(req);
  if (!advertiser) {
    return new Response("Unknown postback token.", { status: 403 });
  }
  if (!params.clickId) return new Response("click_id is required.", { status: 400 });
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const result = await recordConversion({
    ...params,
    ip: forwarded,
    advertiserId: advertiser.id,
    sourceUrl: params.sourceUrl,
  });
  return new Response(result.message, { status: result.http });
}

export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return (await handle(req, token));
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return (await handle(req, token));
}
