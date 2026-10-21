/** Tests for the shell's command interpreter. */

import { describe, expect, it } from "vitest";

import { RULES } from "./content";
import { COMMANDS, MAX_INPUT, recall, runShell, type Line, type Recall } from "./shell";
import { TELEGRAM_URL } from "./site";

/** The lines' text, with links as their labels. */
const text = (lines: Line[]) =>
  lines.map((l) => l.parts.map((p) => (typeof p === "string" ? p : p.label)).join("")).join("\n");

describe("runShell", () => {
  it("lists every command under help", () => {
    const out = text(runShell("help").lines);
    for (const [name] of COMMANDS) expect(out).toContain(name);
  });

  it("links the waitlist from join", () => {
    const links = runShell("join").lines.flatMap((l) => l.parts).filter((p) => typeof p !== "string");
    expect(links).toEqual([{ href: TELEGRAM_URL, label: TELEGRAM_URL.replace("https://", "") }]);
    expect(text(runShell("join").lines)).toBe(`Join the waitlist on Telegram: ${TELEGRAM_URL.replace("https://", "")}`);
  });

  it("moves to a section, and clears, on request", () => {
    expect(runShell("replay").goto).toBe("replay");
    expect(runShell("  TAPE ").goto).toBe("tape");
    expect(runShell("clear")).toEqual({ lines: [], clear: true });
  });

  it("prints nothing for an empty line", () => {
    expect(runShell("   ")).toEqual({ lines: [] });
  });

  it("names an unknown command as typed", () => {
    const out = runShell("Moon --soon").lines;
    expect(out[0]).toEqual({ tone: "alarm", parts: ["command not found: Moon"] });
  });

  it("reads at most the first MAX_INPUT characters of a line", () => {
    const out = runShell("x".repeat(MAX_INPUT + 50)).lines;
    expect(out[0]).toEqual({ tone: "alarm", parts: [`command not found: ${"x".repeat(MAX_INPUT)}`] });
    expect(runShell(`${" ".repeat(MAX_INPUT)}help`)).toEqual({ lines: [] });
  });
});

describe("runShell status", () => {
  it("names each item the way the page's status board does", () => {
    const out = text(runShell("status").lines).split("\n");
    expect(out[0]).toBe("runs locally  Engine core");
    expect(out.some((l) => l.startsWith("in build      MONKEY token"))).toBe(true);
    expect(out[out.length - 1]).toBe("Pre-launch. Nothing holds real funds.");
  });
});

describe("recall", () => {
  const history = ["help", "rules", "status"];
  const typing: Recall = { cursor: null, draft: "", value: "sta" };

  it("steps back through history, saving the typed line, and stops at the oldest entry", () => {
    const first = recall(history, typing, "up");
    expect(first).toEqual({ cursor: 2, draft: "sta", value: "status" });
    const second = first && recall(history, first, "up");
    expect(second).toEqual({ cursor: 1, draft: "sta", value: "rules" });
    const oldest = recall(history, { cursor: 0, draft: "sta", value: "help" }, "up");
    expect(oldest).toEqual({ cursor: 0, draft: "sta", value: "help" });
  });

  it("steps forward, and past the newest entry restores the typed line", () => {
    expect(recall(history, { cursor: 1, draft: "sta", value: "rules" }, "down")).toEqual({
      cursor: 2,
      draft: "sta",
      value: "status",
    });
    expect(recall(history, { cursor: 2, draft: "sta", value: "status" }, "down")).toEqual({
      cursor: null,
      draft: "",
      value: "sta",
    });
  });

  it("leaves the typed line alone on Down, and does nothing without history", () => {
    expect(recall(history, typing, "down")).toBeNull();
    expect(recall([], typing, "up")).toBeNull();
  });
});

describe("runShell commands", () => {
  const rules = RULES.map((r, i) => `${String(i + 1).padStart(2, "0")}  ${r.title}${r.building ? "  (in build)" : ""}`);

  it.each([
    ["index", "price"],
    ["tape", "log"],
    ["replay", "verify"],
    ["join", "waitlist", "telegram"],
    ["code", "github", "source"],
    ["contact", "email"],
    ["clear", "cls"],
    ["banana", "bananas"],
    ["exit", "logout"],
    ["help", "?", "man"],
  ])("answers %s and its aliases the same way", (...names) => {
    const [first, ...aliases] = names;
    for (const alias of aliases) expect(runShell(alias)).toEqual(runShell(first ?? ""));
  });

  it("marks every rule in build, and only those", () => {
    expect(text(runShell("rules").lines)).toBe(rules.join("\n"));
    expect(rules.filter((r) => r.endsWith("(in build)"))).toHaveLength(RULES.filter((r) => r.building).length);
    expect(runShell("rules").lines.map((l) => l.tone)).toEqual(RULES.map((r) => (r.building ? "muted" : "fg")));
  });

  it.each([
    [
      "index",
      "The index is the median of recent quotes from several independent venues.\n" +
        "In the engine's local configuration for BTC-USD, quotes older than 1,000 ms are dropped, at least 2 must be " +
        "fresh, and they may be at most 25 bps apart.\nOtherwise the market has no price, and nothing fills.",
    ],
    ["tape", "→ the public log"],
    ["replay", "→ replay it yourself"],
    ["code", "Apache-2.0, on GitHub: github.com/0xjevons/monkeytrading"],
    ["contact", "Email: william.jevons@proton.me\nX: x.com/0xjevons"],
    ["whoami", "guest. The house takes the other side; the ledger takes no sides."],
    ["ls", "index/  tape/  replay/  rules/  status/"],
    ["jevons", "“Value depends entirely upon utility.”\nW. S. Jevons, The Theory of Political Economy, 1871"],
    [
      "sunspots",
      "Jevons once traced trade cycles to sunspots.\nThis index takes the median of venues instead. The sun is not a venue.",
    ],
    ["sudo rm -rf /", "sudo: the rules are public, not writable."],
    ["rm log", "rm: the log is append-only."],
    ["banana", "Collateral is USDC. Bananas remain unlisted."],
    ["exit", "Positions close. The ledger stays."],
  ])("answers %s", (input, expected) => {
    expect(text(runShell(input).lines)).toBe(expected);
  });
});
