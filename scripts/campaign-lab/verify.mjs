import { baseUrl, cookieHeader, login, pageHtml, readState } from "./lib.mjs";

const state = readState();
const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}
const jar = await login(baseUrl(), process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com", password);
const cookie = cookieHeader(jar);

function countName(html, name) {
  return html.split(name).length - 1;
}

const clicksHtml = await pageHtml(state.base, jar, `/clicks?offer=${state.offerId}`);
const convHtml = await pageHtml(state.base, jar, `/conversions?offer=${state.offerId}`);
const reportsHtml = await pageHtml(state.base, jar, `/reports?from=${new Date().toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}&group=offer`);
const offerHtml = await pageHtml(state.base, jar, `/offers/${state.offerId}`);

const api = await fetch(`${state.base}/api/v1/clicks`, { headers: { cookie } });
let apiClicks = [];
if (api.ok) {
  const json = await api.json().catch(() => []);
  apiClicks = Array.isArray(json) ? json.filter((row) => Number(row.offer_id) === Number(state.offerId) || String(row.offer_name || "").includes(state.offerName)) : [];
}

const reportHasOffer = reportsHtml.includes(state.offerName);
const clicksMention = countName(clicksHtml, state.offerName);
const convMention = countName(convHtml, state.offerName);
const hasLink = offerHtml.includes("/t/");

const verdict = {
  offerId: state.offerId,
  trackUrl: state.trackUrl,
  clicksPageMentionsOffer: clicksMention,
  conversionsPageMentionsOffer: convMention,
  reportsShowOfferToday: reportHasOffer,
  offerStillHasLink: hasLink,
  apiClickRowsForOffer: apiClicks.length,
  sampleIps: [...new Set(apiClicks.map((row) => row.ip).filter(Boolean))].slice(0, 12),
  sampleClickIds: apiClicks.slice(0, 8).map((row) => row.id),
};
console.log(JSON.stringify(verdict, null, 2));
if (!hasLink || (clicksMention < 1 && apiClicks.length < 1)) process.exit(1);
