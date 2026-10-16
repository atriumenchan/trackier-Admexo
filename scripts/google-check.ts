import { checkGoogleTemplate } from "../lib/google-policy.ts";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

const template = arg("--template");
const finalUrl = arg("--final");
if (!template || !finalUrl) {
  console.error("Usage: node --experimental-strip-types scripts/google-check.ts --template URL --final URL [--probe]");
  process.exit(1);
}
const report = checkGoogleTemplate({ template, finalUrl });
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
