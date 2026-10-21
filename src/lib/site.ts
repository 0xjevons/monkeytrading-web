/** Links, contact, and identity for the site, and the canonical origin from the build environment. */

/**
 * The waitlist: every "join" link on the site points here. It is the owner's Telegram link until the
 * waitlist channel exists, when it becomes that channel's t.me URL.
 */
export const TELEGRAM_URL = "https://t.me/jevons_0x";

export const GITHUB_URL = "https://github.com/0xjevons/monkeytrading";
export const X_URL = "https://x.com/0xjevons";
export const EMAIL = "william.jevons@proton.me";

export const SITE_NAME = "monkeytrading";
export const SITE_TITLE = "monkeytrading — the house is open source, the ledger is public";
export const SITE_DESCRIPTION =
  "An open-source engine for trading CFDs against a house whose rules are public code. It runs in a " +
  "confidential-computing enclave and publishes every command, so anyone can replay the record. Pre-launch.";

/**
 * The canonical origin for metadata, the sitemap, and robots: `SITE_URL` when set, else the Vercel
 * project's production domain, else local development. Read on the server only.
 * Error cases:
 * - `SITE_URL`, or the Vercel domain, is not a bare http(s) origin, so a bad value fails the build
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return origin(explicit, "SITE_URL");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return origin(`https://${vercel}`, "VERCEL_PROJECT_PRODUCTION_URL");
  return "http://localhost:3000";
}

/**
 * `value` as an origin with no trailing slash, such as `https://example.com`.
 * Error cases:
 * - not a URL, not http or https, or carrying credentials, a path, a query, or a fragment
 */
function origin(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new Error(`${name} is not a URL: ${value}`, { cause });
  }
  const bare = url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !bare || value.includes("?") || value.includes("#")) {
    throw new Error(`${name} must be a bare http(s) origin, such as https://example.com: ${value}`);
  }
  return url.origin;
}
