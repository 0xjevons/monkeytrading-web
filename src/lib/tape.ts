import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

import { formatFixed } from "./format";
import { bpsOf } from "./price-index";
import { mulberry32, randInt } from "./prng";
import { canonicalJson } from "./replay";

/**
 * The simulated public tape: a deterministic stream of sequenced commands, each folded into a
 * running keccak-256 root (`root = keccak(previous root ‖ command)`), with a checkpoint every
 * `CHECKPOINT_EVERY` commands. The chaining is an illustration; the engine hashes its whole state.
 */

interface TapeMarket {
  symbol: string;
  /** Price decimals and starting mid, in `10^-priceDp` units. */
  priceDp: number;
  mid: number;
  /** Quantity decimals and the order-size range, in `10^-qtyDp` units. */
  qtyDp: number;
  qty: [number, number];
}

const MARKETS: readonly TapeMarket[] = [
  { symbol: "BTC-USD", priceDp: 2, mid: 10_000_000, qtyDp: 3, qty: [10, 500] },
  { symbol: "ETH-USD", priceDp: 2, mid: 400_000, qtyDp: 2, qty: [10, 800] },
  { symbol: "EUR-USD", priceDp: 5, mid: 108_000, qtyDp: 0, qty: [1_000, 50_000] },
  { symbol: "US500", priceDp: 1, mid: 65_000, qtyDp: 1, qty: [5, 100] },
  { symbol: "XAU-USD", priceDp: 2, mid: 260_000, qtyDp: 1, qty: [10, 200] },
  { symbol: "AAPL", priceDp: 2, mid: 23_000, qtyDp: 0, qty: [1, 150] },
];

const MAX_DIVERGENCE_BPS = 25;
export const CHECKPOINT_EVERY = 12;
const GENESIS_ROOT = `0x${"00".repeat(32)}`;

export type TapeKind = "PRICES" | "ORDER" | "DEPOSIT";

export interface TapeCommand {
  kind: "command";
  seq: number;
  type: TapeKind;
  detail: string;
  /** What the command did. */
  result: string;
  /** True when the result is a refusal, such as an order with no price. */
  refused: boolean;
  root: string;
}

export interface TapeCheckpoint {
  kind: "checkpoint";
  seq: number;
  root: string;
}

export type TapeEntry = TapeCommand | TapeCheckpoint;

function chain(prev: string, command: unknown): string {
  return `0x${bytesToHex(keccak_256(concatBytes(hexToBytes(prev.slice(2)), utf8ToBytes(canonicalJson(command)))))}`;
}

/** A tape whose `next()` returns the next sequenced command, followed by a checkpoint when one is due. */
export function createTape(seed: number, firstSeq = 1) {
  const rand = mulberry32(seed);
  const mids = MARKETS.map((m) => m.mid);
  const priced = MARKETS.map(() => true);
  let seq = firstSeq - 1;
  let root = GENESIS_ROOT;

  const account = () => `0x${randInt(rand, 0, 0xffff).toString(16).padStart(4, "0")}`;

  function prices(i: number): Omit<TapeCommand, "seq" | "root" | "kind"> & { command: unknown } {
    const m = MARKETS[i]!;
    mids[i] = Math.max(1, Math.round(mids[i]! * (1 + (rand() - 0.5) * 8e-4)));
    const divergent = rand() < 0.06;
    const quotes = [0, 1, 2].map((v) => {
      const spreadBps = divergent && v === 2 ? randInt(rand, 30, 55) : (rand() - 0.5) * 4;
      return Math.round(mids[i]! * (1 + spreadBps / 10_000));
    });
    const sorted = [...quotes].sort((a, b) => a - b);
    const median = sorted[1]!;
    const apart = bpsOf(sorted[2]! - sorted[0]!, median);
    priced[i] = apart <= MAX_DIVERGENCE_BPS;
    return {
      type: "PRICES",
      detail: `${m.symbol} · 3 quotes`,
      result: priced[i] ? `index ${formatFixed(median, m.priceDp)}` : `no price · ${apart} bps apart`,
      refused: !priced[i],
      command: { prices: { market: m.symbol, quotes } },
    };
  }

  function order(i: number): Omit<TapeCommand, "seq" | "root" | "kind"> & { command: unknown } {
    const m = MARKETS[i]!;
    const side = rand() < 0.5 ? "buy" : "sell";
    const qty = randInt(rand, m.qty[0], m.qty[1]);
    const who = account();
    return {
      type: "ORDER",
      detail: `${who} ${side} ${formatFixed(qty, m.qtyDp)} ${m.symbol}`,
      result: priced[i] ? `filled @ ${formatFixed(mids[i]!, m.priceDp)}` : "rejected · no price",
      refused: !priced[i],
      command: { order: { account: who, market: m.symbol, side, qty } },
    };
  }

  function deposit(): Omit<TapeCommand, "seq" | "root" | "kind"> & { command: unknown } {
    const who = account();
    const amount = randInt(rand, 5, 400) * 25_000;
    return {
      type: "DEPOSIT",
      detail: `${who} ${formatFixed(amount, 2)} USDC`,
      result: "credited",
      refused: false,
      command: { deposit: { account: who, amount } },
    };
  }

  function next(): TapeEntry[] {
    seq += 1;
    const roll = rand();
    const i = randInt(rand, 0, MARKETS.length - 1);
    const { command, ...line } = roll < 0.5 ? prices(i) : roll < 0.92 ? order(i) : deposit();
    root = chain(root, { seq, ...(command as object) });
    const entries: TapeEntry[] = [{ kind: "command", seq, root, ...line }];
    if (seq % CHECKPOINT_EVERY === 0) entries.push({ kind: "checkpoint", seq, root });
    return entries;
  }

  return { next };
}
