/** Tests for the engine's index rule and the hero's seeded market. */

import { describe, expect, it } from "vitest";

import { computeIndex, createIndexSim, median, type PriceRules, type Quotes, type SimFrame } from "./price-index";

const RULES: PriceRules = { maxAgeMs: 1000, maxDivergenceBps: 25, minSources: 2 };

/** Three venue quotes as `[mid, ts]` pairs. */
function quotes(binance: [number, number], coinbase: [number, number], kraken: [number, number]): Quotes {
  return {
    binance: { mid: binance[0], ts: binance[1] },
    coinbase: { mid: coinbase[0], ts: coinbase[1] },
    kraken: { mid: kraken[0], ts: kraken[1] },
  };
}

describe("median", () => {
  it("takes the middle of an odd count and the truncated midpoint of an even one, in any order", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 13])).toBe(11);
    expect(median([-13, -10])).toBe(-11);
    expect(median([7])).toBe(7);
  });

  it("throws on no values", () => {
    expect(() => median([])).toThrow("median: no values");
  });
});

describe("computeIndex", () => {
  it("takes the median of three fresh quotes", () => {
    const index = computeIndex(quotes([10_000_900, 5_000], [10_000_000, 5_000], [10_001_500, 5_000]), RULES, 5_000);
    expect(index).toEqual({ status: "price", mid: 10_000_900, used: ["binance", "coinbase", "kraken"], divergenceBps: 1 });
  });

  it("drops a stale quote and takes the midpoint of the other two, truncated", () => {
    const index = computeIndex(quotes([10_000_001, 5_000], [10_000_000, 5_000], [9_000_000, 3_999]), RULES, 5_000);
    expect(index).toEqual({ status: "price", mid: 10_000_000, used: ["binance", "coinbase"], divergenceBps: 0 });
  });

  it("counts a quote exactly max-age old as fresh, and one a millisecond older as stale", () => {
    expect(computeIndex(quotes([100, 4_000], [100, 5_000], [100, 5_000]), RULES, 5_000).used).toHaveLength(3);
    expect(computeIndex(quotes([100, 3_999], [100, 5_000], [100, 5_000]), RULES, 5_000).used).toHaveLength(2);
  });

  it("ignores a quote stamped after now", () => {
    expect(computeIndex(quotes([100, 5_001], [100, 5_000], [100, 5_000]), RULES, 5_000).used).toEqual([
      "coinbase",
      "kraken",
    ]);
  });

  it("has no price with fewer fresh quotes than the minimum", () => {
    expect(computeIndex(quotes([100, 5_000], [100, 0], [100, 0]), RULES, 5_000)).toEqual({
      status: "stale",
      used: ["binance"],
      needed: 2,
    });
  });

  it("has a price at the divergence limit and none past it", () => {
    // Around a 10,000.00 median, 25 bps is 25.00 from the lowest quote to the highest.
    const at = computeIndex(quotes([1_000_000, 0], [1_000_500, 0], [998_000, 0]), RULES, 0);
    expect(at).toEqual({ status: "price", mid: 1_000_000, used: ["binance", "coinbase", "kraken"], divergenceBps: 25 });
    const past = computeIndex(quotes([1_000_000, 0], [1_000_600, 0], [998_000, 0]), RULES, 0);
    expect(past).toEqual({ status: "divergent", used: ["binance", "coinbase", "kraken"], divergenceBps: 26 });
  });
});

describe("createIndexSim", () => {
  const run = (seed: number, ticks: number): SimFrame[] => {
    const sim = createIndexSim(seed);
    return [sim.initial, ...Array.from({ length: ticks }, () => sim.step())];
  };

  it("is deterministic for a seed", () => {
    expect(run(1871, 200)).toEqual(run(1871, 200));
    expect(run(1871, 50)).not.toEqual(run(1872, 50));
  });

  it("shows a stale venue, then a divergence, within the first twenty seconds", () => {
    const frames = run(1871, 80);
    const staleAt = frames.findIndex((f) => f.index.status === "price" && f.index.used.length === 2);
    const divergentAt = frames.findIndex((f) => f.index.status === "divergent");
    expect(staleAt).toBeGreaterThan(0);
    expect(divergentAt).toBeGreaterThan(staleAt);
    expect(divergentAt * 250).toBeLessThan(20_000);
  });

  it("keeps a bounded history with a gap wherever there was no price", () => {
    const frames = run(1871, 300);
    expect(frames[frames.length - 1]?.history).toHaveLength(96);
    for (const frame of frames) {
      expect(frame.history[frame.history.length - 1]).toBe(frame.index.status === "price" ? frame.index.mid : null);
    }
  });
});
