/** Tests for the replay demo's state machine: each command, positions, and how commands are rendered. */

import { describe, expect, it } from "vitest";

import { applyCommand, canonicalJson, describeCommand, emptyState, type Applied, type Command, type DemoState } from "./replay";

/** Applies `command` at `seq` and returns the accepted result, failing the test on a refusal. */
function accept(state: DemoState, seq: number, command: Command): Extract<Applied, { ok: true }> {
  const applied = applyCommand(state, seq, command);
  if (!applied.ok) throw new Error(`seq ${seq} refused: ${applied.error}`);
  return applied;
}

describe("applyCommand", () => {
  const listed = accept(emptyState(), 1, {
    type: "list_market",
    market: "BTC-USD",
    max_divergence_bps: 25,
    min_sources: 2,
  }).state;
  const funded = accept(listed, 2, { type: "deposit", account: "0xa", amount: 1_000_000 }).state;
  const priced = accept(funded, 3, {
    type: "prices",
    market: "BTC-USD",
    quotes: { bitstamp: 10_000_000, coinbase: 10_000_500, kraken: 9_999_000 },
  }).state;

  it("fills a market order at the median, with no spread", () => {
    const { state, event } = accept(priced, 4, {
      type: "order",
      account: "0xa",
      market: "BTC-USD",
      side: "buy",
      qty: 100,
    });
    expect(event).toBe("filled 0.100 @ 100,000.00");
    expect(state.accounts["0xa"]?.positions["BTC-USD"]).toEqual({ qty: 100, entry: 10_000_000 });
    expect(state.accounts["0xa"]?.balance).toBe(1_000_000);
  });

  it("realises profit and loss when a position closes", () => {
    const bought = accept(priced, 4, { type: "order", account: "0xa", market: "BTC-USD", side: "buy", qty: 100 });
    const higher = accept(bought.state, 5, {
      type: "prices",
      market: "BTC-USD",
      quotes: { bitstamp: 10_010_000, coinbase: 10_010_000, kraken: 10_010_000 },
    });
    const sold = accept(higher.state, 6, {
      type: "order",
      account: "0xa",
      market: "BTC-USD",
      side: "sell",
      qty: 100,
    });
    // 0.100 × (100,100.00 − 100,000.00) = 10.00
    expect(sold.event).toBe("filled 0.100 @ 100,100.00, realised +10.00");
    expect(sold.state.accounts["0xa"]?.balance).toBe(1_001_000);
    expect(sold.state.accounts["0xa"]?.positions).toEqual({});
  });

  it("has a price at the divergence limit, and none past it, where orders are rejected", () => {
    const apart = accept(funded, 3, {
      type: "prices",
      market: "BTC-USD",
      quotes: { bitstamp: 10_000_000, coinbase: 10_026_000, kraken: 10_000_100 },
    });
    // 260.00 apart is 25.99 bps of the median, which truncates to 25: at the limit, so still a price.
    expect(apart.event).toBe("index 100,001.00");
    expect(apart.state.markets["BTC-USD"]?.index).toBe(10_000_100);
    const wider = accept(funded, 3, {
      type: "prices",
      market: "BTC-USD",
      quotes: { bitstamp: 10_000_000, coinbase: 10_030_000, kraken: 10_000_100 },
    });
    expect(wider.event).toBe("no price: quotes 29 bps apart");
    expect(wider.state.markets["BTC-USD"]?.index).toBeNull();
    const order = accept(wider.state, 4, {
      type: "order",
      account: "0xa",
      market: "BTC-USD",
      side: "buy",
      qty: 100,
    });
    expect(order.event).toBe("rejected: no price");
    expect(order.state.accounts["0xa"]?.positions).toEqual({});
  });

  it("has no price with fewer quotes than the market's minimum", () => {
    const strict = accept(emptyState(), 1, {
      type: "list_market",
      market: "BTC-USD",
      max_divergence_bps: 25,
      min_sources: 4,
    });
    const prices = accept(strict.state, 2, {
      type: "prices",
      market: "BTC-USD",
      quotes: { coinbase: 10_000_000, kraken: 10_000_000, bitstamp: 10_000_000 },
    });
    expect(prices.event).toBe("no price: 3 of 4 quotes");
    expect(prices.state.markets["BTC-USD"]?.index).toBeNull();
  });

  it("does not modify the state it is given", () => {
    const before = canonicalJson(priced);
    accept(priced, 4, { type: "deposit", account: "0xa", amount: 5 });
    expect(canonicalJson(priced)).toBe(before);
  });

  it("refuses invalid commands with the reason, and changes nothing", () => {
    const cases: [DemoState, number, Command, string][] = [
      [
        listed,
        2,
        { type: "list_market", market: "ETH-USD", max_divergence_bps: 25, min_sources: 0 },
        "min_sources must be a positive integer",
      ],
      [
        listed,
        2,
        { type: "list_market", market: "ETH-USD", max_divergence_bps: 1.5, min_sources: 2 },
        "max_divergence_bps must be a positive integer",
      ],
      [listed, 2, { type: "deposit", account: "0xa", amount: 0 }, "amount must be a positive integer"],
      [listed, 2, { type: "deposit", account: "0xa", amount: 1.5 }, "amount must be a positive integer"],
      [listed, 3, { type: "deposit", account: "0xa", amount: 5 }, "seq 3 out of sequence: expected 2"],
      [listed, 2, { type: "list_market", market: "BTC-USD", max_divergence_bps: 25, min_sources: 2 }, "BTC-USD is already listed"],
      [listed, 2, { type: "order", account: "0xa", market: "ETH-USD", side: "buy", qty: 1 }, "ETH-USD is not listed"],
      [listed, 2, { type: "order", account: "0xb", market: "BTC-USD", side: "buy", qty: 1 }, "0xb has no balance"],
      [funded, 3, { type: "order", account: "0xa", market: "BTC-USD", side: "sell", qty: -5 }, "qty must be a positive integer"],
      [
        funded,
        3,
        { type: "prices", market: "BTC-USD", quotes: { bitstamp: 1, coinbase: 0, kraken: 1 } },
        "coinbase quote must be a positive integer",
      ],
    ];
    for (const [state, seq, command, error] of cases) {
      const before = canonicalJson(state);
      expect(applyCommand(state, seq, command)).toEqual({ ok: false, error });
      expect(canonicalJson(state)).toBe(before);
    }
  });
});

