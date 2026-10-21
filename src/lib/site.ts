/**
 * The waitlist: a Telegram channel. Every "join" link on the site points here; replace it with the
 * channel's t.me URL once the channel exists.
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
 * The canonical origin for metadata, the sitemap, and robots. `SITE_URL` wins when set; on Vercel the
 * project's production domain is used; otherwise local development. Read on the server only.
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
