import { clip } from "@/lib/format";

export type Geo = { city: string; country: string; isp: string; org?: string; asn?: number | null };

function privateIp(ip: string) {
  return !ip
    || ip === "::1"
    || ip.startsWith("127.")
    || ip.startsWith("10.")
    || ip.startsWith("192.168.")
    || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    || ip.startsWith("fc")
    || ip.startsWith("fd");
}

export function geoFromHeaders(req: Request): Geo {
  const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") || req.headers.get("cf-ipcity") || "").replace(/\+/g, " ");
  const country = (req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  return {
    city: clip(city, 80),
    country: /^[A-Z]{2}$/.test(country) ? country : "",
    isp: "",
  };
}

/** Pass `network: true` to always ask the lookup service, so org and ASN are filled even when city, country and ISP are already known. */
export async function lookupIp(ip: string, seed: Geo = { city: "", country: "", isp: "" }, options: { network?: boolean } = {}): Promise<Geo> {
  const geo = { ...seed };
  if (privateIp(ip) || (!options.network && geo.city && geo.isp && geo.country)) return geo;
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    const data = (await response.json()) as {
      success?: boolean;
      city?: string;
      country_code?: string;
      connection?: { isp?: string; org?: string; asn?: number };
    };
    if (data?.success === false) return geo;
    if (!geo.city) geo.city = clip(data.city || "", 80);
    if (!geo.country && data.country_code) geo.country = data.country_code.toUpperCase().slice(0, 2);
    if (!geo.isp) geo.isp = clip(data.connection?.isp || data.connection?.org || "", 120);
    geo.org = clip(data.connection?.org || "", 120);
    geo.asn = Number(data.connection?.asn) || null;
  } catch {
    return geo;
  }
  return geo;
}
