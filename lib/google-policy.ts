import { CERTIFIED_PATHS, FORCE_PARAM, MANIFEST_VERSION, NON_CLICK_PATHS, NON_FOREIGN_PARAMS, OWNED_DOMAINS, PLATFORM_SUFFIXES, TRANSPARENCY_PARAM } from "../compliance/google-transparency.config.ts";
import type { CertifiedTracker } from "./certified-trackers.ts";
import { registrableDomain, validateTargetSyntax, TargetError } from "./google-target.ts";
import { resolveGoogleTarget } from "./google-transparency.ts";

export type HostClass = "owned" | "operated" | "other";

function sameHost(host: string, listed: string) {
  const name = host.toLowerCase().replace(/\.$/, "");
  const domain = listed.toLowerCase().replace(/\.$/, "");
  return Boolean(domain) && (name === domain || name.endsWith(`.${domain}`));
}

export function hostClass(host: string, owned: readonly string[] = OWNED_DOMAINS): HostClass {
  const name = host.toLowerCase().replace(/\.$/, "");
  const platform = PLATFORM_SUFFIXES.some((suffix) => name === suffix || name.endsWith(`.${suffix}`));
  const listed = owned.some((domain) => sameHost(name, domain));
  if (listed && platform) return "operated";
  if (listed) return "owned";
  return "other";
}

export function cnameAllowed(input: { host: string; finalUrl: string; cnameTargets: readonly string[]; owned?: readonly string[] }) {
  let finalHost = "";
  try {
    const url = new URL(input.finalUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("scheme");
    finalHost = url.hostname;
  } catch {
    return { ok: false, reason: "Final URL must be an http(s) URL with a hostname." };
  }
  if (registrableDomain(input.host) !== registrableDomain(finalHost)) {
    return { ok: false, reason: "A customer subdomain is allowed only when it belongs to the same domain as the Final URL." };
  }
  const owned = input.owned || OWNED_DOMAINS;
  const pointsAtUs = input.cnameTargets.some((target) => hostClass(target, owned) === "owned" || hostClass(target, owned) === "operated" || owned.some((domain) => sameHost(target, domain)));
  if (!pointsAtUs) return { ok: false, reason: "The CNAME does not point at a domain this tracker operates." };
  return { ok: true, reason: "CNAME points at this tracker and shares the Final URL domain." };
}

export function generationAllowed(host: string, finalUrl: string, verifiedHosts: readonly string[], owned: readonly string[] = OWNED_DOMAINS) {
  const kind = hostClass(host, owned);
  if (kind === "owned") return { ok: true, reason: "This domain is listed as owned by the tracker." };
  if (verifiedHosts.some((item) => item.toLowerCase() === host.toLowerCase())) {
    return cnameAllowed({ host, finalUrl, cnameTargets: owned, owned });
  }
  if (kind === "operated") {
    return { ok: false, reason: "This host runs the app. Certification needs a domain your organization owns, or a customer subdomain on the Final URL domain that CNAMEs here." };
  }
  return { ok: false, reason: "This domain is not Google-certified. It is not owned by the tracker and it is not a verified CNAME under the Final URL." };
}

export function clickPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return false;
  return CERTIFIED_PATHS.some((pattern) => pattern.startsWith(`/${parts[0]}/`));
}

export function googleAdsTemplate(input: { origin: string; code: string; campaignId: string; smartLink?: boolean }) {
  if (input.smartLink) {
    return { ok: false, template: "", reason: "Smart links choose the offer on the server. Google mode cannot use them." };
  }
  const origin = input.origin.replace(/\/$/, "");
  const pairs = [
    `${FORCE_PARAM}=true`,
    `campaign_id=${encodeURIComponent(input.campaignId)}`,
    "gclid={gclid}",
    "creative={creative}",
    "device={device}",
    `${TRANSPARENCY_PARAM}={lpurl}`,
  ];
  return { ok: true, template: `${origin}/t/${input.code}?${pairs.join("&")}`, reason: "" };
}

export type GoogleCheck = { code: "unsupported" | "specific_parameter" | "incorrect_path" | "destination_mismatch" | "unparseable"; pass: boolean; detail: string };

function substitute(template: string, finalUrl: string) {
  return template
    .replaceAll("{lpurl}", encodeURIComponent(finalUrl))
    .replaceAll("{gclid}", "test-gclid")
    .replaceAll("{creative}", "test-creative")
    .replaceAll("{device}", "test-device")
    .replaceAll("{campaignid}", "test-campaign")
    .replaceAll("%7Blpurl%7D", encodeURIComponent(finalUrl));
}

