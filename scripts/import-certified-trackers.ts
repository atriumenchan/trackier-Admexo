import fs from "fs";
import path from "path";
import { parseCertifiedTrackerTable } from "../lib/certified-trackers.ts";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node --experimental-strip-types scripts/import-certified-trackers.ts compliance/certified-click-trackers.txt");
  process.exit(1);
}
const text = fs.readFileSync(source, "utf8");
const trackers = parseCertifiedTrackerTable(text);
const out = path.join(process.cwd(), "compliance", "certified-trackers.json");
fs.writeFileSync(out, `${JSON.stringify({ trackers }, null, 2)}\n`);
console.log(`${trackers.length} trackers written to compliance/certified-trackers.json`);
