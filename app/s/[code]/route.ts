import { handleTrackingClick } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return (await handleTrackingClick(req, code, "smart"));
}
