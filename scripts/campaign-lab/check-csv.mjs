import { baseUrl, cookieHeader, login } from "./lib.mjs";

const password = process.env.TRACK_ADMIN_PASSWORD;
const base = baseUrl();
const jar = await login(base, "admin@admexo.com", password);
const res = await fetch(`${base}/export?from=2026-06-22&to=2026-10-29`, { headers: { cookie: cookieHeader(jar) } });
const text = await res.text();
const lines = text.split(/\r?\n/).filter(Boolean);
const header = lines[0].replace(/"/g, "");
const want = "publisher_name,source,p1,campaign_name,goalName,goalValue,payout,click_ip,city,country,isp,conversion_id,click_id,elapsed_time,method,note,created,status,payout_in_campaign_currency,payout_in_user_currency,created_date,created_time";
console.log(JSON.stringify({
  status: res.status,
  rows: lines.length - 1,
  cols: header.split(",").length,
  match: header === want,
  header,
  row: lines[1],
}, null, 2));
