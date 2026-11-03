import { request } from "playwright";
import { baseUrl, cookieHeader, loadProxies, login, readState, userAgents, writeResult } from "./lib.mjs";

const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}

const DAYS = Math.max(50, Number(process.env.LAB_REPORT_DAYS || 130) || 130);
const EXTRA = Math.max(0, Number(process.env.LAB_REPORT_EXTRA || 20) || 20);
const CONVERT_EVERY = Math.max(2, Number(process.env.LAB_CONVERT_EVERY || 3) || 3);
const CONCURRENCY = Math.max(1, Number(process.env.LAB_CONCURRENCY || 6) || 6);

const state = readState();
if (!state.trackUrl) throw new Error("No trackUrl in .state.json. Run lab:ten first.");

const base = baseUrl();
const proxies = loadProxies();
const total = DAYS + EXTRA;
const jobs = [];
for (let i = 0; i < total; i += 1) {
  const dayBack = i % DAYS;
  const hour = 6 + (i % 14);
  const when = new Date(Date.now() - dayBack * 86400000);
  when.setUTCHours(hour, (i * 7) % 60, (i * 13) % 60, 0);
  const created_at = when.toISOString().slice(0, 19).replace("T", " ");
  jobs.push({
    i,
    proxy: proxies[i % proxies.length],
    ua: userAgents[i % userAgents.length],
    convert: i % CONVERT_EVERY === 0,
    created_at,
    sub1: "report-fill",
    sub2: `d${dayBack}`,
  });
}

const jar = await login(base, process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com", password);
const cookie = cookieHeader(jar);
const results = [];
let cursor = 0;

async function runJob(job) {
  const ctx = await request.newContext({
    proxy: { server: job.proxy.server, username: job.proxy.username, password: job.proxy.password },
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { "user-agent": job.ua },
  });
  const row = { i: job.i, proxy: job.proxy.label, clickId: "", convert: "", error: "", created_at: job.created_at };
  try {
    const track = `${state.trackUrl}?sub1=${job.sub1}&sub2=${job.sub2}&sub3=${job.i}`;
    const landed = await ctx.get(track, { timeout: 35000, maxRedirects: 8 });
    const url = landed.url();
    const clickId = new URL(url).searchParams.get("click_id") || "";
    row.clickId = clickId;
    if (!clickId) throw new Error(`no click_id on ${url}`);
    if (job.convert) {
      const convert = await ctx.post(`${base}/lab/convert`, {
        timeout: 25000,
        data: { click_id: clickId, txid: `fill-${clickId}`, goal: "" },
        headers: { "content-type": "application/json" },
      });
      row.convert = `${convert.status()} ${(await convert.text()).slice(0, 80)}`;
    }
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  } finally {
    await ctx.dispose();
  }
  return row;
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor];
    cursor += 1;
    const row = await runJob(job);
    results.push(row);
    const mark = row.error ? "FAIL" : "ok";
    console.log(`${mark} ${row.i + 1}/${jobs.length} click=${row.clickId || "-"} ${row.convert || ""} ${row.error || ""}`.trim());
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const stamps = results.filter((row) => row.clickId && !row.error).map((row) => ({ click_id: row.clickId, created_at: row.created_at }));
const stampRes = await fetch(`${base}/api/lab/stamp`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie, origin: base },
  body: JSON.stringify({ items: stamps }),
});
const stampJson = await stampRes.json().catch(() => ({ ok: false }));
console.log("stamp", stampRes.status, stampJson);

const to = new Date().toISOString().slice(0, 10);
const fromDate = new Date(Date.now() - (DAYS - 1) * 86400000).toISOString().slice(0, 10);
const pages = [];
for (const page of [1, 2, 3]) {
  const html = await fetch(`${base}/reports?group=day&from=${fromDate}&to=${to}&page=${page}`, { headers: { cookie } }).then((r) => r.text());
  const days = [...html.matchAll(/<td class="[^"]*">(\d{4}-\d{2}-\d{2})<\/td>/g)].map((m) => m[1]);
  pages.push({ page, days: days.length, first: days[0] || "", last: days[days.length - 1] || "" });
}

const ok = results.filter((row) => row.clickId && !row.error).length;
const converted = results.filter((row) => /200/.test(row.convert || "")).length;
const path = writeResult(`fill-reports-${Date.now()}.json`, { ok, converted, stamp: stampJson, pages, results });
console.log(JSON.stringify({ clicks: ok, converted, stamp: stampJson, pages, result: path }, null, 2));
if (ok < 80 || pages[0].days < 40) process.exit(1);
