import { chromium } from "playwright";
import { baseUrl, loadProxies, userAgents, writeResult, writeState } from "./lib.mjs";

const base = baseUrl();
const email = process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com";
const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}

const proxies = loadProxies();
const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
const names = {
  advertiser: `Ten Brand ${stamp}`,
  affiliate: `Ten Pub ${stamp}`,
  offer: `Ten CPA ${stamp}`,
};
const landing = `${base}/lab/landing?click_id={click_id}&sub1={sub1}`;
const results = [];
const state = { stamp, base, ...names, advertiserId: 0, affiliateId: 0, offerId: 0, trackUrl: "", ips: [], clickIds: [] };

function proxyAt(index) {
  return proxies[index % proxies.length];
}

async function withBrowser(proxy, ua, fn) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    proxy: { server: proxy.server, username: proxy.username, password: proxy.password },
    userAgent: ua,
    ignoreHTTPSErrors: true,
    viewport: { width: 1365, height: 900 },
  });
  const page = await context.newPage();
  try {
    return await fn(page, proxy);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runTest(name, fn) {
  const started = Date.now();
  try {
    const detail = (await fn()) || "";
    results.push({ name, ok: true, detail, ms: Date.now() - started });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail, ms: Date.now() - started });
    console.log(`FAIL  ${name} — ${detail}`);
  }
}

const nav = { waitUntil: "domcontentloaded", timeout: 45000 };

async function open(page, path) {
  await page.goto(`${base}${path}`, nav);
}

async function waitLand(page, match, timeout = 45000) {
  await page.waitForURL(match, { timeout, waitUntil: "commit" });
}

async function pageError(page) {
  const url = page.url();
  const banner = await page.locator("[data-banner-error], .banner, [role='alert']").first().textContent().catch(() => "");
  return `${url} ${banner || ""}`.trim();
}

