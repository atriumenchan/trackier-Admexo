import fs from "fs";
import path from "path";
import { CLICK_ROUTE_FILES } from "../compliance/google-transparency.config";
import { assertClickRoutesWrapped } from "./google-click";

export async function bootGoogleClickRoutes() {
  await import("../app/t/[code]/route");
  await import("../app/s/[code]/route");
  const root = process.cwd();
  for (const rel of CLICK_ROUTE_FILES) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const source = fs.readFileSync(full, "utf8");
    if (!source.includes("enforceGoogleClick") || !source.includes("export async function GET") || !source.includes("export async function HEAD")) {
      throw new Error(`${rel} is missing the Google transparency hook.`);
    }
  }
  assertClickRoutesWrapped();
}
