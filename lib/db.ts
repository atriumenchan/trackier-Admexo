import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import type { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import { hashPassword } from "@/lib/password";
import { nowUtc, shortCode } from "@/lib/format";

type Sql = ReturnType<typeof postgres>;
type Param = string | number | null;

const globalForDb = globalThis as unknown as {
  trackierDb?: DatabaseSync;
  trackierPg?: Sql;
  trackierReady?: Promise<void>;
};
const txStore = new AsyncLocalStorage<Sql>();

export function usingPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || "").replace(/\/$/, "");
}

function supabaseKey() {
  return process.env.SUPABASE_ANON_KEY || "";
}

function driver() {
  if (process.env.VERCEL && supabaseUrl() && supabaseKey()) return "supabase";
  if (process.env.DATABASE_URL) return "postgres";
  if (supabaseUrl() && supabaseKey()) return "supabase";
  return "sqlite";
}

export function istDay(column: string) {
  if (driver() !== "sqlite") return `((${column}::timestamp + interval '330 minutes')::date)::text`;
  return `date(${column}, '+330 minutes')`;
}

function databasePath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "trackier.sqlite");
}

function sqlite() {
  if (!globalForDb.trackierDb) throw new Error("Database is not ready.");
  return globalForDb.trackierDb;
}

async function initSqlite() {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(databasePath());
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  seed(db);
  globalForDb.trackierDb = db;
}

function ensure() {
  if (!globalForDb.trackierReady) {
    globalForDb.trackierReady = (async () => {
      const kind = driver();
      if (kind === "postgres") await initPostgres();
      else if (kind === "supabase") return;
      else if (process.env.VERCEL) throw new Error("Supabase is not connected.");
      else await initSqlite();
    })();
  }
  return globalForDb.trackierReady;
}

function quoteParam(value: Param) {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function bind(sql: string, params: Param[]) {
  let index = 0;
  return sql.replace(/\?/g, () => quoteParam(params[index++]));
}

async function supabaseRows(statement: string) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/rpc/app_query`, {
    method: "POST",
    headers: {
      apikey: supabaseKey(),
      Authorization: `Bearer ${supabaseKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ statement, gate: process.env.QUERY_GATE || "" }),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      message = text;
    }
    throw new Error(message);
  }
  const data = text ? JSON.parse(text) : [];
  return Array.isArray(data) ? data : [];
}

function placeholders(sql: string) {
  if (!usingPostgres()) return sql;
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function shapeRow<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const copy = { ...(row as Record<string, unknown>) };
  const numeric = new Set(["n", "clicks", "conversions", "revenue", "payout", "profit", "amount", "weight", "status_code", "ok", "fraud_flag", "is_default", "id", "payout_id", "goal_id", "link_id", "smart_link_id", "offer_id", "affiliate_id", "advertiser_id", "custom_payout", "custom_revenue", "daily_click_cap", "daily_conversion_cap", "daily_budget_cap", "attribution_hours", "schedule_start_hour", "schedule_end_hour", "threshold", "window_minutes", "changes", "google_strict"]);
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value === "bigint") copy[key] = Number(value);
    else if (typeof value === "string" && numeric.has(key) && /^-?\d+(\.\d+)?$/.test(value)) copy[key] = Number(value);
  }
  return copy as T;
}

function pgClient() {
  const tx = txStore.getStore();
  if (tx) return tx;
  if (!globalForDb.trackierPg) throw new Error("Database is not ready.");
  return globalForDb.trackierPg;
}

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  await ensure();
  const kind = driver();
  if (kind === "sqlite") return sqlite().prepare(sql).all(...params) as T[];
  if (kind === "supabase") {
    const rows = await supabaseRows(bind(sql, params));
    return rows.map((row) => shapeRow(row as T));
  }
  const rows = await pgClient().unsafe(placeholders(sql), params as never[]);
  return rows.map((row) => shapeRow(row as T));
}

export async function one<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await all<T>(sql, ...params);
  return rows[0];
}

