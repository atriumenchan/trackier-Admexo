import { isPrivateAddress } from "./safe-url.ts";
import { MAX_TARGET_LENGTH } from "../compliance/google-transparency.config.ts";

export type TargetCode =
  | "MISSING_TARGET"
  | "MALFORMED_ENCODING"
  | "UNPARSEABLE"
  | "UNSUPPORTED_SCHEME"
  | "IP_LITERAL"
  | "PRIVATE_HOST"
  | "CREDENTIALS"
  | "CONTROL_CHARS"
  | "OVERLONG"
  | "FINAL_URL_MISMATCH"
  | "NESTED_UNCERTIFIED"
  | "NESTED_LOOP"
  | "NESTED_DEPTH";

export class TargetError extends Error {
  code: TargetCode;

  constructor(code: TargetCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<TargetCode, string> = {
  MISSING_TARGET: "force_transparent was set without redirection_url.",
  MALFORMED_ENCODING: "The redirect target has broken or double percent-encoding.",
  UNPARSEABLE: "The redirect target is not a usable http(s) URL.",
  UNSUPPORTED_SCHEME: "Only http and https targets are supported.",
  IP_LITERAL: "The redirect target must use a hostname, not an IP address.",
  PRIVATE_HOST: "The redirect target points at a private or local network.",
  CREDENTIALS: "The redirect target must not include a username or password.",
  CONTROL_CHARS: "The redirect target contains a character that breaks the Location header.",
  OVERLONG: "The redirect target is too long.",
  FINAL_URL_MISMATCH: "The redirect target domain does not match this campaign Final URL.",
  NESTED_UNCERTIFIED: "The redirect target sends the click through a tracker that is not on the certified list.",
  NESTED_LOOP: "The nested tracker chain points at itself.",
  NESTED_DEPTH: "The nested tracker chain is too deep.",
};

export function targetMessage(code: TargetCode) {
  return MESSAGES[code];
}

const MULTI_SUFFIXES = new Set(["co.uk", "org.uk", "ac.uk", "com.au", "net.au", "co.in", "com.br", "co.jp", "co.nz", "com.mx", "co.za", "com.sg"]);

export function registrableDomain(host: string) {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  if (labels.length < 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_SUFFIXES.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join(".");
  return lastTwo;
}

export function decodeOnce(raw: string) {
  if (raw.length > MAX_TARGET_LENGTH) throw new TargetError("OVERLONG", targetMessage("OVERLONG"));
  if (/%(?![0-9A-Fa-f]{2})/.test(raw)) throw new TargetError("MALFORMED_ENCODING", targetMessage("MALFORMED_ENCODING"));
  let decoded = "";
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    throw new TargetError("MALFORMED_ENCODING", targetMessage("MALFORMED_ENCODING"));
  }
  if (/^(https?|javascript|data|tel|intent)%3a/i.test(decoded)) {
    throw new TargetError("MALFORMED_ENCODING", targetMessage("MALFORMED_ENCODING"));
  }
  return decoded;
}

function ipv4Literal(host: string) {
  if (/^0x[0-9a-f]+$/i.test(host)) return true;
  if (/^\d+$/.test(host)) return true;
  const parts = host.split(".");
  if (parts.length < 2 || parts.length > 4) return false;
  return parts.every((part) => /^0x[0-9a-f]+$/i.test(part) || /^0[0-7]+$/.test(part) || /^\d+$/.test(part));
}

function forbiddenHost(host: string) {
  const name = host.toLowerCase().replace(/\.$/, "");
  if (!name || name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name.endsWith(".internal")) return true;
  if (name.includes(":") || name.startsWith("[")) return true;
  return ipv4Literal(name);
}

export function validateTargetSyntax(rawTarget: string) {
  if (rawTarget.length > MAX_TARGET_LENGTH) throw new TargetError("OVERLONG", targetMessage("OVERLONG"));
  if (/[\u0000-\u0020\u007f\\]/.test(rawTarget) || /\s/.test(rawTarget)) throw new TargetError("CONTROL_CHARS", targetMessage("CONTROL_CHARS"));
  let url: URL;
  try {
    url = new URL(rawTarget);
  } catch {
    throw new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TargetError("UNSUPPORTED_SCHEME", targetMessage("UNSUPPORTED_SCHEME"));
  if (url.username || url.password) throw new TargetError("CREDENTIALS", targetMessage("CREDENTIALS"));
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (forbiddenHost(host)) throw new TargetError(host.includes(":") || ipv4Literal(host) ? "IP_LITERAL" : "PRIVATE_HOST", targetMessage(host.includes(":") || ipv4Literal(host) ? "IP_LITERAL" : "PRIVATE_HOST"));
  if (!host.includes(".")) throw new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
  return url;
}

export function assertSameSiteUpgrade(from: URL, to: URL) {
  if (from.protocol === to.protocol) return;
  const sameHost = from.hostname.replace(/\.$/, "").toLowerCase() === to.hostname.replace(/\.$/, "").toLowerCase();
  if (!(from.protocol === "http:" && to.protocol === "https:" && sameHost)) {
    throw new TargetError("UNPARSEABLE", targetMessage("UNPARSEABLE"));
  }
}

export function assertFinalUrl(targetHost: string, finalUrl: string) {
  let declared: URL;
  try {
    declared = validateTargetSyntax(finalUrl);
  } catch {
    throw new TargetError("FINAL_URL_MISMATCH", targetMessage("FINAL_URL_MISMATCH"));
  }
  if (registrableDomain(targetHost) !== registrableDomain(declared.hostname)) {
    throw new TargetError("FINAL_URL_MISMATCH", targetMessage("FINAL_URL_MISMATCH"));
  }
}

export function rejectResolvedAddress(address: string) {
  if (isPrivateAddress(address)) throw new TargetError("PRIVATE_HOST", targetMessage("PRIVATE_HOST"));
}
