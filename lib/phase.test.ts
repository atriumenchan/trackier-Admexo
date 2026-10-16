import assert from "node:assert/strict";
import test from "node:test";
import { runAfterResponse } from "./defer.ts";
import { ledgerBalance } from "./format.ts";
import { stricterAction } from "./rules.ts";

test("ledger lines sum to the balance", () => {
  assert.equal(ledgerBalance([{ amount: 10 }, { amount: -10 }, { amount: 2.5 }]), 2.5);
});

test("pause beats reject and reject beats flag", () => {
  assert.equal(stricterAction("flag", "reject"), "reject");
  assert.equal(stricterAction("reject", "flag"), "reject");
  assert.equal(stricterAction("reject", "pause"), "pause");
});

test("click work starts without blocking the caller", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finished = false;
  const task = runAfterResponse(async () => {
    await gate;
    finished = true;
  });
  assert.equal(finished, false);
  release();
  await task;
  assert.equal(finished, true);
});
