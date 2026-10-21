import { describe, expect, it } from "vitest";

import { applyCommand, canonicalJson, emptyState, replay, stateRoot, type LogEntry } from "./replay";
import { DEMO_LOG, TAMPERS, tamperLog } from "./replay-log";

const ROOT = /^0x[0-9a-f]{64}$/;

describe("replay", () => {
  it("reproduces every published root of the demo log", () => {
    const result = replay(DEMO_LOG);
    expect(result.ok).toBe(true);
    expect(result.steps.map((s) => s.seq)).toEqual(DEMO_LOG.map((e) => e.seq));
    expect(result.steps.every((s) => s.matches && s.root === s.published)).toBe(true);
  });

  it.each(TAMPERS.map((t) => [t.label, t] as const))("pins %s to the seq it edits", (_, tamper) => {
    const result = replay(tamperLog(DEMO_LOG, tamper));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.divergedAt).toBe(tamper.seq);
    // It stops at the first mismatch, after every earlier root matched.
    expect(result.steps).toHaveLength(tamper.seq);
    expect(result.steps.slice(0, -1).every((s) => s.matches)).toBe(true);
    const last = result.steps[result.steps.length - 1]!;
    expect(last.matches).toBe(false);
    expect(result.message).toBe(
      `state root mismatch at seq ${tamper.seq}: log says ${last.published}, replay gives ${last.root}`,
    );
  });

  it("detects an edited published root as well as an edited command", () => {
    const log: LogEntry[] = DEMO_LOG.map((e) => (e.seq === 5 ? { ...e, root: `0x${"ab".repeat(32)}` } : e));
    const result = replay(log);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.divergedAt).toBe(5);
  });

  it("refuses a command out of sequence", () => {
    const log = DEMO_LOG.filter((e) => e.seq !== 4);
    const result = replay(log);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.divergedAt).toBe(5);
    expect(result.message).toBe("applying seq 5: seq 5 out of sequence: expected 4");
  });

  it("leaves the published log untouched when tampering", () => {
    const before = JSON.stringify(DEMO_LOG);
    tamperLog(DEMO_LOG, TAMPERS[0]!);
    expect(JSON.stringify(DEMO_LOG)).toBe(before);
  });
});

describe("applyCommand", () => {
  const listed = applyCommand(emptyState(), 1, {
    type: "list_market",
    market: "BTC-USD",
    max_divergence_bps: 25,
    min_sources: 2,
  }).state;
  const funded = applyCommand(listed, 2, { type: "deposit", account: "0xa", amount: 1_000_000 }).state;
  const priced = applyCommand(funded, 3, {
    type: "prices",
    market: "BTC-USD",
    quotes: { binance: 10_000_000, coinbase: 10_000_500, kraken: 9_999_000 },
  }).state;

  it("fills a market order at the median, with no spread", () => {
    const { state, event } = applyCommand(priced, 4, {
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
    const bought = applyCommand(priced, 4, { type: "order", account: "0xa", market: "BTC-USD", side: "buy", qty: 100 });
    const higher = applyCommand(bought.state, 5, {
      type: "prices",
      market: "BTC-USD",
      quotes: { binance: 10_010_000, coinbase: 10_010_000, kraken: 10_010_000 },
    });
    const sold = applyCommand(higher.state, 6, {
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

  it("has a price at the spread limit, and none past it, where orders are rejected", () => {
    const apart = applyCommand(funded, 3, {
      type: "prices",
      market: "BTC-USD",
      quotes: { binance: 10_000_000, coinbase: 10_026_000, kraken: 10_000_100 },
    });
    // 260.00 apart is 25.99 bps of the median, which truncates to 25: at the limit, so still a price.
    expect(apart.event).toBe("index 100,001.00");
    expect(apart.state.markets["BTC-USD"]?.index).toBe(10_000_100);
    const wider = applyCommand(funded, 3, {
      type: "prices",
      market: "BTC-USD",
      quotes: { binance: 10_000_000, coinbase: 10_030_000, kraken: 10_000_100 },
    });
    expect(wider.event).toBe("no price: quotes 29 bps apart");
    expect(wider.state.markets["BTC-USD"]?.index).toBeNull();
    const order = applyCommand(wider.state, 4, {
      type: "order",
      account: "0xa",
      market: "BTC-USD",
      side: "buy",
      qty: 100,
    });
    expect(order.event).toBe("rejected: no price");
    expect(order.state.accounts["0xa"]?.positions).toEqual({});
  });

  it("does not modify the state it is given", () => {
    const before = canonicalJson(priced);
    applyCommand(priced, 4, { type: "deposit", account: "0xa", amount: 5 });
    expect(canonicalJson(priced)).toBe(before);
  });

  it("refuses non-integer and non-positive amounts", () => {
    expect(() => applyCommand(listed, 2, { type: "deposit", account: "0xa", amount: 0 })).toThrow("amount");
    expect(() => applyCommand(listed, 2, { type: "deposit", account: "0xa", amount: 1.5 })).toThrow("amount");
  });
});

describe("state roots", () => {
  it("encodes keys in sorted order at every level", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { f: 1, e: null }], c: "x" } })).toBe(
      '{"a":{"c":"x","d":[2,{"e":null,"f":1}]},"b":1}',
    );
  });

  it("does not depend on the order fields were set in", () => {
    const one = { last_seq: 1, markets: {}, accounts: { a: { balance: 1, positions: {} } } };
    const two = { accounts: { a: { positions: {}, balance: 1 } }, markets: {}, last_seq: 1 };
    expect(stateRoot(one)).toBe(stateRoot(two));
  });

  it("is keccak-256 of the canonical encoding", () => {
    // keccak-256 (not SHA3-256) of '{"accounts":{},"last_seq":null,"markets":{}}', computed with an independent tool.
    expect(stateRoot(emptyState())).toMatch(ROOT);
    expect(stateRoot(emptyState())).toBe("0x81f74f13951f9ad2a0a9e40a3f2cdb1485f8b9971764e35f01232cda12d1a8e5");
  });
});
