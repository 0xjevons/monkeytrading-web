/**
 * The simulated public tape: a deterministic stream of sequenced commands, each folded into a
 * running keccak-256 root (`root = keccak(previous root ‖ command)`), with a checkpoint every
 * `CHECKPOINT_EVERY` commands. The chaining is an illustration; the engine hashes its whole state.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

import { formatFixed } from "./format";
import { bpsOf, median } from "./price-index";
import { mulberry32, randInt } from "./prng";
import { canonicalJson } from "./replay";

export interface TapeMarket {
  symbol: string;
  /** Price decimals and starting mid, in `10^-priceDp` units. */
  priceDp: number;
  mid: number;
  /** The widest spread of quotes, in bps of their median, that still gives a price. */
  maxDivergenceBps: number;
  /** Quantity decimals and the order-size range, in `10^-qtyDp` units. */
  qtyDp: number;
  qty: readonly [number, number];
}

export type TapeKind = "PRICES" | "ORDER" | "DEPOSIT";

export interface TapeCommand {
  kind: "command";
  seq: number;
  type: TapeKind;
  /** The market a PRICES or ORDER command names; `null` for a deposit. */
  market: string | null;
  detail: string;
  /** What the command did, as the tape prints it. */
  result: string;
  /**
   * The published index for PRICES, or the fill price for ORDER, in the market's `10^-priceDp`
   * units; `null` when there is no price, and for a deposit.
   */
  price: number | null;
  /** True when the result is a refusal: no price for PRICES, a rejected ORDER. */
  refused: boolean;
  /** The command as the root hashes it, without its seq. */
  command: Record<string, unknown>;
  /** `chainRoot(previous root, { seq, ...command })`. */
  root: string;
}

export interface TapeCheckpoint {
  kind: "checkpoint";
  seq: number;
  root: string;
}

export type TapeEntry = TapeCommand | TapeCheckpoint;

/** A command before sequencing: its line on the tape and the command the root folds in. */
type Unsequenced = Omit<TapeCommand, "kind" | "seq" | "root">;

/**
 * The engine's local markets: the starting mids are its `config/dev.toml` `mock_mids`, and each
 * spread limit is that market's `price_rules.max_divergence_bps`.
 */
export const TAPE_MARKETS: readonly TapeMarket[] = [
  { symbol: "BTC-USD", priceDp: 2, mid: 10_000_000, maxDivergenceBps: 25, qtyDp: 3, qty: [10, 500] },
  { symbol: "ETH-USD", priceDp: 2, mid: 400_000, maxDivergenceBps: 25, qtyDp: 2, qty: [10, 800] },
  { symbol: "EUR-USD", priceDp: 5, mid: 108_000, maxDivergenceBps: 5, qtyDp: 0, qty: [1_000, 50_000] },
  { symbol: "US500", priceDp: 1, mid: 65_000, maxDivergenceBps: 10, qtyDp: 1, qty: [5, 100] },
  { symbol: "XAU-USD", priceDp: 2, mid: 260_000, maxDivergenceBps: 10, qtyDp: 1, qty: [10, 200] },
  { symbol: "AAPL", priceDp: 2, mid: 23_000, maxDivergenceBps: 10, qtyDp: 0, qty: [1, 150] },
];

export const CHECKPOINT_EVERY = 12;
/** The seq of the tape's first command. */
export const TAPE_FIRST_SEQ = 48_201;
/** The rows the tape panel shows, and the milliseconds between commands. */
export const TAPE_ROWS = 13;
export const TAPE_STEP_MS = 1100;
export const GENESIS_ROOT = `0x${"00".repeat(32)}`;

/** `keccak256(prev ‖ canonical JSON of command)`, as `0x`-prefixed hex; `prev` is `0x`-prefixed too. */
export function chainRoot(prev: string, command: Record<string, unknown>): string {
  const bytes = concatBytes(hexToBytes(prev.slice(2)), utf8ToBytes(canonicalJson(command)));
  return `0x${bytesToHex(keccak_256(bytes))}`;
}

