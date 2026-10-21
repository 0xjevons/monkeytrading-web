/** Tests for the simulated tape: sequencing, checkpoints, roots, and fills at the published index. */

import { describe, expect, it } from "vitest";

import { CHECKPOINT_EVERY, createTape, tapeWindow, type TapeCommand, type TapeEntry } from "./tape";

/** The first `n` or more entries of a tape. */
const take = (seed: number, n: number, firstSeq = 1): TapeEntry[] => {
  const tape = createTape(seed, firstSeq);
  const out: TapeEntry[] = [];
  while (out.length < n) out.push(...tape.next());
  return out;
};

const commands = (entries: TapeEntry[]): TapeCommand[] =>
  entries.filter((e): e is TapeCommand => e.kind === "command");

describe("createTape", () => {
  it("is deterministic for a seed", () => {
    expect(take(7, 60)).toEqual(take(7, 60));
    expect(take(7, 10)).not.toEqual(take(8, 10));
  });

  it("numbers commands consecutively from the first seq", () => {
    const seqs = commands(take(7, 40, 100)).map((e) => e.seq);
    expect(seqs).toEqual(seqs.map((_, i) => 100 + i));
  });

  it("checkpoints every twelfth command with that command's root", () => {
    const entries = take(7, 60);
    entries.forEach((entry, i) => {
      if (entry.kind !== "checkpoint") return;
      expect(entry.seq % CHECKPOINT_EVERY).toBe(0);
      expect(entries[i - 1]).toMatchObject({ kind: "command", seq: entry.seq, root: entry.root });
    });
    expect(entries.filter((e) => e.kind === "checkpoint").map((e) => e.seq).slice(0, 3)).toEqual([12, 24, 36]);
  });

  it("gives every command a new keccak-256 root", () => {
    const roots = commands(take(7, 50)).map((e) => e.root);
    expect(new Set(roots).size).toBe(roots.length);
    for (const root of roots) expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("fills each order at its market's last published index, and rejects it after no price", () => {
    const last = new Map<string, TapeCommand>();
    let fills = 0;
    let rejections = 0;
    for (const command of commands(take(1871, 3_000))) {
      if (command.type === "PRICES" && command.market !== null) last.set(command.market, command);
      if (command.type !== "ORDER" || command.market === null) continue;
      const prices = last.get(command.market);
      // A market's first command is always its prices, so every order has prices before it.
      expect(prices).toBeDefined();
      expect(command.price).toBe(prices?.price);
      expect(command.refused).toBe(prices?.refused);
      expect(command.result).toBe(
        command.price === null ? "rejected · no price" : `filled @ ${prices?.result.replace("index ", "")}`,
      );
      if (command.refused) rejections += 1;
      else fills += 1;
    }
    // Both outcomes occur, so the assertions above ran on each.
    expect(fills).toBeGreaterThan(100);
    expect(rejections).toBeGreaterThan(0);
  });

  it("publishes no price exactly when the quotes spread past 25 bps", () => {
    const prices = commands(take(1871, 3_000)).filter((c) => c.type === "PRICES");
    for (const command of prices) {
      const apart = /no price · (\d+) bps apart/.exec(command.result);
      expect(command.refused).toBe(apart !== null);
      if (apart) expect(Number(apart[1])).toBeGreaterThan(25);
      else expect(command.price).not.toBeNull();
    }
    expect(prices.some((c) => c.refused)).toBe(true);
  });
});

describe("tapeWindow", () => {
  it("returns the last rows, and the tape carries on from the last of them", () => {
    const tape = createTape(5, 1_000);
    const window = tapeWindow(tape, 13);
    expect(window).toHaveLength(13);
    const lastSeq = window[window.length - 1]?.seq ?? 0;
    const after = tape.next();
    expect(after[0]?.seq).toBe(lastSeq + 1);
  });
});
