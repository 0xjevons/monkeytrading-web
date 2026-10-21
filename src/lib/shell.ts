/** The shell's command interpreter: a typed reading of one input line, with nothing executed. */

import { RULES, STATUS, STATUS_LABELS } from "./content";
import { groupThousands } from "./format";
import { SIM_RULES } from "./price-index";
import { EMAIL, GITHUB_URL, TELEGRAM_URL, X_URL } from "./site";

export type Segment = string | { href: string; label: string };
export type Tone = "fg" | "muted" | "glow" | "alarm";

export interface Line {
  tone: Tone;
  parts: Segment[];
}

export interface ShellResult {
  lines: Line[];
  /** Clear the screen before printing. */
  clear?: boolean;
  /** The page section to move to. */
  goto?: "tape" | "replay";
}

/** The longest line the shell reads; the rest of a longer one is ignored. */
export const MAX_INPUT = 120;

/** One output line in `tone`. */
const line = (tone: Tone, ...parts: Segment[]): Line => ({ tone, parts });

/** A link to one of the site's own constants, labelled without its scheme by default. */
const link = (href: string, label = href.replace(/^(https?:\/\/|mailto:)/, "")): Segment => ({ href, label });

export const COMMANDS: readonly [string, string][] = [
  ["help", "list commands"],
  ["index", "how the price is set"],
  ["rules", "the house rules"],
  ["tape", "go to the public log"],
  ["replay", "go to the replay demo"],
  ["status", "what runs today"],
  ["join", "the waitlist"],
  ["code", "the source"],
  ["contact", "email and X"],
  ["clear", "clear the screen"],
];

/** Interprets one line typed at the prompt. Pure: the caller prints, clears, and scrolls. */
export function runShell(input: string): ShellResult {
  const trimmed = input.slice(0, MAX_INPUT).trim();
  const [name = ""] = trimmed.toLowerCase().split(/\s+/);
  switch (name) {
    case "":
      return { lines: [] };
    case "help":
    case "?":
    case "man":
      return {
        lines: [
          ...COMMANDS.map(([cmd, what]) => line("fg", `${cmd.padEnd(9)}${what}`)),
          line("muted", "Some commands are not listed."),
        ],
      };
    case "index":
    case "price":
      return {
        lines: [
          line("fg", "The index is the median of recent quotes from several independent venues."),
          line(
            "muted",
            `In the engine's local configuration for BTC-USD, quotes older than ${groupThousands(SIM_RULES.maxAgeMs)} ms are ` +
              `dropped, at least ${SIM_RULES.minSources} must be fresh, and they may be at most ${SIM_RULES.maxDivergenceBps} bps apart.`,
          ),
          line("muted", "Otherwise the market has no price, and nothing fills."),
        ],
      };
    case "rules":
      return {
        lines: RULES.map((r, i) =>
          line(r.building ? "muted" : "fg", `${String(i + 1).padStart(2, "0")}  ${r.title}${r.building ? "  (in build)" : ""}`),
        ),
      };
    case "tape":
    case "log":
      return { lines: [line("muted", "→ the public log")], goto: "tape" };
    case "replay":
    case "verify":
      return { lines: [line("muted", "→ replay it yourself")], goto: "replay" };
    case "status":
      return {
        lines: [
          ...STATUS.map((s) =>
            line(s.state === "running" ? "glow" : "muted", `${STATUS_LABELS[s.state].toLowerCase().padEnd(14)}${s.name}`),
          ),
          line("fg", "Pre-launch. Nothing holds real funds."),
        ],
      };
    case "join":
    case "waitlist":
    case "telegram":
      return { lines: [line("fg", "Join the waitlist on Telegram: ", link(TELEGRAM_URL))] };
    case "code":
    case "github":
    case "source":
      return { lines: [line("fg", "Apache-2.0, on GitHub: ", link(GITHUB_URL))] };
    case "contact":
    case "email":
      return {
        lines: [line("fg", "Email: ", link(`mailto:${EMAIL}`, EMAIL)), line("fg", "X: ", link(X_URL))],
      };
    case "clear":
    case "cls":
      return { lines: [], clear: true };
    case "whoami":
      return { lines: [line("fg", "guest. The house takes the other side; the ledger takes no sides.")] };
    case "ls":
      return { lines: [line("fg", "index/  tape/  replay/  rules/  status/")] };
    case "jevons":
      return {
        lines: [
          line("glow", "“Value depends entirely upon utility.”"),
          line("muted", "W. S. Jevons, The Theory of Political Economy, 1871"),
        ],
      };
    case "sunspots":
      return {
        lines: [
          line("fg", "Jevons once traced trade cycles to sunspots."),
          line("muted", "This index takes the median of venues instead. The sun is not a venue."),
        ],
      };
    case "sudo":
      return { lines: [line("alarm", "sudo: the rules are public, not writable.")] };
    case "rm":
      return { lines: [line("alarm", "rm: the log is append-only.")] };
    case "banana":
    case "bananas":
      return { lines: [line("fg", "Collateral is USDC. Bananas remain unlisted.")] };
    case "exit":
    case "logout":
      return { lines: [line("muted", "Positions close. The ledger stays.")] };
    default:
      return { lines: [line("alarm", `command not found: ${trimmed.split(/\s+/)[0]}`), line("muted", "Type help.")] };
  }
}

/** Where the visitor is in their earlier lines, and the line they were typing before they left it. */
export interface Recall {
  /** The history entry shown, or `null` while the visitor edits their own line. */
  cursor: number | null;
  /** The line the visitor was typing when Up first left it. */
  draft: string;
  /** What the input shows. */
  value: string;
}

/**
 * The input after Up or Down, as a readline shell does it: Up steps back through `history`, saving
 * the typed line on the first step; Down steps forward and, past the newest entry, restores that
 * line. Returns `null` when the key changes nothing, so the input keeps its default behaviour.
 */
export function recall(history: readonly string[], current: Recall, key: "up" | "down"): Recall | null {
  if (history.length === 0) return null;
  if (key === "up") {
    const cursor = current.cursor === null ? history.length - 1 : Math.max(0, current.cursor - 1);
    const draft = current.cursor === null ? current.value : current.draft;
    return { cursor, draft, value: history[cursor] ?? "" };
  }
  if (current.cursor === null) return null;
  const cursor = current.cursor + 1;
  if (cursor >= history.length) return { cursor: null, draft: "", value: current.draft };
  return { cursor, draft: current.draft, value: history[cursor] ?? "" };
}
