import { chromium } from "playwright";

const base = process.env.BASE || "https://www.adcliqx.com";
const out = process.argv[2] || ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@admexo.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "Admin123");
await Promise.all([page.waitForURL(/dashboard|portal/), page.click('button:has-text("Sign in")')]);

await page.goto(`${base}/reports?from=2026-06-27&to=2026-11-03&group=affiliate`);
await page.waitForSelector("text=Click any row");
await page.screenshot({ path: `${out}/1-reports.png` });

await page.click('table a:has-text("Ten Pub")');
await page.waitForSelector("text=Valid clicks");
await page.screenshot({ path: `${out}/2-detail-clicks.png` });
console.log("detail url", page.url());

await page.click('a:has-text("Conversions (")');
await page.waitForSelector("text=Conv. ID");
await page.screenshot({ path: `${out}/3-detail-conversions.png` });

await page.click('td a[href^="/clicks/"]');
await page.waitForSelector("text=User agent");
await page.screenshot({ path: `${out}/4-click.png`, fullPage: true });
console.log("click url", page.url());

await page.goto(`${base}/reports?from=2026-11-03&to=2026-11-03&group=hour`);
await page.waitForSelector("text=Click any row");
const hour = page.locator("table tbody tr a").first();
const hourText = await hour.textContent();
await hour.click();
await page.waitForSelector("text=Valid clicks");
console.log("hour drill", hourText, "->", page.url());
await browser.close();
