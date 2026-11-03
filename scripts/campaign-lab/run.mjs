import { chromium } from "playwright";
import { loadProxies, readState, userAgents, writeResult } from "./lib.mjs";

const state = readState();
const proxies = loadProxies();
const clicksWanted = Math.max(1, Number(process.env.LAB_CLICKS || 16) || 16);
const convertRate = Math.min(1, Math.max(0, Number(process.env.LAB_CONVERT_RATE || 0.25) || 0));
const startIndex = Math.floor(Math.random() * proxies.length);

const jobs = [];
for (let i = 0; i < clicksWanted; i += 1) {
  jobs.push({
    n: i + 1,
    proxy: proxies[(startIndex + i) % proxies.length],
    ua: userAgents[i % userAgents.length],
    convert: i < 2 || Math.random() < convertRate,
    duplicate: i === 0,
    sub1: "lab-campaign",
    sub2: i % 2 === 0 ? "feed-a" : "feed-b",
    sub3: `ad-${(i % 4) + 1}`,
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];
let proxyFails = 0;

async function runJob(job) {
  const context = await browser.newContext({
    proxy: {
      server: job.proxy.server,
      username: job.proxy.username,
      password: job.proxy.password,
    },
    userAgent: job.ua,
    ignoreHTTPSErrors: true,
    viewport: job.ua.includes("Mobile") || job.ua.includes("iPhone")
      ? { width: 390, height: 844 }
      : { width: 1365, height: 900 },
  });
  const page = await context.newPage();
  const row = {
    n: job.n,
    proxy: job.proxy.label,
    convert: job.convert,
    exitIp: "",
    clickId: "",
    landing: "",
    convertStatus: "",
    duplicateStatus: "",
    error: "",
  };
  try {
    const ipPage = await page.goto("https://api.ipify.org?format=json", { waitUntil: "domcontentloaded", timeout: 25000 });
    if (!ipPage || !ipPage.ok()) throw new Error(`ipify ${ipPage?.status() || "no response"}`);
    const ipJson = JSON.parse(await page.locator("body").innerText());
    row.exitIp = ipJson.ip || "";
    if (!row.exitIp) throw new Error("Proxy did not return an exit IP.");

    const track = `${state.trackUrl}?sub1=${job.sub1}&sub2=${job.sub2}&sub3=${job.sub3}`;
    const landed = await page.goto(track, { waitUntil: "domcontentloaded", timeout: 35000 });
    row.landing = page.url();
    if (!landed) throw new Error("Tracking click had no response.");
    if (row.landing.includes("/unavailable")) throw new Error("Tracker sent the click to /unavailable.");
    const clickId = new URL(row.landing).searchParams.get("click_id") || "";
    row.clickId = clickId;
    if (!clickId) throw new Error(`Landing missed click_id: ${row.landing}`);
    await page.waitForTimeout(2500);

    if (job.convert) {
      await page.getByRole("button", { name: "Complete signup" }).click();
      await page.waitForSelector("[data-lab-result]", { timeout: 20000 });
      row.convertStatus = (await page.locator("[data-lab-result]").innerText()).trim();
      if (job.duplicate) {
        await page.getByRole("button", { name: "Complete signup" }).click();
        await page.waitForTimeout(1500);
        row.duplicateStatus = (await page.locator("[data-lab-result]").innerText()).trim();
      }
    }
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
    if (/proxy|ERR_TUNNEL|ERR_SOCKS|ipify|Timeout/i.test(row.error)) proxyFails += 1;
  } finally {
    await context.close();
  }
  results.push(row);
  const mark = row.error ? "FAIL" : job.convert ? "CONV" : "CLICK";
  console.log(`${mark} #${job.n} ${job.proxy.label} ip=${row.exitIp || "-"} click=${row.clickId || "-"} ${row.convertStatus || row.error || "ok"}`);
}

for (const job of jobs) await runJob(job);
await browser.close();

const ok = results.filter((row) => !row.error);
const converted = ok.filter((row) => row.convert && /200|OK|Already recorded/i.test(row.convertStatus));
const uniqueIps = new Set(ok.map((row) => row.exitIp).filter(Boolean));
const summary = {
  trackUrl: state.trackUrl,
  offerId: state.offerId,
  attempted: jobs.length,
  ok: ok.length,
  failed: results.length - ok.length,
  converted: converted.length,
  uniqueExitIps: uniqueIps.size,
  proxyFails,
  ips: [...uniqueIps],
  rows: results,
};
const path = writeResult(`campaign-${state.stamp}.json`, summary);
console.log(JSON.stringify({
  ok: true,
  result: path,
  attempted: summary.attempted,
  landed: summary.ok,
  converted: summary.converted,
  uniqueExitIps: summary.uniqueExitIps,
  failed: summary.failed,
}, null, 2));
if (!summary.ok) process.exit(1);
