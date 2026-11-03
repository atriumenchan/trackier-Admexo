import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));
export const statePath = join(here, ".state.json");
export const resultsDir = join(here, "results");

export function baseUrl() {
  return (process.env.TRACK_BASE || "https://trackier-admexo.vercel.app").replace(/\/$/, "");
}

export function proxyFile() {
  return process.env.PROXY_FILE || "C:\\Users\\ADMEXO\\Downloads\\assets\\Webshare 250 proxies (1).txt";
}

export function loadProxies() {
  const text = readFileSync(proxyFile(), "utf8");
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(":");
    if (parts.length < 4) continue;
    const [host, port, username, ...rest] = parts;
    const password = rest.join(":");
    if (!host || !port || !username || !password) continue;
    rows.push({
      host,
      port,
      username,
      password,
      server: `http://${host}:${port}`,
      label: `${host}:${port}`,
    });
  }
  if (!rows.length) throw new Error(`No proxies found in ${proxyFile()}`);
  return rows;
}

export function readState() {
  if (!existsSync(statePath)) throw new Error("Run npm run lab:seed first.");
  return JSON.parse(readFileSync(statePath, "utf8"));
}

export function writeState(state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function writeResult(name, data) {
  mkdirSync(resultsDir, { recursive: true });
  const path = join(resultsDir, name);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

export function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export function storeCookies(jar, response) {
  const raw = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  for (const line of raw) {
    const pair = String(line).split(";")[0];
    const idx = pair.indexOf("=");
    if (idx < 1) continue;
    jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

export async function login(base, email, password) {
  const jar = new Map();
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  const response = await fetch(`${base}/api/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: { origin: base },
  });
  storeCookies(jar, response);
  if (!jar.has("trk_session")) throw new Error("Login did not set a session cookie.");
  return jar;
}

export async function desk(base, jar, action, fields) {
  const form = new FormData();
  form.set("_action", action);
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === "") continue;
    form.set(key, String(value));
  }
  const response = await fetch(`${base}/api/desk`, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: { cookie: cookieHeader(jar), origin: base },
  });
  storeCookies(jar, response);
  return response;
}

export async function pageHtml(base, jar, path) {
  const response = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader(jar) },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.text();
}

export function hrefId(html, prefix, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`href="${prefix}/(\\d+)"[^>]*>\\s*${escaped}`));
  return match ? Number(match[1]) : 0;
}

export const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
];
