import { FORCE_PARAM, MAX_NESTED_DEPTH, NESTED_POLICY, NON_FOREIGN_PARAMS, TRANSPARENCY_PARAM } from "../compliance/google-transparency.config.ts";
import { isCertifiedHost, transparencyNames, type CertifiedTracker } from "./certified-trackers.ts";
import { TargetError, decodeOnce, targetMessage, validateTargetSyntax } from "./google-target.ts";

export type GoogleRead =
  | { active: false }
  | { active: true; target: string; force: boolean }
  | { active: true; error: TargetError };

export function rawQueryParam(search: string, name: string) {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;
  for (const part of query.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    let key = rawKey;
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      continue;
    }
    if (key === name) return eq === -1 ? "" : part.slice(eq + 1);
  }
  return null;
}

function forceEnabled(raw: string | null) {
  if (raw == null || raw === "") return false;
  try {
    return /^(1|true|yes)$/i.test(decodeOnce(raw));
  } catch {
    return false;
  }
}

export function readGoogleRequest(url: URL): GoogleRead {
  const rawTarget = rawQueryParam(url.search, TRANSPARENCY_PARAM);
  const force = forceEnabled(rawQueryParam(url.search, FORCE_PARAM));
  if (rawTarget == null) {
    if (force) return { active: true, error: new TargetError("MISSING_TARGET", targetMessage("MISSING_TARGET")) };
    return { active: false };
  }
  try {
    return { active: true, target: decodeOnce(rawTarget), force };
  } catch (error) {
    if (error instanceof TargetError) return { active: true, error };
    return { active: true, error: new TargetError("MALFORMED_ENCODING", targetMessage("MALFORMED_ENCODING")) };
  }
}

export function prepareTarget(rawTarget: string) {
  return validateTargetSyntax(rawTarget);
}

function splitTarget(target: string) {
  const hashAt = target.indexOf("#");
  const hash = hashAt === -1 ? "" : target.slice(hashAt);
  const withoutHash = hashAt === -1 ? target : target.slice(0, hashAt);
  const queryAt = withoutHash.indexOf("?");
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const query = queryAt === -1 ? "" : withoutHash.slice(queryAt + 1);
  return { path, query, hash };
}

function queryKey(rawKey: string) {
  try {
    return decodeURIComponent(rawKey).toLowerCase();
  } catch {
    return rawKey.toLowerCase();
  }
}

export function nestedUrlValue(raw: string) {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "";
  }
  if (!/^https?:\/\//i.test(decoded)) return "";
  try {
    const url = new URL(decoded);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return "";
    return decoded;
  } catch {
    return "";
  }
}

function queryParts(query: string) {
  return query.split("&").filter(Boolean).map((part) => {
    const eq = part.indexOf("=");
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    const rawValue = eq === -1 ? "" : part.slice(eq + 1);
    return { part, key: queryKey(rawKey), rawValue };
  });
}

function expandToken(value: string, macros: Record<string, string>) {
  return value.replace(/\{(click_id|campaign_id)\}|%7B(click_id|campaign_id)%7D/gi, (full, plain, encoded) => {
    const name = String(plain || encoded || "").toLowerCase();
    return name in macros ? encodeURIComponent(macros[name]) : full;
  });
}

export function expandOwnMacros(target: string, macros: { click_id?: string; campaign_id?: string }) {
  const { path, query, hash } = splitTarget(target);
  const nextPath = expandToken(path, macros);
  if (!query) return `${nextPath}${hash}`;
  const nextQuery = queryParts(query).map((item) => {
    if (nestedUrlValue(item.rawValue)) return item.part;
    const eq = item.part.indexOf("=");
    if (eq === -1) return expandToken(item.part, macros);
    return `${item.part.slice(0, eq)}=${expandToken(item.rawValue, macros)}`;
  }).join("&");
  return `${nextPath}?${nextQuery}${hash}`;
}