export function checkGoogleTemplate(input: {
  template: string;
  finalUrl: string;
  verifiedHosts?: string[];
  owned?: readonly string[];
  trackers?: CertifiedTracker[];
}) {
  const items: GoogleCheck[] = [];
  const owned = input.owned || OWNED_DOMAINS;
  const verified = input.verifiedHosts || [];
  let templateUrl: URL | null = null;
  try {
    templateUrl = new URL(input.template.replaceAll("{lpurl}", "https://final.example/").replaceAll(/\{[a-z0-9]+\}/gi, "token"));
  } catch {
    templateUrl = null;
  }
  const host = templateUrl?.hostname || "";
  const allowed = host ? generationAllowed(host, input.finalUrl, verified, owned) : { ok: false, reason: "The template is not a URL." };
  items.push({ code: "unsupported", pass: allowed.ok, detail: allowed.reason });
  const forceAt = input.template.indexOf(`${FORCE_PARAM}=`);
  const redirectAt = input.template.indexOf(`${TRANSPARENCY_PARAM}=`);
  const transparencyLast = redirectAt >= 0 && !input.template.slice(redirectAt).includes("&");
  const orderOk = redirectAt >= 0 && (forceAt === -1 || forceAt < redirectAt) && transparencyLast;
  items.push({
    code: "specific_parameter",
    pass: orderOk,
    detail: orderOk ? "redirection_url is present and last. force_transparent, when present, is before it." : "The template needs redirection_url as the last parameter. force_transparent must come before it.",
  });
  items.push({
    code: "incorrect_path",
    pass: Boolean(templateUrl && clickPath(templateUrl.pathname)),
    detail: templateUrl && clickPath(templateUrl.pathname) ? "The path is a certified click path." : "Only /t/{code} and /s/{code} are certified click paths.",
  });
  let target = "";
  let unparseable = "The redirect target could not be read.";
  try {
    const simulated = new URL(substitute(input.template, input.finalUrl));
    const raw = simulated.searchParams.get(TRANSPARENCY_PARAM) || "";
    target = raw;
    validateTargetSyntax(target);
    unparseable = "";
  } catch (error) {
    unparseable = error instanceof TargetError ? error.message : unparseable;
  }
  items.push({ code: "unparseable", pass: !unparseable, detail: unparseable || "The target is an http(s) URL with a hostname." });
  let expectedLocation = "";
  let destination = "The target could not be compared with the Final URL.";
  let destinationPass = false;
  if (target && !unparseable) {
    try {
      const resolved = resolveGoogleTarget({ target, clickId: "probe", campaignId: "probe", trackers: input.trackers || [], ownHosts: [...owned] });
      expectedLocation = resolved.location;
      const same = registrableDomain(resolved.landingHost) === registrableDomain(new URL(input.finalUrl).hostname);
      destinationPass = same;
      destination = same ? "The landing domain matches the Final URL." : "The landing domain does not match the Final URL.";
    } catch (error) {
      destination = error instanceof TargetError ? error.message : destination;
    }
  }
  items.push({ code: "destination_mismatch", pass: destinationPass, detail: destination });
  const pass = items.every((item) => item.pass);
  return { pass, items, expectedLocation, probeUrl: substitute(input.template, input.finalUrl) };
}

export function probeAgrees(location: string | null, status: number, body: string, finalUrl: string) {
  if (status !== 302 || !location || /<html/i.test(body)) return false;
  let final: URL;
  let got: URL;
  try {
    final = new URL(finalUrl);
    got = new URL(location);
  } catch {
    return false;
  }
  if (got.origin + got.pathname !== final.origin + final.pathname) return false;
  for (const [key, value] of final.searchParams) {
    if (got.searchParams.get(key) !== value) return false;
  }
  if (!got.searchParams.get("click_id") || !got.searchParams.get("campaign_id")) return false;
  for (const key of ["gclid", "creative", "device", "sub1", "utm_source", "affiliate_id"]) {
    if (!final.searchParams.has(key) && got.searchParams.has(key)) return false;
  }
  return true;
}

export function applicationPack(input?: { verifiedHosts?: string[] }) {
  const verified = input?.verifiedHosts || [];
  const lines = [
    `Manifest version: ${MANIFEST_VERSION}`,
    `Transparency parameter: ${TRANSPARENCY_PARAM}`,
    `Secondary parameter: ${FORCE_PARAM} (optional, generated before ${TRANSPARENCY_PARAM})`,
    `Non-foreign parameters: ${NON_FOREIGN_PARAMS.join(", ")}`,
    `Certified click paths: ${CERTIFIED_PATHS.join(", ")}`,
    `Operated hosts: ${OWNED_DOMAINS.join(", ")}`,
    `Verified customer CNAMEs: ${verified.length ? verified.join(", ") : "none"}`,
    "",
    "Redirect behavior: when redirection_url is present, the response is an HTTP 302 with an empty body. The Location is that URL after one decode and the allowlist. Offer URLs, smart-link rotation, caps, geo, device, and fraud rules do not choose the hop.",
    "Nested trackers: allowed only when every tracker host is on compliance/certified-trackers.json, or is a host this tracker operates. Other nested trackers return 400 NESTED_UNCERTIFIED.",
    "Subdomains: a customer CNAME is accepted only when it points at an operated host and shares the registrable domain of the campaign Final URL. Other custom domains are marked not Google-certified.",
    "Not click paths: " + NON_CLICK_PATHS.join(", "),
    "",
    "Example URLs:",
    ...CERTIFIED_PATHS.map((path) => `https://REPLACE-WITH-YOUR-DOMAIN${path.replace(":code", "CODE")}?${FORCE_PARAM}=true&campaign_id=CAMPAIGN&gclid={gclid}&creative={creative}&device={device}&${TRANSPARENCY_PARAM}={lpurl}`),
    "",
    "Changing the transparency parameter, the secondary parameter, the non-foreign list, the certified paths, or the operated hosts requires a manifest version bump. Notify Google before deploying that change.",
  ];
  return lines.join("\n");
}

export { NON_CLICK_PATHS, NON_FOREIGN_PARAMS };
