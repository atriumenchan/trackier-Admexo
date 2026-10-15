import { randomBytes } from "crypto";

export function nowUtc() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function istToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00+05:30`);
  date.setTime(date.getTime() + days * 86400000);
  return istToday(date);
}

export function istRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+05:30`).toISOString().slice(0, 19).replace("T", " ");
  const end = new Date(`${to}T00:00:00+05:30`);
  end.setTime(end.getTime() + 86400000);
  return { start, end: end.toISOString().slice(0, 19).replace("T", " ") };
}

export function dayStartUtc(day = istToday()) {
  return istRange(day, day).start;
}

export function formatStamp(utcSql: string | null | undefined) {
  if (!utcSql) return "—";
  const date = new Date(utcSql.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return utcSql;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function money(amount: number, currency = "USD") {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function num(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount || 0);
}

export function percent(rate: number) {
  if (!Number.isFinite(rate)) return "0.00%";
  return `${(rate * 100).toFixed(2)}%`;
}

export function shortCode(length = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function clip(value: string, max = 180) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

export function countryList(value: string) {
  return value
    .split(/[,\s]+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => /^[A-Z]{2}$/.test(part))
    .filter((part, index, all) => all.indexOf(part) === index);
}
