import { baseUrl, cookieHeader, login } from "./lib.mjs";

const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}
const base = baseUrl();
const jar = await login(base, process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com", password);
let total = 0;
for (let round = 0; round < 12; round += 1) {
  const response = await fetch(`${base}/api/geo-backfill`, {
    method: "POST",
    headers: { cookie: cookieHeader(jar), origin: base },
  });
  const text = await response.text();
  console.log(response.status, text);
  if (!response.ok) process.exit(1);
  const json = JSON.parse(text);
  total += json.updated || 0;
  if (!(json.updated || 0)) break;
}
console.log(JSON.stringify({ ok: true, updated: total }));
