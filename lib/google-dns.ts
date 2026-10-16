import { resolveCname } from "dns/promises";

export async function cnameChain(host: string) {
  const found: string[] = [];
  let current = host;
  for (let depth = 0; depth < 5; depth += 1) {
    let next: string[] = [];
    try {
      next = await resolveCname(current);
    } catch {
      break;
    }
    if (!next.length) break;
    found.push(...next.map((item) => item.replace(/\.$/, "").toLowerCase()));
    current = next[0];
  }
  return found;
}
