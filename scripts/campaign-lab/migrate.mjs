import { baseUrl, cookieHeader, login } from "./lib.mjs";

const password = process.env.TRACK_ADMIN_PASSWORD;
if (!password) {
  console.error("Set TRACK_ADMIN_PASSWORD");
  process.exit(1);
}
const base = baseUrl();
const jar = await login(base, process.env.TRACK_ADMIN_EMAIL || "admin@admexo.com", password);
const response = await fetch(`${base}/api/schema`, {
  method: "POST",
  headers: { cookie: cookieHeader(jar), origin: base },
});
const text = await response.text();
console.log(response.status, text);
if (!response.ok) process.exit(1);
