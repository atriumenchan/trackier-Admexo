import { apiUser, unauthorized } from "@/lib/api-auth";
import { all } from "@/lib/db";
import { asCertifiedTrackers } from "@/lib/certified-trackers";
import certifiedFile from "../../../../compliance/certified-trackers.json";
import { checkGoogleTemplate, probeAgrees } from "@/lib/google-policy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user || user.role !== "admin") return unauthorized();
  const body = await req.json().catch(() => null) as { template?: string; finalUrl?: string; probe?: boolean } | null;
  if (!body?.template || !body.finalUrl) return Response.json({ error: "template and finalUrl are required." }, { status: 400 });
  const verified = await all<{ host: string }>("SELECT host FROM google_domains WHERE status = 'verified'");
  const report = checkGoogleTemplate({
    template: body.template,
    finalUrl: body.finalUrl,
    verifiedHosts: verified.map((row) => row.host),
    trackers: asCertifiedTrackers(certifiedFile),
  });
  let probe = null;
  if (body.probe) {
    const response = await fetch(report.probeUrl, { redirect: "manual" });
    const location = response.headers.get("location");
    const text = response.status === 302 ? "" : await response.text();
    probe = { status: response.status, location, agrees: probeAgrees(location, response.status, text, body.finalUrl) };
  }
  return Response.json({ ...report, probe });
}
