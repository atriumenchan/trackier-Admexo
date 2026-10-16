import { all, one, putSetting, run, setting } from "@/lib/db";
import { ledgerBalance, nowUtc, roundMoney } from "@/lib/format";

export type LedgerLine = {
  id: number;
  affiliate_id: number;
  conversion_id: number | null;
  payout_id: number | null;
  kind: string;
  amount: number;
  currency: string;
  note: string;
  created_at: string;
};

export { ledgerBalance, roundMoney };

export async function ensureLedger() {
  if ((await setting("ledger_built", "")) === "1") return;
  const credits = (await all<{ id: number; affiliate_id: number; payout: number; currency: string; created_at: string }>(
    "SELECT id, affiliate_id, payout, currency, created_at FROM conversions WHERE status = 'approved'",
  ));
  for (const row of credits) {
    (await insertLine({
      affiliateId: row.affiliate_id,
      conversionId: row.id,
      payoutId: null,
      kind: "credit",
      amount: row.payout,
      currency: row.currency,
      note: "Approved conversion",
      createdAt: row.created_at,
    }));
  }
  const payouts = (await all<{ id: number; affiliate_id: number; amount: number; currency: string; created_at: string }>(
    "SELECT id, affiliate_id, amount, currency, created_at FROM payouts",
  ));
  for (const row of payouts) {
    (await insertLine({
      affiliateId: row.affiliate_id,
      conversionId: null,
      payoutId: row.id,
      kind: "payout",
      amount: -row.amount,
      currency: row.currency,
      note: "Statement",
      createdAt: row.created_at,
    }));
  }
  (await putSetting("ledger_built", "1"));
}

export async function postLedger(input: {
  affiliateId: number;
  conversionId?: number | null;
  payoutId?: number | null;
  kind: string;
  amount: number;
  currency: string;
  note: string;
}) {
  if ((await setting("ledger_built", "")) !== "1") {
    (await ensureLedger());
    return;
  }
  (await insertLine({
    affiliateId: input.affiliateId,
    conversionId: input.conversionId ?? null,
    payoutId: input.payoutId ?? null,
    kind: input.kind,
    amount: input.amount,
    currency: input.currency,
    note: input.note,
    createdAt: nowUtc(),
  }));
}

async function insertLine(input: {
  affiliateId: number;
  conversionId: number | null;
  payoutId: number | null;
  kind: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
}) {
  if (input.conversionId && (input.kind === "credit" || input.kind === "reversal")) {
    const existing = (await one("SELECT id FROM ledger_entries WHERE conversion_id = ? AND kind = ?", input.conversionId, input.kind));
    if (existing) return;
  }
  if (input.payoutId && (input.kind === "payout" || input.kind === "void")) {
    const existing = (await one("SELECT id FROM ledger_entries WHERE payout_id = ? AND kind = ?", input.payoutId, input.kind));
    if (existing) return;
  }
  (await run(
    `INSERT INTO ledger_entries (affiliate_id, conversion_id, payout_id, kind, amount, currency, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.affiliateId,
    input.conversionId,
    input.payoutId,
    input.kind,
    roundMoney(input.amount),
    input.currency || "USD",
    input.note,
    input.createdAt,
  ));
}

export async function affiliateBalance(affiliateId: number) {
  (await ensureLedger());
  const rows = (await all<{ amount: number }>("SELECT amount FROM ledger_entries WHERE affiliate_id = ?", affiliateId));
  return ledgerBalance(rows);
}

export async function ledgerForAffiliate(affiliateId: number) {
  (await ensureLedger());
  return (await all<LedgerLine>(
    "SELECT * FROM ledger_entries WHERE affiliate_id = ? ORDER BY id DESC LIMIT 50",
    affiliateId,
  ));
}
