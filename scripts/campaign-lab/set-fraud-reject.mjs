import { chromium } from "playwright";

const base = process.env.BASE || "https://www.adcliqx.com";
const out = process.argv[2] || ".";
const names = (process.env.RULES || "Bot,Click burst").split(",");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@admexo.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "Admin123");
await Promise.all([page.waitForURL(/dashboard|portal/), page.click('button:has-text("Sign in")')]);

for (const name of names) {
  await page.goto(`${base}/fraud`);
  const row = page.locator("tbody tr").filter({ has: page.locator(`td:text-is("${name}")`) }).first();
  await row.locator('select[name="action"]').selectOption("reject");
  await Promise.all([page.waitForURL(/ok=/), row.locator('button:has-text("Save")').click()]);
  console.log("saved", name);
}
await page.goto(`${base}/fraud`);
const actions = await page.$$eval("tbody tr", (rows) => rows.map((row) => {
  const cells = row.querySelectorAll("td");
  const select = row.querySelector('select[name="action"]');
  return cells.length && select ? `${cells[0].textContent} -> ${select.value}` : null;
}).filter(Boolean));
console.log(actions.join("\n"));
await page.screenshot({ path: `${out}/fraud-rules.png` });
await browser.close();
