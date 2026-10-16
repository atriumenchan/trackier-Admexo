import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { CERTIFIED_PATHS, CLICK_ROUTE_FILES, FORCE_PARAM, TRANSPARENCY_PARAM } from "../compliance/google-transparency.config.ts";
import { TargetError, assertFinalUrl, assertSameSiteUpgrade, decodeOnce, registrableDomain, validateTargetSyntax } from "./google-target.ts";
import { isCertifiedHost, parseCertifiedTrackerTable } from "./certified-trackers.ts";
import { appendNonForeign, buildGoogleClickUrl, expandOwnMacros, readGoogleRequest, resolveGoogleTarget } from "./google-transparency.ts";

function codeOf(run: () => void) {
  try {
    run();
    return "";
  } catch (error) {
    return error instanceof TargetError ? error.code : "other";
  }
}

test("one decode keeps nested encoding and a plus sign", () => {
  const nested = "https://tracker.example/?redirection_url=https%3A%2F%2Fshop.example%2F%3Fq%3Da%2Bb";
  const raw = encodeURIComponent(nested);
  assert.equal(decodeOnce(raw), nested);
  assert.equal(decodeOnce(raw).includes("https%3A%2F%2Fshop.example"), true);
});

test("double encoding and broken percent sequences are rejected", () => {
  assert.equal(codeOf(() => decodeOnce(encodeURIComponent("https%3A%2F%2Fshop.example"))), "MALFORMED_ENCODING");
  assert.equal(codeOf(() => decodeOnce("%")), "MALFORMED_ENCODING");
  assert.equal(codeOf(() => decodeOnce("%2")), "MALFORMED_ENCODING");
  assert.equal(codeOf(() => decodeOnce("%zz")), "MALFORMED_ENCODING");
  assert.equal(codeOf(() => decodeOnce("a".repeat(4097))), "OVERLONG");
});

test("unsafe targets are rejected and a normal hostname is kept", () => {
  const cases: Array<[string, string]> = [
    ["https://shop.example/landing", ""],
    ["http://shop.example/landing", ""],
    ["javascript:alert(1)", "UNSUPPORTED_SCHEME"],
    ["data:text/html,hi", "UNSUPPORTED_SCHEME"],
    ["tel:+15551212", "UNSUPPORTED_SCHEME"],
    ["myapp://open", "UNSUPPORTED_SCHEME"],
    ["intent://scan/#Intent;scheme=zxing;end", "UNSUPPORTED_SCHEME"],
    ["http://127.0.0.1/admin", "IP_LITERAL"],
    ["http://[::1]/admin", "IP_LITERAL"],
    ["http://2130706433/", "IP_LITERAL"],
    ["http://0x7f000001/", "IP_LITERAL"],
    ["http://0177.0.0.1/", "IP_LITERAL"],
    ["http://127.1/", "IP_LITERAL"],
    ["http://localhost/admin", "PRIVATE_HOST"],
    ["http://printer.local/admin", "PRIVATE_HOST"],
    ["https://user:pass@shop.example/", "CREDENTIALS"],
    ["https://shop.example/\r\nLocation:https://evil.example", "CONTROL_CHARS"],
    ["https://shop.example/a b", "CONTROL_CHARS"],
    ["https://shop.example/a\\b", "CONTROL_CHARS"],
    ["notaurl", "UNPARSEABLE"],
    ["http://", "UNPARSEABLE"],
  ];
  for (const [value, expected] of cases) {
    assert.equal(codeOf(() => validateTargetSyntax(value)), expected, value);
  }
});

test("http can move to https only on the same host", () => {
  assertSameSiteUpgrade(new URL("http://shop.example/path"), new URL("https://shop.example/path"));
  assert.equal(codeOf(() => assertSameSiteUpgrade(new URL("http://shop.example/"), new URL("https://other.example/"))), "UNPARSEABLE");
});

