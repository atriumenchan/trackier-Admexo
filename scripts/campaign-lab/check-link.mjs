import { baseUrl, cookieHeader, login } from "./lib.mjs";

const base = "https://www.adcliqx.com";
const jar = await login(base, "admin@admexo.com", process.env.TRACK_ADMIN_PASSWORD);
const html = await fetch(`${base}/offers/9`, { headers: { cookie: cookieHeader(jar) } }).then((r) => r.text());
const links = [...html.matchAll(/https?:\/\/[^"'<\s]+\/t\/[a-z0-9]+/gi)].map((m) => m[0]);
console.log(JSON.stringify({ status: html.includes("Tracking link"), links: [...new Set(links)] }, null, 2));