export function appendNonForeign(target: string, extras: Record<string, string>, forbidden: ReadonlySet<string> = new Set()) {
  const { path, query, hash } = splitTarget(target);
  const parts = queryParts(query);
  const existing = new Set(parts.map((item) => item.key));
  const blocked = new Set([...forbidden].map((name) => name.toLowerCase()));
  blocked.add(TRANSPARENCY_PARAM);
  blocked.add(FORCE_PARAM);
  const additions: string[] = [];
  for (const name of NON_FOREIGN_PARAMS) {
    const value = extras[name];
    if (!value || existing.has(name) || blocked.has(name)) continue;
    additions.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
  if (!additions.length) return `${path}${query ? `?${query}` : ""}${hash}`;
  const nextQuery = query ? `${query}&${additions.join("&")}` : additions.join("&");
  return `${path}?${nextQuery}${hash}`;
}

function nestedHops(rawTarget: string, preferred?: string) {
  const { query } = splitTarget(rawTarget);
  const hops = queryParts(query).flatMap((item) => {
    const value = nestedUrlValue(item.rawValue);
    return value ? [{ key: item.key, value }] : [];
  });
  if (!preferred) return hops.map((hop) => hop.value);
  const first = hops.find((hop) => hop.key === preferred.toLowerCase());
  const rest = hops.filter((hop) => hop !== first).map((hop) => hop.value);
  return first ? [first.value, ...rest] : rest;
}

function hopIdentity(rawTarget: string) {
  const url = validateTargetSyntax(rawTarget);
  return `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname}${url.search}`;
}

function ownTracker(host: string, ownHosts: string[]) {
  const name = host.toLowerCase().replace(/\.$/, "");
  for (const own of ownHosts) {
    const domain = own.toLowerCase().replace(/\.$/, "");
    if (domain && (name === domain || name.endsWith(`.${domain}`))) {
      return { product: "owned", company: "", domains: [domain], transparencyParam: TRANSPARENCY_PARAM };
    }
  }
  return null;
}

function walk(rawTarget: string, depth: number, seen: Set<string>, trackers: CertifiedTracker[], ownHosts: string[], maxDepth: number): { hosts: string[]; landingHost: string; certified: boolean } {
  if (depth > maxDepth) throw new TargetError("NESTED_DEPTH", targetMessage("NESTED_DEPTH"));
  const url = validateTargetSyntax(rawTarget);
  const identity = hopIdentity(rawTarget);
  if (seen.has(identity)) throw new TargetError("NESTED_LOOP", targetMessage("NESTED_LOOP"));
  seen.add(identity);
  const listed = isCertifiedHost(url.hostname, trackers);
  const hops = nestedHops(rawTarget, (listed || ownTracker(url.hostname, ownHosts))?.transparencyParam);
  const tracker = listed || (hops.length ? ownTracker(url.hostname, ownHosts) : null);
  if (!tracker && hops.length) throw new TargetError("NESTED_UNCERTIFIED", targetMessage("NESTED_UNCERTIFIED"));
  const hosts = [url.hostname];
  let landingHost = url.hostname;
  for (const hop of hops) {
    const child = walk(hop, depth + 1, seen, trackers, ownHosts, maxDepth);
    hosts.push(...child.hosts);
    landingHost = child.landingHost;
  }
  return { hosts, landingHost, certified: Boolean(tracker) };
}

export function resolveGoogleTarget(input: {
  target: string;
  clickId: string;
  campaignId: string;
  trackers?: CertifiedTracker[];
  policy?: "block" | "warn";
  maxDepth?: number;
  seen?: Set<string>;
  ownHosts?: string[];
}) {
  const trackers = input.trackers || [];
  const policy = input.policy || NESTED_POLICY;
  const macros = { click_id: input.clickId, campaign_id: input.campaignId };
  const forbidden = transparencyNames(trackers);
  try {
    const walked = walk(input.target, 1, input.seen || new Set(), trackers, input.ownHosts || [], input.maxDepth || MAX_NESTED_DEPTH);
    const expanded = expandOwnMacros(input.target, macros);
    const location = walked.certified ? expanded : appendNonForeign(expanded, macros, forbidden);
    return { location, landingHost: walked.landingHost, hosts: [...new Set(walked.hosts)], warning: "" };
  } catch (error) {
    if (policy === "warn" && error instanceof TargetError && error.code === "NESTED_UNCERTIFIED") {
      const url = validateTargetSyntax(input.target);
      return { location: expandOwnMacros(input.target, macros), landingHost: url.hostname, hosts: [url.hostname], warning: "nested_uncertified" };
    }
    throw error;
  }
}

export function buildGoogleClickUrl(input: { origin: string; path: string; target: string; extra?: Record<string, string> }) {
  const origin = input.origin.replace(/\/$/, "");
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const pairs = [`${encodeURIComponent(FORCE_PARAM)}=true`];
  for (const [key, value] of Object.entries(input.extra || {})) {
    if (key === TRANSPARENCY_PARAM || key === FORCE_PARAM) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  pairs.push(`${encodeURIComponent(TRANSPARENCY_PARAM)}=${encodeURIComponent(input.target)}`);
  return `${origin}${path}?${pairs.join("&")}`;
}

export function googleFailure(error: TargetError) {
  return Response.json({ error: error.code, message: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
}

export function googleRedirect(location: string) {
  if (/[\r\n]/.test(location)) {
    return googleFailure(new TargetError("CONTROL_CHARS", targetMessage("CONTROL_CHARS")));
  }
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
