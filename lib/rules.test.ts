import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateAddress } from "./safe-url.ts";
import { attributionOpen, cleanScheduleDays, scheduleOpen } from "./rules.ts";

test("private addresses are refused", () => {
  assert.equal(isPrivateAddress("127.0.0.1"), true);
  assert.equal(isPrivateAddress("10.1.2.3"), true);
  assert.equal(isPrivateAddress("192.168.1.9"), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
});

test("a click older than the window is closed", () => {
  const created = "2026-01-01 00:00:00";
  const later = Date.parse("2026-02-15T00:00:00Z");
  assert.equal(attributionOpen(created, 24, later), false);
  assert.equal(attributionOpen(created, 24, Date.parse("2026-01-01T12:00:00Z")), true);
});

test("schedule uses the listed IST days and hours", () => {
  const wednesdayNoon = new Date("2026-01-07T06:30:00Z");
  assert.equal(scheduleOpen({ days: "3", startHour: 9, endHour: 18 }, wednesdayNoon), true);
  assert.equal(scheduleOpen({ days: "1", startHour: 9, endHour: 18 }, wednesdayNoon), false);
  assert.equal(scheduleOpen({ days: "", startHour: 0, endHour: 6 }, wednesdayNoon), false);
});

test("schedule days keep only 0 through 6", () => {
  assert.equal(cleanScheduleDays("mon 1, 3, 9, 3"), "1,3");
});