test("strict mode compares the registrable domain", () => {
  assert.equal(registrableDomain("lp.shop.example.co.uk"), "example.co.uk");
  assertFinalUrl("lp.example.com", "https://www.example.com/home");
  assert.equal(codeOf(() => assertFinalUrl("lp.other.com", "https://www.example.com/home")), "FINAL_URL_MISMATCH");
  assert.equal(codeOf(() => assertFinalUrl("lp.example.com", "")), "FINAL_URL_MISMATCH");
});

test("force may arrive after the target, and generated links put it first", () => {
  const target = "https://shop.example/landing?utm_source=google";
  const late = new URL(`https://track.example/t/abc?${TRANSPARENCY_PARAM}=${encodeURIComponent(target)}&${FORCE_PARAM}=true`);
  const read = readGoogleRequest(late);
  assert.equal(read.active && "target" in read ? read.target : "", target);
  const built = buildGoogleClickUrl({
    origin: "https://track.example",
    path: "/t/abc",
    target,
    extra: { gclid: "abc" },
  });
  const forceAt = built.indexOf(`${FORCE_PARAM}=`);
  const redirectAt = built.indexOf(`${TRANSPARENCY_PARAM}=`);
  const gclidAt = built.indexOf("gclid=");
  assert.ok(forceAt >= 0 && gclidAt > forceAt && redirectAt > gclidAt);
  assert.equal(readGoogleRequest(new URL("https://track.example/t/abc")).active, false);
  const missing = readGoogleRequest(new URL(`https://track.example/t/abc?${FORCE_PARAM}=true`));
  assert.equal(missing.active && "error" in missing ? missing.error.code : "", "MISSING_TARGET");
});

const certified = [{ product: "Cert", company: "Cert Inc", domains: ["certified.tracker.test"], transparencyParam: "redirection_url" }];

test("foreign params are not appended and existing order is kept", () => {
  const next = appendNonForeign("https://shop.example/landing?utm_source=google&b=2#offer", {
    click_id: "c1",
    campaign_id: "9",
    utm_source: "added",
    sub1: "pub",
    affiliate_id: "4",
  });
  assert.equal(next, "https://shop.example/landing?utm_source=google&b=2&click_id=c1&campaign_id=9#offer");
  const present = appendNonForeign("https://shop.example/?click_id=keep", { click_id: "new", campaign_id: "9" });
  assert.equal(present, "https://shop.example/?click_id=keep&campaign_id=9");
  const blocked = appendNonForeign("https://shop.example/landing", { click_id: "c1", campaign_id: "9" }, new Set(["click_id", "redirection_url"]));
  assert.equal(blocked, "https://shop.example/landing?campaign_id=9");
});

test("an uncertified nested tracker is blocked and a certified one is left intact", () => {
  const nested = "https://other.tracker/?redirection_url=https%3A%2F%2Fshop.example%2F";
  assert.equal(codeOf(() => resolveGoogleTarget({ target: nested, clickId: "c1", campaignId: "9", trackers: [] })), "NESTED_UNCERTIFIED");
  const inner = `https%3A%2F%2Fshop.example%2F%3Fclick_id%3D%7Bclick_id%7D`;
  const certifiedTarget = `https://certified.tracker.test/click?redirection_url=${inner}&note={click_id}`;
  const passed = resolveGoogleTarget({ target: certifiedTarget, clickId: "c1", campaignId: "9", trackers: certified });
  assert.equal(passed.location, `https://certified.tracker.test/click?redirection_url=${inner}&note=c1`);
  assert.equal(passed.landingHost, "shop.example");
  assert.equal(passed.warning, "");
});

