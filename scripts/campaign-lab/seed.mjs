import { baseUrl, desk, hrefId, login, pageHtml, writeState } from "./lib.mjs";

const base = baseUrl();
const email = process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com";
const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
const advertiserName = `Lab Brand ${stamp}`;
const affiliateName = `Lab Pub ${stamp}`;
const offerName = `Lab CPA ${stamp}`;
const landing = `${base}/lab/landing?click_id={click_id}&sub1={sub1}`;

const jar = await login(base, email, password);
console.log("Signed in.");

const advertiserRes = await desk(base, jar, "saveAdvertiser", {
  name: advertiserName,
  company: "Lab",
  email: `brand-${stamp}@lab.admexo.test`,
  website: base,
  status: "active",
});
if (advertiserRes.status >= 400) throw new Error(`saveAdvertiser ${advertiserRes.status} ${await advertiserRes.text()}`);

const affiliateRes = await desk(base, jar, "saveAffiliate", {
  name: affiliateName,
  company: "Lab Pub",
  email: `pub-${stamp}@lab.admexo.test`,
  status: "active",
});
if (affiliateRes.status >= 400) throw new Error(`saveAffiliate ${affiliateRes.status} ${await affiliateRes.text()}`);

const advertisersHtml = await pageHtml(base, jar, "/advertisers");
const affiliatesHtml = await pageHtml(base, jar, "/affiliates");
const advertiserId = hrefId(advertisersHtml, "/advertisers", advertiserName);
const affiliateId = hrefId(affiliatesHtml, "/affiliates", affiliateName);
if (!advertiserId || !affiliateId) throw new Error("Could not find the lab advertiser or affiliate after save.");

const offerRes = await desk(base, jar, "saveOffer", {
  name: offerName,
  advertiser_id: advertiserId,
  offer_url: landing,
  model: "CPA",
  currency: "USD",
  payout: "1.25",
  revenue: "2.50",
  status: "active",
  visibility: "private",
  country_mode: "all",
  devices: "all",
  attribution_hours: "720",
});
if (offerRes.status >= 400) throw new Error(`saveOffer ${offerRes.status} ${await offerRes.text()}`);
const offerLocation = offerRes.headers.get("location") || "";
const offerFromRedirect = Number((offerLocation.match(/\/offers\/(\d+)/) || [])[1] || 0);
const offersHtml = await pageHtml(base, jar, "/offers");
const offerId = offerFromRedirect || hrefId(offersHtml, "/offers", offerName);
if (!offerId) throw new Error("Could not find the lab offer after save.");

const accessRes = await desk(base, jar, "saveAccess", {
  offer_id: offerId,
  affiliate_id: affiliateId,
  status: "approved",
});
if (accessRes.status >= 400) throw new Error(`saveAccess ${accessRes.status} ${await accessRes.text()}`);

const offerHtml = await pageHtml(base, jar, `/offers/${offerId}`);
const trackMatch = offerHtml.match(new RegExp(`${base.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}/t/([a-z0-9]+)`, "i"));
if (!trackMatch) throw new Error("Offer page did not show a tracking link.");
const trackUrl = `${base}/t/${trackMatch[1]}`;

const state = {
  stamp,
  base,
  advertiserName,
  affiliateName,
  offerName,
  advertiserId,
  affiliateId,
  offerId,
  trackUrl,
  landing,
};
writeState(state);
console.log(JSON.stringify({ ok: true, offerId, affiliateId, advertiserId, trackUrl }, null, 2));
