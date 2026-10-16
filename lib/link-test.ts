import { run } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/safe-url";
import { nowUtc } from "@/lib/format";
import type { Hop, LinkTestResult } from "@/lib/types";

const AGENTS: Record<string, string> = {
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  tablet: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

async function safeUrl(raw: string) {
  try {
    return await assertPublicHttpUrl(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not test that link.";
    if (message.includes("private")) throw new Error("That host points at a private network, so the test was stopped.");
    if (message.includes("http")) throw new Error("Only http and https links can be tested.");
    throw error;
  }
}

export async function testRedirects(start: string, device: string): Promise<LinkTestResult> {
  const hops: Hop[] = [];
  let current = start;
  try {
    current = await safeUrl(start);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not test that link.";
    return { ok: false, finalUrl: start, hops, message };
  }

  for (let i = 0; i < 10; i += 1) {
    const started = Date.now();
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": AGENTS[device] || AGENTS.desktop, Accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      const location = response.headers.get("location");
      hops.push({ url: current, status: response.status, location, ms: Date.now() - started });
      if (response.status < 300 || response.status >= 400 || !location) {
        const ok = response.status >= 200 && response.status < 400;
        return {
          ok,
          finalUrl: current,
          hops,
          message: ok ? "The link reached a final page." : `The link stopped on HTTP ${response.status}.`,
        };
      }
      current = await safeUrl(new URL(location, current).toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "The request failed.";
      hops.push({ url: current, status: null, location: null, ms: Date.now() - started, error: message });
      return { ok: false, finalUrl: current, hops, message };
    }
  }
  return { ok: false, finalUrl: current, hops, message: "Stopped after 10 redirects." };
}

export async function pauseOffer(offerId: number) {
  (await run("UPDATE offers SET status = 'paused', updated_at = ? WHERE id = ?", nowUtc(), offerId));
}