/**
 * A tape whose `next()` returns the next sequenced command, followed by a checkpoint when one is
 * due. Orders fill at the index their market last published, and are rejected while its last
 * prices had no price; a market's first command is always its prices.
 */
export function createTape(seed: number, firstSeq = 1) {
  const rand = mulberry32(seed);
  const walk = TAPE_MARKETS.map((m) => m.mid);
  // The index each market last published; `undefined` before its first prices, `null` for no price.
  const published: (number | null | undefined)[] = TAPE_MARKETS.map(() => undefined);
  let seq = firstSeq - 1;
  let root = GENESIS_ROOT;

  const account = () => `0x${randInt(rand, 0, 0xffff).toString(16).padStart(4, "0")}`;

  function market(i: number): TapeMarket {
    const m = TAPE_MARKETS[i];
    // `i` is drawn from the table's own index range.
    if (m === undefined) throw new Error(`tape: no market at index ${i}`);
    return m;
  }

  function prices(i: number): Unsequenced {
    const m = market(i);
    const mid = Math.max(1, Math.trunc((walk[i] ?? m.mid) * (1 + (rand() - 0.5) * 8e-4)));
    walk[i] = mid;
    const divergent = rand() < 0.06;
    const quotes = [0, 1, 2].map((v) => {
      const spreadBps = divergent && v === 2 ? randInt(rand, 30, 55) : (rand() - 0.5) * 4;
      return Math.trunc(mid * (1 + spreadBps / 10_000));
    });
    const index = median(quotes);
    const apart = bpsOf(Math.max(...quotes) - Math.min(...quotes), index);
    const priced = apart <= m.maxDivergenceBps;
    published[i] = priced ? index : null;
    return {
      type: "PRICES",
      market: m.symbol,
      detail: `${m.symbol} · 3 quotes`,
      result: priced ? `index ${formatFixed(index, m.priceDp)}` : `no price · ${apart} bps apart`,
      price: priced ? index : null,
      refused: !priced,
      command: { prices: { market: m.symbol, quotes } },
    };
  }

  function order(i: number, fill: number | null): Unsequenced {
    const m = market(i);
    const side = rand() < 0.5 ? "buy" : "sell";
    const qty = randInt(rand, m.qty[0], m.qty[1]);
    const who = account();
    return {
      type: "ORDER",
      market: m.symbol,
      detail: `${who} ${side} ${formatFixed(qty, m.qtyDp)} ${m.symbol}`,
      result: fill === null ? "rejected · no price" : `filled @ ${formatFixed(fill, m.priceDp)}`,
      price: fill,
      refused: fill === null,
      command: { order: { account: who, market: m.symbol, side, qty } },
    };
  }

  function deposit(): Unsequenced {
    const who = account();
    const amount = randInt(rand, 5, 400) * 25_000;
    return {
      type: "DEPOSIT",
      market: null,
      detail: `${who} ${formatFixed(amount, 2)} USDC`,
      result: "credited",
      price: null,
      refused: false,
      command: { deposit: { account: who, amount } },
    };
  }

  function draw(): Unsequenced {
    const roll = rand();
    const i = randInt(rand, 0, TAPE_MARKETS.length - 1);
    if (roll >= 0.92) return deposit();
    const last = published[i];
    if (roll < 0.5 || last === undefined) return prices(i);
    return order(i, last);
  }

  function next(): TapeEntry[] {
    seq += 1;
    const line = draw();
    root = chainRoot(root, { seq, ...line.command });
    const entries: TapeEntry[] = [{ kind: "command", seq, root, ...line }];
    if (seq % CHECKPOINT_EVERY === 0) entries.push({ kind: "checkpoint", seq, root });
    return entries;
  }

  return { next };
}

/** The last `rows` entries of a fresh tape, filled from its first command. */
export function tapeWindow(tape: ReturnType<typeof createTape>, rows: number): TapeEntry[] {
  const entries: TapeEntry[] = [];
  while (entries.length < rows) entries.push(...tape.next());
  return entries.slice(-rows);
}