async function submitTo(page, button, match) {
  await page.getByRole("button", { name: button }).click();
  try {
    await waitLand(page, match);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error} | ${await pageError(page)}`);
  }
}

async function signIn(page) {
  await open(page, "/login");
  if (!page.url().includes("/login")) return;
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await submitTo(page, "Sign in", (url) => !url.pathname.startsWith("/login"));
}

let admin;
async function adminPage() {
  if (admin) return admin.page;
  const proxy = proxyAt(1);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    proxy: { server: proxy.server, username: proxy.username, password: proxy.password },
    userAgent: userAgents[0],
    ignoreHTTPSErrors: true,
    viewport: { width: 1365, height: 900 },
  });
  const page = await context.newPage();
  admin = { browser, context, page, proxy };
  return page;
}

await runTest("1. Proxy exit IP in headless Chromium", async () => {
  const proxy = proxyAt(0);
  return withBrowser(proxy, userAgents[0], async (page) => {
    await page.goto("https://api.ipify.org?format=json", { waitUntil: "domcontentloaded", timeout: 25000 });
    const ip = JSON.parse(await page.locator("body").innerText()).ip;
    if (!ip) throw new Error("No exit IP");
    state.ips.push(ip);
    return `${proxy.label} → ${ip}`;
  });
});

await runTest("2. Sign in on the desk through a proxy", async () => {
  const page = await adminPage();
  await signIn(page);
  if (page.url().includes("/login")) {
    await open(page, "/dashboard");
  }
  if (page.url().includes("/login")) throw new Error("Still on login");
  return page.url();
});

await runTest("3. Fill New advertiser and create it", async () => {
  const page = await adminPage();
  await open(page, "/advertisers/new");
  await page.locator('input[name="name"]').fill(names.advertiser);
  await page.locator('input[name="company"]').fill("Ten Lab");
  await page.locator('input[name="email"]').fill(`brand-${stamp}@lab.admexo.test`);
  await page.locator('select[name="status"]').selectOption("active");
  await submitTo(page, "Create advertiser", /\/advertisers\/\d+/);
  state.advertiserId = Number(page.url().match(/\/advertisers\/(\d+)/)[1]);
  return `id ${state.advertiserId}`;
});

await runTest("4. Fill New affiliate as Active and create it", async () => {
  const page = await adminPage();
  await open(page, "/affiliates/new");
  await page.locator('input[name="name"]').fill(names.affiliate);
  await page.locator('input[name="company"]').fill("Ten Pub");
  await page.locator('input[name="email"]').fill(`pub-${stamp}@lab.admexo.test`);
  await page.locator('select[name="status"]').selectOption("active");
  await submitTo(page, "Create affiliate", /\/affiliates\/\d+/);
  state.affiliateId = Number(page.url().match(/\/affiliates\/(\d+)/)[1]);
  return `id ${state.affiliateId}`;
});

await runTest("5. Fill New offer with click_id landing and create it", async () => {
  const page = await adminPage();
  await open(page, `/offers/new?fresh=${stamp}`);
  await page.locator(`select[name="advertiser_id"] option`).filter({ hasText: names.advertiser }).waitFor({ state: "attached", timeout: 20000 });
  await page.locator('input[name="name"]').fill(names.offer);
  await page.locator('select[name="advertiser_id"]').selectOption(String(state.advertiserId));
  await page.locator('input[name="offer_url"]').fill(landing);
  await page.locator('input[name="payout"]').fill("1");
  await page.locator('input[name="revenue"]').fill("2");
  await page.locator('select[name="status"]').selectOption("active");
  const strict = page.locator('input[name="google_strict"]');
  if (await strict.isChecked()) await strict.uncheck();
  await submitTo(page, "Create offer", /\/offers\/\d+/);
  state.offerId = Number(page.url().match(/\/offers\/(\d+)/)[1]);
  return `id ${state.offerId}`;
});

await runTest("6. Approve the affiliate on the offer (creates tracking link)", async () => {
  if (!state.offerId) throw new Error("No offer from test 5");
  const page = await adminPage();
  await open(page, `/offers/${state.offerId}`);
  await page.locator(`select[name="affiliate_id"] option`).filter({ hasText: names.affiliate }).waitFor({ state: "attached", timeout: 20000 });
  await page.locator('select[name="affiliate_id"]').selectOption(String(state.affiliateId));
  await page.locator('form:has(button:has-text("Save access")) select[name="status"]').selectOption("approved");
  await page.getByRole("button", { name: "Save access" }).click();
  await page.waitForTimeout(2500);
  await open(page, `/offers/${state.offerId}`);
  const html = await page.content();
  const match = html.match(/\/t\/([a-z0-9]+)/i);
  if (!match) throw new Error(`No tracking link | ${await pageError(page)}`);
  state.trackUrl = `${base}/t/${match[1]}`;
  return state.trackUrl;
});

await runTest("7. Proxy click lands with a click_id", async () => {
  if (!state.trackUrl) throw new Error("No tracking link from test 6");
  const proxy = proxyAt(7);
  return withBrowser(proxy, userAgents[2], async (page) => {
    await page.goto("https://api.ipify.org?format=json", nav);
    const ip = JSON.parse(await page.locator("body").innerText()).ip;
    state.ips.push(ip);
    await page.goto(`${state.trackUrl}?sub1=ten-tests&sub2=click`, nav);
    const landed = page.url();
    const clickId = new URL(landed).searchParams.get("click_id") || "";
    if (!clickId) throw new Error(`No click_id on ${landed}`);
    state.clickIds.push(clickId);
    await page.waitForTimeout(1500);
    return `${ip} click=${clickId}`;
  });
});

await runTest("8. Convert that click from the landing form", async () => {
  const proxy = proxyAt(8);
  const clickId = state.clickIds[0];
  if (!clickId) throw new Error("No click from test 7");
  return withBrowser(proxy, userAgents[2], async (page) => {
    await page.goto(`${base}/lab/landing?click_id=${clickId}&sub1=ten-tests`, nav);
    await page.getByRole("button", { name: "Complete signup" }).click();
    await page.waitForSelector("[data-lab-result]", { timeout: 20000 });
    const text = (await page.locator("[data-lab-result]").innerText()).trim();
    if (!/200/.test(text)) throw new Error(text);
    return text;
  });
});

await runTest("9. Second proxy click, convert, then reject the duplicate", async () => {
  if (!state.trackUrl) throw new Error("No tracking link from test 6");
  const proxy = proxyAt(9);
  return withBrowser(proxy, userAgents[3], async (page) => {
    await page.goto("https://api.ipify.org?format=json", nav);
    const ip = JSON.parse(await page.locator("body").innerText()).ip;
    if (state.ips.includes(ip)) {
      /* still ok if pool overlaps, but record it */
    }
    state.ips.push(ip);
    await page.goto(`${state.trackUrl}?sub1=ten-tests&sub2=dup`, nav);
    const clickId = new URL(page.url()).searchParams.get("click_id") || "";
    if (!clickId) throw new Error("Second click missed click_id");
    state.clickIds.push(clickId);
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Complete signup" }).click();
    await page.waitForSelector("[data-lab-result]", { timeout: 20000 });
    const first = (await page.locator("[data-lab-result]").innerText()).trim();
    await page.getByRole("button", { name: "Complete signup" }).click();
    await page.waitForTimeout(1500);
    const second = (await page.locator("[data-lab-result]").innerText()).trim();
    if (!/200/.test(first)) throw new Error(`first convert ${first}`);
    if (!/Already recorded/i.test(second)) throw new Error(`duplicate was ${second}`);
    return `${ip} click=${clickId} ${second}`;
  });
});

await runTest("10. Desk Clicks and Conversions show the new click ids and IPs", async () => {
  if (!state.clickIds.length) throw new Error("No click ids from tests 7-9");
  const page = await adminPage();
  await open(page, "/clicks");
  const clicksHtml = await page.content();
  await open(page, "/conversions");
  const convHtml = await page.content();
  const missing = [];
  for (const id of state.clickIds) {
    if (!clicksHtml.includes(id)) missing.push(`clicks missing ${id}`);
    if (!convHtml.includes(id)) missing.push(`conversions missing ${id}`);
  }
  if (missing.length) throw new Error(missing.join("; "));
  return `ids ${state.clickIds.join(", ")}`;
});

if (admin) {
  await admin.context.close();
  await admin.browser.close();
}

writeState({
  ...state,
  advertiserName: names.advertiser,
  affiliateName: names.affiliate,
  offerName: names.offer,
});
const failed = results.filter((row) => !row.ok).length;
const path = writeResult(`ten-tests-${stamp}.json`, { stamp, failed, results, state });
console.log(JSON.stringify({ ok: failed === 0, passed: results.length - failed, failed, result: path }, null, 2));
if (failed) process.exit(1);
