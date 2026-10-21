/** Tests for what the hero's index panel draws: venue rows and the number line's window. */

import { describe, expect, it } from "vitest";

import { freshMedian, freshRange, initialView, linePosition, nextView, sparkline, venueRows } from "./index-view";
import { computeIndex, SIM_RULES, type Quotes, type SimFrame } from "./price-index";

/** A frame at time `now` for three `[mid, ts]` quotes, priced by the simulation's rules. */
function frame(quotes: Quotes, now = 5_000): SimFrame {
  return { tick: now / 250, now, quotes, index: computeIndex(quotes, SIM_RULES, now), history: [] };
}

/** Quotes from Bitstamp, Coinbase, and Kraken at 5,000 ms, Kraken's at `kTs`. */
const q = (b: number, c: number, k: number, kTs = 5_000): Quotes => ({
  coinbase: { mid: c, ts: 5_000 },
  kraken: { mid: k, ts: kTs },
  bitstamp: { mid: b, ts: 5_000 },
});

describe("venueRows", () => {
  it("gives fresh venues their truncated distance from the median, in tenths of a bp", () => {
    // Median 100,000.00; +13.00 is +1.3 bps, and -9.99 is -0.999 bps, truncated to -0.9.
    expect(venueRows(frame(q(10_001_300, 10_000_000, 9_999_001)))).toEqual([
      { venue: "coinbase", fresh: true, offsetTenthBps: 0, apart: false },
      { venue: "kraken", fresh: true, offsetTenthBps: -9, apart: false },
      { venue: "bitstamp", fresh: true, offsetTenthBps: 13, apart: false },
    ]);
  });

  it("measures from the median of the fresh quotes and leaves a stale venue without a distance", () => {
    // Kraken is 1,001 ms old; the median of the other two is their midpoint, 100,005.00.
    expect(venueRows(frame(q(10_001_000, 10_000_000, 1, 3_999)))).toEqual([
      { venue: "coinbase", fresh: true, offsetTenthBps: -4, apart: false },
      { venue: "kraken", fresh: false, offsetTenthBps: null, apart: false },
      { venue: "bitstamp", fresh: true, offsetTenthBps: 4, apart: false },
    ]);
  });

  it("marks venues apart only while the market has no price", () => {
    // 42 bps apart: no price, and Coinbase is 41.9 bps from the median, past half the 25 bps limit.
    const divergent = frame(q(10_000_000, 10_042_000, 10_000_100));
    expect(divergent.index.status).toBe("divergent");
    expect(venueRows(divergent).map((r) => r.apart)).toEqual([true, false, false]);
    // 20 bps apart is within the limit, so nothing is apart even though Coinbase is far out.
    const priced = frame(q(10_000_000, 10_020_000, 10_000_100));
    expect(priced.index.status).toBe("price");
    expect(venueRows(priced).map((r) => r.apart)).toEqual([false, false, false]);
  });
});

describe("freshRange and freshMedian", () => {
  it("cover only fresh quotes, and fall back to every venue's median when none is fresh", () => {
    const fresh = frame(q(10_000_500, 10_000_000, 1, 3_000));
    expect(freshRange(fresh)).toEqual({ low: 10_000_000, high: 10_000_500 });
    expect(freshMedian(fresh)).toBe(10_000_250);
    const none = frame(q(10_000_500, 10_000_000, 9_000_000), 9_000);
    expect(freshRange(none)).toBeNull();
    expect(freshMedian(none)).toBe(10_000_000);
  });
});

describe("the number line", () => {
  const view = { anchor: 10_000_000, halfBps: 10 };

  it("places quotes by their distance from the anchor and keeps them 2% inside the ends", () => {
    expect(linePosition(view, 10_000_000)).toBe(50);
    expect(linePosition(view, 10_005_000)).toBe(75);
    expect(linePosition(view, 9_995_000)).toBe(25);
    expect(linePosition(view, 10_100_000)).toBe(98);
    expect(linePosition(view, 9_900_000)).toBe(2);
  });

  it("eases toward the median and toward a zoom that fits the widest quote", () => {
    const wide = frame(q(10_000_000, 10_042_000, 10_000_100));
    const next = nextView(view, wide);
    // The median is 100,001.00: the anchor moves 30% of the 100.00 gap.
    expect(next.anchor).toBe(10_000_030);
    // Coinbase sits about 41.97 bps out, so the zoom heads for 58.8 bps; 35% of the way from 10 is about 27.
    expect(next.halfBps).toBeCloseTo(27.07, 1);
  });

  it("starts centred on the median at the narrowest zoom plus two", () => {
    expect(initialView(frame(q(10_000_000, 10_000_200, 10_000_100)))).toEqual({ anchor: 10_000_100, halfBps: 8 });
  });
});

describe("sparkline", () => {
  it("right-aligns the history, splits it at each run with no price, and spans the price range", () => {
    const drawn = sparkline([10_000_000, 10_001_000, null, null, 10_000_500], 8, 40);
    // Five values in eight slots start at slot 3; the range is 10.00 with 5.00 of headroom each side.
    expect(drawn).toEqual({
      segments: [
        { start: 3, points: "3,30.00 4,10.00" },
        { start: 7, points: "7,20.00" },
      ],
      gaps: [[5, 6]],
    });
  });

  it("draws nothing but a gap when no tick had a price", () => {
    expect(sparkline([null, null], 4, 40)).toEqual({ segments: [], gaps: [[2, 3]] });
  });
});
