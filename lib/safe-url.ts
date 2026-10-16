import { lookup } from "dns/promises";
import { isIP } from "net";

export function isPrivateAddress(ip: string) {
  const host = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "::1" || host === "0.0.0.0" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0 || a === 255) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export async function assertPublicHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a full http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https links can be requested.");
  if (url.username || url.password) throw new Error("That URL cannot include a username or password.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("That host points at a private network, so the request was stopped.");
  }
  const addresses = isIP(host) ? [host] : await lookup(host, { all: true }).then((rows) => rows.map((row) => row.address));
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error("That host points at a private network, so the request was stopped.");
  }
  return url.toString();
}
