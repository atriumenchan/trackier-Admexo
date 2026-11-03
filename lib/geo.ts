import { clip } from "@/lib/format";

export type Geo = { city: string; country: string; isp: string };

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

export async function lookupIp(ip: string, seed: Geo = { city: "", country: "", isp: "" }): Promise<Geo> {
  const geo = { ...seed };
  if (privateIp(ip) || (geo.city && geo.isp && geo.country)) return geo;
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    const data = (await response.json()) as {
      success?: boolean;
      city?: string;
      country_code?: string;
      connection?: { isp?: string; org?: string };
    };
    if (data?.success === false) return geo;
    if (!geo.city) geo.city = clip(data.city || "", 80);
    if (!geo.country && data.country_code) geo.country = data.country_code.toUpperCase().slice(0, 2);
    if (!geo.isp) geo.isp = clip(data.connection?.isp || data.connection?.org || "", 120);
  } catch {
    return geo;
  }
  return geo;
}
