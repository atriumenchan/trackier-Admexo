import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { FORCE_PARAM, MANIFEST_VERSION, NON_FOREIGN_PARAMS, OWNED_DOMAINS, TRANSPARENCY_PARAM, CERTIFIED_PATHS } from "../compliance/google-transparency.config.ts";
import { checkGoogleTemplate, cnameAllowed, generationAllowed, googleAdsTemplate, probeAgrees } from "./google-policy.ts";

const owned = ["track.brand.test", "trackier-admexo.vercel.app"] as const;
const template = `https://track.brand.test/t/CODE?${FORCE_PARAM}=true&campaign_id=CAMPAIGN&gclid={gclid}&creative={creative}&device={device}&${TRANSPARENCY_PARAM}={lpurl}`;

test("a customer CNAME is accepted only on the Final URL domain", () => {
  assert.equal(cnameAllowed({ host: "track.brand.test", finalUrl: "https://brand.test/landing", cnameTargets: ["trackier-admexo.vercel.app"], owned }).ok, true);
  assert.equal(cnameAllowed({ host: "track.other.test", finalUrl: "https://brand.test/landing", cnameTargets: ["trackier-admexo.vercel.app"], owned }).ok, false);
  assert.equal(cnameAllowed({ host: "go.brand.test", finalUrl: "https://brand.test/landing", cnameTargets: ["exampletracker.com"], owned }).ok, false);
});

test("the operated Vercel host cannot be offered as a certified domain", () => {
  assert.equal(generationAllowed("trackier-admexo.vercel.app", "https://brand.test/landing", [], owned).ok, false);
  assert.equal(generationAllowed("track.brand.test", "https://brand.test/landing", [], owned).ok, true);
});

test("generated templates put the transparency parameter last and reject smart links", () => {
  const built = googleAdsTemplate({ origin: "https://track.brand.test", code: "CODE", campaignId: "CAMPAIGN" });
  assert.equal(built.ok, true);
  assert.ok(built.template.indexOf(`${FORCE_PARAM}=`) < built.template.indexOf(`${TRANSPARENCY_PARAM}=`));
  assert.equal(built.template.endsWith(`${TRANSPARENCY_PARAM}={lpurl}`), true);
  assert.equal(googleAdsTemplate({ origin: "https://track.brand.test", code: "CODE", campaignId: "1", smartLink: true }).ok, false);
});

test("the checker scores Google's error classes", () => {
  const pass = checkGoogleTemplate({ template, finalUrl: "https://brand.test/landing", owned });
  assert.equal(pass.pass, true);
  assert.equal(pass.items.every((item) => item.pass), true);
  const wrongPath = checkGoogleTemplate({ template: template.replace("/t/CODE", "/click"), finalUrl: "https://brand.test/landing", owned });
  assert.equal(wrongPath.items.find((item) => item.code === "incorrect_path")?.pass, false);
  const missing = checkGoogleTemplate({ template: "https://track.brand.test/t/CODE?gclid={gclid}", finalUrl: "https://brand.test/landing", owned });
  assert.equal(missing.items.find((item) => item.code === "specific_parameter")?.pass, false);
  const lateForce = checkGoogleTemplate({
    template: `https://track.brand.test/t/CODE?${TRANSPARENCY_PARAM}={lpurl}&${FORCE_PARAM}=true`,
    finalUrl: "https://brand.test/landing",
    owned,
  });
  assert.equal(lateForce.items.find((item) => item.code === "specific_parameter")?.pass, false);
  const ip = checkGoogleTemplate({ template, finalUrl: "http://127.0.0.1/admin", owned });
  assert.equal(ip.items.find((item) => item.code === "unparseable")?.pass, false);
  const other = checkGoogleTemplate({
    template: template.replace("{lpurl}", encodeURIComponent("https://shop.example/landing")),
    finalUrl: "https://brand.test/landing",
    owned,
  });
  assert.equal(other.items.find((item) => item.code === "destination_mismatch")?.pass, false);
  const nested = checkGoogleTemplate({
    template,
    finalUrl: "https://brand.test/?redirection_url=https%3A%2F%2Fshop.example%2F",
    owned,
  });
  assert.equal(nested.items.find((item) => item.code === "destination_mismatch")?.pass, false);
});

test("a live probe matches only a 302 to the Final URL", () => {
  assert.equal(probeAgrees("https://brand.test/landing?click_id=abc&campaign_id=CODE", 302, "", "https://brand.test/landing"), true);
  assert.equal(probeAgrees("https://brand.test/landing?gclid=abc&click_id=abc&campaign_id=CODE", 302, "", "https://brand.test/landing"), false);
  assert.equal(probeAgrees("https://brand.test/landing?click_id=abc&campaign_id=CODE", 302, "<html></html>", "https://brand.test/landing"), false);
});

test("the manifest matches the transparency config and tells us to notify Google", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "compliance/google-manifest.json"), "utf8")) as {
    version: string;
    transparencyParam: string;
    forceParam: string;
    nonForeignParams: string[];
    certifiedPaths: string[];
    ownedDomains: string[];
    changelog: { version: string; note: string }[];
  };
  assert.equal(manifest.version, MANIFEST_VERSION);
  assert.equal(manifest.transparencyParam, TRANSPARENCY_PARAM);
  assert.equal(manifest.forceParam, FORCE_PARAM);
  assert.deepEqual(manifest.nonForeignParams, [...NON_FOREIGN_PARAMS]);
  assert.deepEqual(manifest.certifiedPaths, [...CERTIFIED_PATHS]);
  assert.deepEqual(manifest.ownedDomains, [...OWNED_DOMAINS]);
  const note = manifest.changelog.find((entry) => entry.version === manifest.version);
  assert.match(note?.note || "", /notify Google before deploying/);
  const middleware = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.match(middleware, /\/t\/:path\*/);
  assert.equal(middleware.includes("/api/"), false);
  assert.equal(middleware.includes("/pb/"), false);
});
