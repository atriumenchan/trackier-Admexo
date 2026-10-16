import { refreshGoogleDomains, runGoogleCanary } from "@/lib/google-canary";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const header = req.headers.get("authorization") || "";
  if (!secret || header !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  await refreshGoogleDomains();
  const report = await runGoogleCanary();
  return Response.json({ pass: report.pass, at: report.at, checks: report.results.length });
}