test("macros stay outside nested values and inbound keys are not copied into the target", () => {
  const expanded = expandOwnMacros("https://shop.example/{click_id}?utm_source=google&next={campaign_id}#spot", { click_id: "c 1", campaign_id: "9" });
  assert.equal(expanded, "https://shop.example/c%201?utm_source=google&next=9#spot");
  const built = buildGoogleClickUrl({
    origin: "https://track.example",
    path: "/t/abc",
    target: "https://shop.example/landing",
    extra: { gclid: "abc", sub1: "pub" },
  });
  const target = decodeURIComponent(built.slice(built.indexOf("redirection_url=") + "redirection_url=".length));
  assert.equal(target, "https://shop.example/landing");
  assert.match(built, /gclid=abc/);
  assert.match(built, /sub1=pub/);
});

test("nested chains reject unknown trackers, depth, and a repeated hop", () => {
  const landing = "https://shop.example/landing";
  let deep = landing;
  for (let i = 6; i >= 1; i -= 1) deep = `https://t${i}.tracker.test/c?next=${encodeURIComponent(deep)}`;
  const deepTrackers = [1, 2, 3, 4, 5, 6].map((i) => ({ product: `T${i}`, company: "T", domains: [`t${i}.tracker.test`], transparencyParam: "next" }));
  assert.equal(codeOf(() => resolveGoogleTarget({ target: deep, clickId: "c1", campaignId: "9", trackers: deepTrackers, maxDepth: 5 })), "NESTED_DEPTH");
  const warned = resolveGoogleTarget({ target: "https://other.tracker/c?next=https%3A%2F%2Fshop.example%2F", clickId: "c1", campaignId: "9", trackers: [], policy: "warn" });
  assert.equal(warned.warning, "nested_uncertified");
  assert.equal(warned.location.includes("click_id"), false);
  const repeated = "https://certified.tracker.test/c?x=1";
  assert.equal(codeOf(() => resolveGoogleTarget({
    target: repeated,
    clickId: "c1",
    campaignId: "9",
    trackers: certified,
    seen: new Set(["https://certified.tracker.test/c?x=1"]),
  })), "NESTED_LOOP");
});

test("the certified tracker table keeps domains and an optional parameter name", () => {
  const parsed = parseCertifiedTrackerTable(`Product | Company | Certified Domains | Transparency parameter
Example Tracker | Example Inc | click.example-tracker.test, track.example-tracker.test | redirect
Adjust | Adjust GmbH | app.adjust.test`);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0].domains, ["click.example-tracker.test", "track.example-tracker.test"]);
  assert.equal(parsed[0].transparencyParam, "redirect");
  assert.equal(parsed[1].transparencyParam, undefined);
  assert.equal(Boolean(isCertifiedHost("a.click.example-tracker.test", parsed)), true);
  assert.equal(isCertifiedHost("click.example-tracker.test.evil.test", parsed), null);
  assert.equal(isCertifiedHost("notclick.example-tracker.test", parsed), null);
});

test("every certified click route exports the hook for GET and HEAD", () => {
  const root = process.cwd();
  assert.deepEqual([...CERTIFIED_PATHS], ["/t/:code", "/s/:code"]);
  for (const rel of CLICK_ROUTE_FILES) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(source, /enforceGoogleClick/);
    assert.match(source, /markWrapped/);
    assert.match(source, /export async function GET/);
    assert.match(source, /export async function HEAD/);
  }
  const boot = fs.readFileSync(path.join(root, "instrumentation.ts"), "utf8");
  assert.match(boot, /NEXT_RUNTIME === "nodejs"/);
  assert.match(boot, /google-boot/);
  const checker = fs.readFileSync(path.join(root, "lib/google-boot.ts"), "utf8");
  assert.match(checker, /assertClickRoutesWrapped/);
  assert.match(checker, /app\/t\/\[code\]\/route/);
  assert.match(checker, /app\/s\/\[code\]\/route/);
  const middleware = fs.readFileSync(path.join(root, "middleware.ts"), "utf8");
  assert.match(middleware, /\/t\/:path\*/);
  assert.match(middleware, /\/s\/:path\*/);
});
