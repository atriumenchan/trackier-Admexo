import { chromium } from "playwright";

const base = process.env.BASE || "https://www.adcliqx.com";
const out = process.argv[2] || ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@admexo.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "Admin123");
await Promise.all([page.waitForURL(/dashboard|portal/), page.click('button:has-text("Sign in")')]);
await page.goto(`${base}/fraud`);
await page.waitForSelector("text=Recent hit");
await page.screenshot({ path: `${out}/fraud-page.png` });
const hits = await page.$$eval("table", (tables) => [...tables[tables.length - 1].querySelectorAll("tbody tr")].slice(0, 4).map((row) => row.innerText.replace(/\s+/g, " ")));
console.log(hits.join("\n"));
await browser.close();
