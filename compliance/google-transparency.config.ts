// ASSUMPTION: redirection_url is the name that will be submitted on the Google application.
// Changing it later requires a manifest version bump and notice to Google.
export const TRANSPARENCY_PARAM = "redirection_url";
export const FORCE_PARAM = "force_transparent";
export const NON_FOREIGN_PARAMS = ["click_id", "campaign_id"] as const;
export const CERTIFIED_PATHS = ["/t/:code", "/s/:code"] as const;
export const CLICK_ROUTE_FILES = ["app/t/[code]/route.ts", "app/s/[code]/route.ts"] as const;
// These paths must never be used as Google Ads click URLs.
export const NON_CLICK_PATHS = ["/pb/:token", "/api/v1/offers", "/api/v1/clicks", "/api/v1/postbacks", "/api/openapi", "/export", "/unavailable"] as const;
// ASSUMPTION: a host on these suffixes is where the app runs, not a domain the organization owns.
export const PLATFORM_SUFFIXES = ["vercel.app", "vercel.dev"] as const;
// ASSUMPTION: the live Vercel hostname is the host we operate today. It is not a registrable domain we own.
export const OWNED_DOMAINS = ["trackier-admexo.vercel.app"] as const;
export const MANIFEST_VERSION = "1";
export const MAX_TARGET_LENGTH = 4096;
// ASSUMPTION: five hops is enough for a certified chain. Deeper chains are rejected.
export const MAX_NESTED_DEPTH = 5;
// ASSUMPTION: warn still redirects and records nested_uncertified. Block is the default.
export const NESTED_POLICY = "block" as "block" | "warn";