export async function run(sql: string, ...params: Param[]) {
  await ensure();
  const kind = driver();
  if (kind === "sqlite") {
    const result = sqlite().prepare(sql).run(...params);
    return { id: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }
  if (kind === "supabase") {
    const insert = /^\s*insert\s+/i.test(sql);
    const skipReturning = /into\s+(settings|blocked_ips|google_domains)\b/i.test(sql);
    const statement = insert && !/returning\s+/i.test(sql) && !skipReturning ? `${sql} RETURNING id` : sql;
    const rows = await supabaseRows(bind(statement, params));
    const rawId = rows[0] && typeof rows[0] === "object" ? (rows[0] as { id?: unknown }).id : 0;
    const id = typeof rawId === "number" ? rawId : Number(rawId || 0);
    return { id: Number.isFinite(id) ? id : 0, changes: rows.length };
  }
  const insert = /^\s*insert\s+/i.test(sql);
  const skipReturning = /into\s+(settings|blocked_ips|google_domains)\b/i.test(sql);
  const statement = insert && !/returning\s+/i.test(sql) && !skipReturning ? `${sql} RETURNING id` : sql;
  const rows = await pgClient().unsafe(placeholders(statement), params as never[]);
  const rawId = rows[0] && typeof rows[0] === "object" ? (rows[0] as { id?: unknown }).id : 0;
  const id = typeof rawId === "number" ? rawId : Number(rawId || 0);
  return { id: Number.isFinite(id) ? id : 0, changes: Number(rows.count ?? 0) };
}

export async function setting(key: string, fallback = "") {
  return (await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", key))?.value ?? fallback;
}

export async function putSetting(key: string, value: string) {
  await run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function transaction<T>(fn: () => Promise<T>) {
  await ensure();
  if (driver() === "supabase") return fn();
  if (driver() !== "postgres") {
    const db = sqlite();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return globalForDb.trackierPg!.begin(async (tx) => txStore.run(tx as unknown as Sql, fn));
}

async function initPostgres() {
  const url = process.env.DATABASE_URL || "";
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ssl: url.includes("localhost") ? false : "require",
  });
  globalForDb.trackierPg = sql;
  const schema = schemaSql().replaceAll("INTEGER PRIMARY KEY AUTOINCREMENT", "INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY");
  for (const statement of schema.split(";")) {
    const query = statement.trim();
    if (query) await sql.unsafe(query);
  }
  try {
    await seedPostgres();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/duplicate key|unique constraint/i.test(message)) throw error;
  }
}

async function seedPostgres() {
  const existing = await pgClient().unsafe("SELECT COUNT(*) AS n FROM users");
  if (Number((existing[0] as { n?: unknown } | undefined)?.n || 0) > 0) return;
  const now = nowUtc();
  const base = (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010")).replace(/\/$/, "");
  const exec = async (statement: string, ...params: Param[]) => {
    const insert = /^\s*insert\s+/i.test(statement) && !/into\s+settings\b/i.test(statement);
    const sqlText = insert ? `${statement} RETURNING id` : statement;
    const rows = await pgClient().unsafe(placeholders(sqlText), params as never[]);
    return Number((rows[0] as { id?: unknown } | undefined)?.id || 0);
  };
  for (const [key, value] of [
    ["base_url", base],
    ["currency", "USD"],
    ["company_name", "ADMEXO"],
    ["fraud_click_limit", "30"],
    ["fraud_window_minutes", "10"],
    ["block_fraud_clicks", "0"],
    ["session_secret", shortCode(32)],
  ] as const) {
    await exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING", key, value);
  }
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@admexo.com").toLowerCase();
  const adminPassword = requiredAdminPassword();
  await exec(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES (?, 'ADMEXO Admin', ?, 'admin', NULL, NULL, ?)`,
    adminEmail,
    hashPassword(adminPassword),
    now,
  );
  if (process.env.VERCEL) return;
  const advertiserId = await exec(
    `INSERT INTO advertisers (name, company, email, website, status, notes, postback_token, created_at)
     VALUES ('Demo Brand', 'Demo Brand', 'demo@brand.test', 'https://example.com', 'active', 'Sample advertiser. Safe to pause or delete.', ?, ?)`,
    shortCode(24),
    now,
  );
  await exec(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES ('demo@brand.test', 'Demo Brand', ?, 'advertiser', NULL, ?, ?)`,
    hashPassword("demo123"),
    advertiserId,
    now,
  );
  const echo = `${base}/api/postback-echo?click_id={click_id}&offer_id={offer_id}&payout={payout}&revenue={revenue}&txid={txid}&status={status}&goal={goal}&sub1={sub1}`;
  const affiliateId = await exec(
    `INSERT INTO affiliates (name, company, email, status, postback_url, notes, created_at)
     VALUES ('Demo Publisher', 'Demo Publisher', 'demo@publisher.test', 'active', ?, 'Sample affiliate. Safe to block or delete.', ?)`,
    echo,
    now,
  );
  await exec(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES ('demo@publisher.test', 'Demo Publisher', ?, 'affiliate', ?, NULL, ?)`,
    hashPassword("demo123"),
    affiliateId,
    now,
  );
  const offerId = await exec(
    `INSERT INTO offers (
      advertiser_id, name, description, preview_url, offer_url, model, currency, payout, revenue,
      status, visibility, country_mode, countries, devices, fallback_url, created_at, updated_at
    ) VALUES (?, 'Demo Install', 'Sample offer used to try a click and a conversion.', 'https://example.com',
      'https://example.com/landing?click_id={click_id}&affiliate_id={affiliate_id}&offer_id={offer_id}&sub1={sub1}',
      'CPA', 'USD', 1.25, 2, 'active', 'public', 'all', '', 'all', '', ?, ?)`,
    advertiserId,
    now,
    now,
  );
  await exec(`INSERT INTO offer_goals (offer_id, name, payout, revenue, is_default) VALUES (?, 'install', 1.25, 2, 1)`, offerId);
  await exec(`INSERT INTO offer_access (offer_id, affiliate_id, status) VALUES (?, ?, 'approved')`, offerId, affiliateId);
  await exec(`INSERT INTO tracking_links (code, offer_id, affiliate_id, created_at) VALUES (?, ?, ?, ?)`, shortCode(8), offerId, affiliateId, now);
  const smartId = await exec(
    `INSERT INTO smart_links (name, code, affiliate_id, sort_mode, status, fallback_url, created_at)
     VALUES ('Demo smart link', ?, ?, 'weight', 'active', '', ?)`,
    shortCode(8),
    affiliateId,
    now,
  );
  await exec(`INSERT INTO smart_link_offers (smart_link_id, offer_id, weight) VALUES (?, ?, 1)`, smartId, offerId);
}

function requiredAdminPassword() {
  const value = process.env.ADMIN_PASSWORD || "";
  if (process.env.VERCEL && (!value || value === "admin123")) {
    throw new Error("Set ADMIN_PASSWORD to a unique value.");
  }
  return value || "admin123";
}

function schemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS advertisers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT NOT NULL DEFAULT '',
      postback_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS affiliates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      postback_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      affiliate_id INTEGER,
      advertiser_id INTEGER,
      api_token TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      advertiser_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      preview_url TEXT NOT NULL DEFAULT '',
      offer_url TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'CPA',
      currency TEXT NOT NULL DEFAULT 'USD',
      payout REAL NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      visibility TEXT NOT NULL DEFAULT 'private',
      country_mode TEXT NOT NULL DEFAULT 'all',
      countries TEXT NOT NULL DEFAULT '',
      devices TEXT NOT NULL DEFAULT 'all',
      attribution_hours INTEGER,
      schedule_days TEXT NOT NULL DEFAULT '',
      schedule_start_hour INTEGER,
      schedule_end_hour INTEGER,
      daily_click_cap INTEGER,
      daily_conversion_cap INTEGER,
      daily_budget_cap REAL,
      fallback_url TEXT NOT NULL DEFAULT '',
      final_url TEXT NOT NULL DEFAULT '',
      google_strict INTEGER NOT NULL DEFAULT 0,
      external_id TEXT,
      sync_source_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offer_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      payout REAL NOT NULL,
      revenue REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS offer_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      affiliate_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      custom_payout REAL,
      custom_revenue REAL,
      daily_click_cap INTEGER,
      daily_conversion_cap INTEGER,
      UNIQUE(offer_id, affiliate_id)
    );
    CREATE TABLE IF NOT EXISTS tracking_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      offer_id INTEGER NOT NULL,
      affiliate_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(offer_id, affiliate_id)
    );
    CREATE TABLE IF NOT EXISTS smart_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      affiliate_id INTEGER NOT NULL,
      sort_mode TEXT NOT NULL DEFAULT 'weight',
      status TEXT NOT NULL DEFAULT 'active',
      fallback_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS smart_link_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      smart_link_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      UNIQUE(smart_link_id, offer_id)
    );
    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY,
      link_id INTEGER,
      smart_link_id INTEGER,
      offer_id INTEGER NOT NULL,
      affiliate_id INTEGER NOT NULL,
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      device TEXT NOT NULL DEFAULT '',
      os TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      sub1 TEXT NOT NULL DEFAULT '',
      sub2 TEXT NOT NULL DEFAULT '',
      sub3 TEXT NOT NULL DEFAULT '',
      sub4 TEXT NOT NULL DEFAULT '',
      sub5 TEXT NOT NULL DEFAULT '',
      sub6 TEXT NOT NULL DEFAULT '',
      sub7 TEXT NOT NULL DEFAULT '',
      sub8 TEXT NOT NULL DEFAULT '',
      sub9 TEXT NOT NULL DEFAULT '',
      sub10 TEXT NOT NULL DEFAULT '',
      gclid TEXT NOT NULL DEFAULT '',
      creative TEXT NOT NULL DEFAULT '',
      vt_device TEXT NOT NULL DEFAULT '',
      vt_campaign TEXT NOT NULL DEFAULT '',
      fraud_flag INTEGER NOT NULL DEFAULT 0,
      fraud_reason TEXT NOT NULL DEFAULT '',
      blocked_reason TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      click_id TEXT,
      offer_id INTEGER NOT NULL,
      affiliate_id INTEGER NOT NULL,
      goal_id INTEGER,
      goal_name TEXT NOT NULL DEFAULT '',
      payout REAL NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL,
      reject_reason TEXT NOT NULL DEFAULT '',
      txid TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      payout_id INTEGER,
      postback_status TEXT NOT NULL DEFAULT 'skipped',
      fraud_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS postback_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      click_id TEXT NOT NULL DEFAULT '',
      conversion_id INTEGER,
      url TEXT NOT NULL DEFAULT '',
      status_code INTEGER,
      body TEXT NOT NULL DEFAULT '',
      ok INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      advertiser_id INTEGER NOT NULL,
      endpoint_url TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      last_run_at TEXT,
      last_status TEXT NOT NULL DEFAULT '',
      last_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id INTEGER NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE TABLE IF NOT EXISTS blocked_ips (
      ip TEXT PRIMARY KEY,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks(created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_offer ON clicks(offer_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_aff ON clicks(affiliate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_ip ON clicks(ip, offer_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conv_created ON conversions(created_at);
    CREATE INDEX IF NOT EXISTS idx_conv_click ON conversions(click_id);
    CREATE INDEX IF NOT EXISTS idx_conv_payout ON conversions(payout_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_txid_unique ON conversions(offer_id, txid) WHERE txid != '';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_ext ON offers(advertiser_id, external_id) WHERE external_id IS NOT NULL AND external_id != '';
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id INTEGER NOT NULL,
      conversion_id INTEGER,
      payout_id INTEGER,
      kind TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fraud_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      metric TEXT NOT NULL,
      threshold REAL NOT NULL,
      window_minutes INTEGER NOT NULL DEFAULT 10,
      action TEXT NOT NULL DEFAULT 'flag',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS traffic_rollups (
      day TEXT NOT NULL,
      offer_id INTEGER NOT NULL,
      affiliate_id INTEGER NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      payout REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (day, offer_id, affiliate_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_aff ON ledger_entries(affiliate_id, id);
    CREATE TABLE IF NOT EXISTS google_domains (
      host TEXT PRIMARY KEY,
      final_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      detail TEXT NOT NULL DEFAULT '',
      checked_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS google_rejections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_code TEXT NOT NULL,
      path TEXT NOT NULL DEFAULT '',
      host TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
`;
}

const COLUMN_ALTERS = [
  "ALTER TABLE offers ADD COLUMN attribution_hours INTEGER",
  "ALTER TABLE offers ADD COLUMN schedule_days TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE offers ADD COLUMN schedule_start_hour INTEGER",
  "ALTER TABLE offers ADD COLUMN schedule_end_hour INTEGER",
  "ALTER TABLE offer_access ADD COLUMN daily_click_cap INTEGER",
  "ALTER TABLE offer_access ADD COLUMN daily_conversion_cap INTEGER",
  "ALTER TABLE clicks ADD COLUMN sub6 TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN sub7 TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN sub8 TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN sub9 TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN sub10 TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE users ADD COLUMN api_token TEXT",
  "ALTER TABLE conversions ADD COLUMN fraud_reason TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE offers ADD COLUMN final_url TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE offers ADD COLUMN google_strict INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE clicks ADD COLUMN gclid TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN creative TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN vt_device TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE clicks ADD COLUMN vt_campaign TEXT NOT NULL DEFAULT ''",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api ON users(api_token) WHERE api_token IS NOT NULL AND api_token != ''",
];

function migrate(db: DatabaseSync) {
  db.exec(schemaSql());
  for (const statement of COLUMN_ALTERS) {
    try {
      db.exec(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/duplicate column/i.test(message)) throw error;
    }
  }
}

function seed(db: DatabaseSync) {
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (users.n > 0) return;

  const now = nowUtc();
  const base = (process.env.APP_URL || "http://localhost:3010").replace(/\/$/, "");
  const insertSetting = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING",
  );
  insertSetting.run("base_url", base);
  insertSetting.run("currency", "USD");
  insertSetting.run("company_name", "ADMEXO");
  insertSetting.run("fraud_click_limit", "30");
  insertSetting.run("fraud_window_minutes", "10");
  insertSetting.run("block_fraud_clicks", "0");
  insertSetting.run("session_secret", shortCode(32));

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@admexo.com").toLowerCase();
  const adminPassword = requiredAdminPassword();
  db.prepare(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES (?, 'ADMEXO Admin', ?, 'admin', NULL, NULL, ?)`,
  ).run(adminEmail, hashPassword(adminPassword), now);

  const advertiser = db
    .prepare(
      `INSERT INTO advertisers (name, company, email, website, status, notes, postback_token, created_at)
       VALUES ('Demo Brand', 'Demo Brand', 'demo@brand.test', 'https://example.com', 'active', 'Sample advertiser. Safe to pause or delete.', ?, ?)`,
    )
    .run(shortCode(24), now);
  const advertiserId = Number(advertiser.lastInsertRowid);

  db.prepare(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES ('demo@brand.test', 'Demo Brand', ?, 'advertiser', NULL, ?, ?)`,
  ).run(hashPassword("demo123"), advertiserId, now);

  const echo = `${base}/api/postback-echo?click_id={click_id}&offer_id={offer_id}&payout={payout}&revenue={revenue}&txid={txid}&status={status}&goal={goal}&sub1={sub1}`;
  const affiliate = db
    .prepare(
      `INSERT INTO affiliates (name, company, email, status, postback_url, notes, created_at)
       VALUES ('Demo Publisher', 'Demo Publisher', 'demo@publisher.test', 'active', ?, 'Sample affiliate. Safe to block or delete.', ?)`,
    )
    .run(echo, now);
  const affiliateId = Number(affiliate.lastInsertRowid);

  db.prepare(
    `INSERT INTO users (email, name, password_hash, role, affiliate_id, advertiser_id, created_at)
     VALUES ('demo@publisher.test', 'Demo Publisher', ?, 'affiliate', ?, NULL, ?)`,
  ).run(hashPassword("demo123"), affiliateId, now);

  const offer = db
    .prepare(
      `INSERT INTO offers (
        advertiser_id, name, description, preview_url, offer_url, model, currency, payout, revenue,
        status, visibility, country_mode, countries, devices, fallback_url, created_at, updated_at
      ) VALUES (?, 'Demo Install', 'Sample offer used to try a click and a conversion.', 'https://example.com',
        'https://example.com/landing?click_id={click_id}&affiliate_id={affiliate_id}&offer_id={offer_id}&sub1={sub1}',
        'CPA', 'USD', 1.25, 2, 'active', 'public', 'all', '', 'all', '', ?, ?)`,
    )
    .run(advertiserId, now, now);
  const offerId = Number(offer.lastInsertRowid);

  db.prepare(
    `INSERT INTO offer_goals (offer_id, name, payout, revenue, is_default) VALUES (?, 'install', 1.25, 2, 1)`,
  ).run(offerId);
  db.prepare(
    `INSERT INTO offer_access (offer_id, affiliate_id, status) VALUES (?, ?, 'approved')`,
  ).run(offerId, affiliateId);
  db.prepare(
    `INSERT INTO tracking_links (code, offer_id, affiliate_id, created_at) VALUES (?, ?, ?, ?)`,
  ).run(shortCode(8), offerId, affiliateId, now);

  const smart = db
    .prepare(
      `INSERT INTO smart_links (name, code, affiliate_id, sort_mode, status, fallback_url, created_at)
       VALUES ('Demo smart link', ?, ?, 'weight', 'active', '', ?)`,
    )
    .run(shortCode(8), affiliateId, now);
  db.prepare(
    `INSERT INTO smart_link_offers (smart_link_id, offer_id, weight) VALUES (?, ?, 1)`,
  ).run(Number(smart.lastInsertRowid), offerId);
}
