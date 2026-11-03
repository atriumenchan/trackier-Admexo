import { chromium } from "playwright";

const base = process.env.BASE || "https://www.adcliqx.com";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@admexo.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "Admin123");
await Promise.all([page.waitForURL(/dashboard|portal/), page.click('button:has-text("Sign in")')]);

await page.goto(`${base}/fraud`);
await page.waitForSelector("text=Recent hit");
if (await page.locator('td:text-is("Datacenter IP")').count()) {
  console.log("rule already exists");
} else {
  const form = page.locator('form:has(input[name="name"][placeholder="Rule name"])');
  await form.locator('input[name="name"]').fill("Datacenter IP");
  await form.locator('select[name="metric"]').selectOption("datacenter");
  await form.locator('select[name="action"]').selectOption("reject");
  await form.locator('input[name="threshold"]').fill("1");
  await Promise.all([page.waitForURL(/ok=|error=/), form.locator('button:has-text("Save rule")').click()]);
  console.log("result", decodeURIComponent(page.url().split("?")[1] || ""));
}
await page.goto(`${base}/fraud`);
await page.waitForSelector("text=Recent hit");
const rules = await page.$$eval("tbody tr", (rows) => rows.map((row) => {
  const select = row.querySelector('select[name="action"]');
  return select ? [...row.querySelectorAll("td")].slice(0, 4).map((cell) => cell.textContent?.trim()).join(" | ") + " | " + select.value : null;
}).filter(Boolean));
console.log(rules.join("\n"));
await browser.close();
