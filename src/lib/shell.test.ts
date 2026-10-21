import { describe, expect, it } from "vitest";

import { COMMANDS, runShell, type Line } from "./shell";
import { TELEGRAM_URL } from "./site";

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
});