describe("positions", () => {
  const listed = accept(emptyState(), 1, {
    type: "list_market",
    market: "BTC-USD",
    max_divergence_bps: 25,
    min_sources: 2,
  }).state;
  const funded = accept(listed, 2, { type: "deposit", account: "0xa", amount: 1_000_000 }).state;
  /** Prices with every venue at `cents`, so the index is `cents`. */
  const flat = (cents: number): Command => ({
    type: "prices",
    market: "BTC-USD",
    quotes: { coinbase: cents, kraken: cents, bitstamp: cents },
  });
  const order = (side: "buy" | "sell", qty: number): Command => ({
    type: "order",
    account: "0xa",
    market: "BTC-USD",
    side,
    qty,
  });
  // A 0.100 long from 100,000.00, with the index then at 100,100.00.
  const long = accept(accept(funded, 3, flat(10_000_000)).state, 4, order("buy", 100)).state;
  const moved = accept(long, 5, flat(10_010_000)).state;

  it("adds to a position at the size-weighted entry, truncated", () => {
    const added = accept(moved, 6, order("buy", 50));
    // (0.100 × 100,000.00 + 0.050 × 100,100.00) / 0.150 = 100,033.333…, truncated to 100,033.33.
    expect(added.event).toBe("filled 0.050 @ 100,100.00");
    expect(added.state.accounts["0xa"]).toEqual({
      balance: 1_000_000,
      positions: { "BTC-USD": { qty: 150, entry: 10_003_333 } },
    });
  });

  it("realises only the part a partial close closes", () => {
    const closed = accept(moved, 6, order("sell", 40));
    // 0.040 × 100.00 = 4.00, and the remaining 0.060 keeps its entry.
    expect(closed.event).toBe("filled 0.040 @ 100,100.00, realised +4.00");
    expect(closed.state.accounts["0xa"]).toEqual({
      balance: 1_000_400,
      positions: { "BTC-USD": { qty: 60, entry: 10_000_000 } },
    });
  });

  it("closes the position and opens the rest the other way at the fill when an order flips it", () => {
    const flipped = accept(moved, 6, order("sell", 150));
    expect(flipped.event).toBe("filled 0.150 @ 100,100.00, realised +10.00");
    expect(flipped.state.accounts["0xa"]).toEqual({
      balance: 1_001_000,
      positions: { "BTC-USD": { qty: -50, entry: 10_010_000 } },
    });
    // Covering that 0.050 short at 100,200.00 loses 0.050 × 100.00 = 5.00.
    const higher = accept(flipped.state, 7, flat(10_020_000)).state;
    const covered = accept(higher, 8, order("buy", 50));
    expect(covered.event).toBe("filled 0.050 @ 100,200.00, realised -5.00");
    expect(covered.state.accounts["0xa"]).toEqual({ balance: 1_000_500, positions: {} });
  });
});

describe("describeCommand", () => {
  it("renders each kind of command on one line", () => {
    expect(
      describeCommand({ type: "list_market", market: "BTC-USD", max_divergence_bps: 25, min_sources: 2 }),
    ).toBe("list BTC-USD, quotes at most 25 bps apart, min 2");
    expect(describeCommand({ type: "deposit", account: "0x00a1", amount: 5_000_000 })).toBe(
      "deposit 50,000.00 USDC to 0x00a1",
    );
    expect(
      describeCommand({
        type: "prices",
        market: "BTC-USD",
        quotes: { coinbase: 10_001_890, kraken: 10_000_970, bitstamp: 10_001_240 },
      }),
    ).toBe("prices BTC-USD: coinbase 100,018.90, kraken 100,009.70, bitstamp 100,012.40");
    expect(describeCommand({ type: "order", account: "0x00a1", market: "BTC-USD", side: "sell", qty: 250 })).toBe(
      "order 0x00a1 sell 0.250 BTC-USD",
    );
  });
});
