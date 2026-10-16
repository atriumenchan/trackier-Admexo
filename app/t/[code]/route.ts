import { enforceGoogleClick, markWrapped } from "@/lib/google-click";
import { handleTrackingClick } from "@/lib/tracking";

export const dynamic = "force-dynamic";

markWrapped("/t/:code");

async function respond(req: Request, code: string) {
  const transparent = await enforceGoogleClick(req, code, "link");
  if (transparent) return transparent;
  return handleTrackingClick(req, code, "link");
}

export async function GET(req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return respond(req, code);
}

export async function HEAD(req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return respond(req, code);
}
