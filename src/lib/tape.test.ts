/** Tests for the simulated tape: sequencing, checkpoints, roots, and fills at the published index. */

import { describe, expect, it } from "vitest";

import { bpsOf, median } from "./price-index";
import {
  chainRoot,
  CHECKPOINT_EVERY,
  createTape,
  GENESIS_ROOT,
  TAPE_MARKETS,
  tapeWindow,
  type TapeCommand,
  type TapeEntry,
} from "./tape";

/** The first `n` or more entries of a tape. */
const take = (seed: number, n: number, firstSeq = 1): TapeEntry[] => {
  const tape = createTape(seed, firstSeq);
  const out: TapeEntry[] = [];
  while (out.length < n) out.push(...tape.next());
  return out;
};

const commands = (entries: TapeEntry[]): TapeCommand[] =>
  entries.filter((e): e is TapeCommand => e.kind === "command");

/**
 * The quotes a PRICES command published.
 * Error cases:
 * - the command carries no list of numeric quotes
 */
function quotesOf(command: TapeCommand): number[] {
  const prices = command.command.prices;
  const quotes = typeof prices === "object" && prices !== null && "quotes" in prices ? prices.quotes : undefined;
  if (!Array.isArray(quotes) || !quotes.every((q): q is number => typeof q === "number")) {
    throw new Error(`seq ${command.seq} has no quotes`);
  }
  return quotes;
}

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

  it("chains each command's root from the root before it, starting at the genesis root", () => {
    let previous = GENESIS_ROOT;
    for (const command of commands(take(7, 50))) {
      expect(command.root).toBe(chainRoot(previous, { seq: command.seq, ...command.command }));
      previous = command.root;
    }
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

  it("credits deposits in USDC, outside any market", () => {
    const deposits = commands(take(1871, 500)).filter((c) => c.type === "DEPOSIT");
    expect(deposits.length).toBeGreaterThan(0);
    for (const deposit of deposits) {
      expect(deposit).toMatchObject({ market: null, price: null, refused: false, result: "credited" });
      expect(deposit.detail).toMatch(/^0x[0-9a-f]{4} [\d,]+\.\d{2} USDC$/);
    }
  });

  it("publishes the median of its quotes as the index, and no price exactly when they are further apart than the market allows", () => {
    const limits = new Map(TAPE_MARKETS.map((m) => [m.symbol, m.maxDivergenceBps]));
    const prices = commands(take(1871, 3_000)).filter((c) => c.type === "PRICES");
    let refused = 0;
    for (const command of prices) {
      const quotes = quotesOf(command);
      const index = median(quotes);
      const apart = bpsOf(Math.max(...quotes) - Math.min(...quotes), index);
      const over = apart > (limits.get(command.market ?? "") ?? Number.NaN);
      expect(command.refused).toBe(over);
      expect(command.price).toBe(over ? null : index);
      if (over) refused += 1;
    }
    // Both outcomes occur, so each assertion ran on each.
    expect(refused).toBeGreaterThan(0);
    expect(refused).toBeLessThan(prices.length);
  });
});

describe("chainRoot", () => {
  const deposit = { seq: 1, deposit: { account: "0x0001", amount: 25_000 } };

  it("is keccak-256 of the previous root's bytes followed by the command's canonical JSON", () => {
    // Computed with an independent tool over 32 zero bytes, then '{"deposit":{"account":"0x0001","amount":25000},"seq":1}'.
    expect(chainRoot(GENESIS_ROOT, deposit)).toBe("0xf5ba207683a149e0276730908ab257149efaa1b8dce2cc8a4997891c948df407");
  });

  it("depends on the previous root", () => {
    // The same command after a root of 32 0x11 bytes, also computed independently.
    expect(chainRoot(`0x${"11".repeat(32)}`, deposit)).toBe(
      "0xa8d0bcbdc1ee35758d229d255f907479ef339cfcc6ad4270589d90eac33ab9e4",
    );
  });
});

describe("tapeWindow", () => {
  it("drops the oldest entries past `rows`, and the tape carries on from the last kept", () => {
    // Twelve commands from seq 1 add a checkpoint at seq 12: thirteen entries for twelve rows.
    const tape = createTape(5, 1);
    const window = tapeWindow(tape, 12);
    expect(window).toHaveLength(12);
    expect(window[0]).toMatchObject({ kind: "command", seq: 2 });
    expect(window[11]).toMatchObject({ kind: "checkpoint", seq: 12 });
    expect(tape.next()[0]?.seq).toBe(13);
  });
});
