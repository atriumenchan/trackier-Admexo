import { all, one, run } from "@/lib/db";
import { clip, countryList, nowUtc } from "@/lib/format";
import type { Offer, SyncSource } from "@/lib/types";

type FeedOffer = {
  externalId: string;
  name: string;
  previewUrl: string;
  offerUrl: string;
  payout: number;
  revenue: number;
  model: string;
  countries: string;
  devices: string;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function amount(record: Record<string, unknown>, keys: string[]) {
  const raw = text(record, keys);
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function list(value: unknown) {
  if (Array.isArray(value)) return countryList(value.map(String).join(",")).join(",");
  if (typeof value === "string") return countryList(value).join(",");
  return "";
}

export function parseOfferFeed(payload: unknown): FeedOffer[] {
  const record = asRecord(payload);
  const rows = Array.isArray(payload)
    ? payload
    : record && Array.isArray(record.offers)
      ? record.offers
      : record && Array.isArray(record.data)
        ? record.data
        : [];
  const parsed: FeedOffer[] = [];
  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const externalId = text(item, ["id", "offer_id", "external_id"]);
    const name = text(item, ["name", "title", "offer_name"]);
    const offerUrl = text(item, ["tracking_url", "offer_url", "url"]);
    if (!externalId || !name || !offerUrl) continue;
    const model = text(item, ["model", "type"]).toUpperCase();
    const devicesRaw = text(item, ["devices", "device"]).toLowerCase();
    parsed.push({
      externalId: clip(externalId, 80),
      name: clip(name, 160),
      previewUrl: clip(text(item, ["preview_url", "preview"]), 400),
      offerUrl: clip(offerUrl, 1000),
      payout: amount(item, ["payout", "payout_amount"]),
      revenue: amount(item, ["revenue", "revenue_amount"]) || amount(item, ["payout", "payout_amount"]),
      model: ["CPA", "CPL", "CPS", "REVSHARE"].includes(model) ? (model === "REVSHARE" ? "RevShare" : model) : "CPA",
      countries: list(item.countries ?? item.geo ?? item.country),
      devices: ["mobile", "desktop", "tablet"].includes(devicesRaw) ? devicesRaw : "all",
      status: text(item, ["status"]).toLowerCase() === "paused" ? "paused" : "active",
    });
  }
  return parsed;
}

export async function applyOfferFeed(source: SyncSource, payload: unknown, pauseMissing = true) {
  const incoming = parseOfferFeed(payload);
  if (!incoming.length) {
    throw new Error("No offers found. Expect a JSON array, or an object with an offers list.");
  }
  const seen = new Set<string>();
  let created = 0;
  let updated = 0;
  const now = nowUtc();
  for (const item of incoming) {
    seen.add(item.externalId);
    const existing = (await one<Offer>(
      "SELECT * FROM offers WHERE advertiser_id = ? AND external_id = ?",
      source.advertiser_id,
      item.externalId,
    ));
    if (existing) {
      (await run(
        `UPDATE offers SET name = ?, preview_url = ?, offer_url = ?, payout = ?, revenue = ?, model = ?,
         countries = ?, country_mode = ?, devices = ?, status = ?, sync_source_id = ?, updated_at = ?
         WHERE id = ?`,
        item.name,
        item.previewUrl,
        item.offerUrl,
        item.payout,
        item.revenue,
        item.model,
        item.countries,
        item.countries ? "allow" : "all",
        item.devices,
        item.status,
        source.id,
        now,
        existing.id,
      ));
      updated += 1;
    } else {
      (await run(
        `INSERT INTO offers (
          advertiser_id, name, description, preview_url, offer_url, model, currency, payout, revenue,
          status, visibility, country_mode, countries, devices, fallback_url, external_id, sync_source_id,
          created_at, updated_at
        ) VALUES (?, ?, '', ?, ?, ?, 'USD', ?, ?, ?, 'private', ?, ?, ?, '', ?, ?, ?, ?)`,
        source.advertiser_id,
        item.name,
        item.previewUrl,
        item.offerUrl,
        item.model,
        item.payout,
        item.revenue,
        item.status,
        item.countries ? "allow" : "all",
        item.countries,
        item.devices,
        item.externalId,
        source.id,
        now,
        now,
      ));
      created += 1;
    }
  }
  let paused = 0;
  if (pauseMissing) {
    const owned = (await all<Offer>(
      "SELECT * FROM offers WHERE sync_source_id = ? AND external_id IS NOT NULL",
      source.id,
    ));
    for (const offer of owned) {
      if (offer.external_id && !seen.has(offer.external_id) && offer.status === "active") {
        (await run("UPDATE offers SET status = 'paused', updated_at = ? WHERE id = ?", now, offer.id));
        paused += 1;
      }
    }
  }
  return { created, updated, paused, total: incoming.length };
}

export async function fetchOfferFeed(source: SyncSource) {
  let url: URL;
  try {
    url = new URL(source.endpoint_url);
  } catch {
    throw new Error("The sync URL is not valid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("The sync URL must be http or https.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (source.api_key) headers.Authorization = `Bearer ${source.api_key}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000), redirect: "follow" });
  if (!response.ok) throw new Error(`The advertiser API returned HTTP ${response.status}.`);
  return response.json();
}
