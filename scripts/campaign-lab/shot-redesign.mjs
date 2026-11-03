import { chromium } from "playwright";

const base = process.env.BASE || "https://www.adcliqx.com";
const out = process.argv[2] || ".";
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (error) => errors.push(`${page.url()} ${error.message}`));

await page.goto(`${base}/`);
await page.waitForSelector("text=Under control");
await page.screenshot({ path: `${out}/r1-home.png` });
await page.screenshot({ path: `${out}/r1-home-full.png`, fullPage: true });

await page.goto(`${base}/login`);
await page.screenshot({ path: `${out}/r2-login.png` });
await page.fill('input[name="email"]', "admin@admexo.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "Admin123");
await Promise.all([page.waitForURL(/dashboard|portal/), page.click('button:has-text("Sign in")')]);

const pages = [
  ["r3-dashboard", "/dashboard?range=30", "Net profit"],
  ["r4-reports", "/reports?from=2026-06-27&to=2026-11-03&group=affiliate", "Quick range"],
  ["r5-clicks", "/clicks", "Download CSV"],
  ["r6-conversions", "/conversions", "Download CSV"],
  ["r7-offers", "/offers", "Offers"],
  ["r8-fraud", "/fraud", "Fraud"],
];
for (const [name, path, marker] of pages) {
  await page.goto(`${base}${path}`);
  await page.waitForSelector(`text=${marker}`, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png` });
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${base}/`);
await mobile.screenshot({ path: `${out}/r9-home-mobile.png` });
console.log(errors.length ? errors.join("\n") : "no page errors");
await browser.close();
