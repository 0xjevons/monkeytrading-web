/** The replay demo's published log, its roots, and the edits a visitor can make to it. */

import type { Command, LogEntry } from "./replay";

export type TamperId = "deposit" | "quote" | "agree" | "order";

export interface Tamper {
  id: TamperId;
  label: string;
  seq: number;
  /** What changed, as `before → after`. */
  change: string;
  edit: (command: Command) => Command;
}

const A = "0x00a1";
const B = "0x00b2";

/** The demo's published log: each command with the state root published after it. */
export const DEMO_LOG: readonly LogEntry[] = [
  {
    seq: 1,
    command: { type: "list_market", market: "BTC-USD", max_divergence_bps: 25, min_sources: 2 },
    root: "0x22e1cf70a86716862a4293db5b88307d1498ea70ec9615bf2c1d208372163e4b",
  },
  {
    seq: 2,
    command: { type: "deposit", account: A, amount: 5_000_000 },
    root: "0x792f5a58e7d7bb918910f0aa5b4ef527d21b2c8267490b0b70beb6fdd2f0c9e6",
  },
  {
    seq: 3,
    command: prices(10_001_890, 10_000_970, 10_001_240),
    root: "0x825229f1ea17ed0e3ef50f03dfda94e60558ba5caf3b0ef47a69e25533eefa8f",
  },
  {
    seq: 4,
    command: { type: "order", account: A, market: "BTC-USD", side: "buy", qty: 250 },
    root: "0x9a4e2d406a1b5c958609a00ff8e1af3e9d68a17a485fcb48fe2fae9ef23acc93",
  },
  {
    seq: 5,
    command: { type: "deposit", account: B, amount: 2_000_000 },
    root: "0x238522d2e3e33924e415c19c0446fa6edcbbeff9a6b7652c944e30288821ad6a",
  },
  {
    seq: 6,
    command: { type: "order", account: B, market: "BTC-USD", side: "sell", qty: 100 },
    root: "0x79b1885ca9c55524b875f0d4d9a00a50eddb5970dd1ed9f038f865aaa36607b6",
  },
  {
    seq: 7,
    command: prices(10_056_000, 10_022_840, 10_023_110),
    root: "0x386a1cdfc155aad4e39ced0c1c7d1a907537a4c5c340824d9c27b2a8b349beaf",
  },
  {
    seq: 8,
    command: { type: "order", account: A, market: "BTC-USD", side: "sell", qty: 250 },
    root: "0xeb7376577955578695ad8c2de86e9e664ea36958efdbd1570f91d5da217bc5d0",
  },
  {
    seq: 9,
    command: prices(10_040_520, 10_039_990, 10_040_270),
    root: "0x94032d96af2587574f6db2256b886b5ed7960ef0d96a443f23372efa12e30f7e",
  },
  {
    seq: 10,
    command: { type: "order", account: A, market: "BTC-USD", side: "sell", qty: 250 },
    root: "0xc2180c3e983a6c43cb7ee406486d77d78baf92e52bccff91edd93f31d7039bdd",
  },
  {
    seq: 11,
    command: { type: "order", account: B, market: "BTC-USD", side: "buy", qty: 100 },
    root: "0x0c827e400f7a2cba9ba23b41e898cffc005a5d2ffe97b8f6478a8453c39dbf0b",
  },
];

/** Edits a visitor can make to the log. Each changes one value and leaves the published roots alone. */
export const TAMPERS: readonly Tamper[] = [
  {
    id: "deposit",
    label: "Inflate a deposit",
    seq: 2,
    change: "50,000.00 → 500,000.00",
    edit: (c) => (c.type === "deposit" ? { ...c, amount: 50_000_000 } : c),
  },
  {
    id: "quote",
    label: "Shade one venue's quote",
    seq: 3,
    change: "Kraken 100,009.70 → 100,001.70",
    edit: (c) => (c.type === "prices" ? { ...c, quotes: { ...c.quotes, kraken: 10_000_170 } } : c),
  },
  {
    id: "agree",
    label: "Pretend the venues agreed",
    seq: 7,
    change: "Coinbase 100,560.00 → 100,240.00",
    edit: (c) => (c.type === "prices" ? { ...c, quotes: { ...c.quotes, coinbase: 10_024_000 } } : c),
  },
  {
    id: "order",
    label: "Shrink a closing order",
    seq: 10,
    change: "0.250 → 0.200",
    edit: (c) => (c.type === "order" ? { ...c, qty: 200 } : c),
  },
];

/** `log` with `tamper` applied to its command; the published roots are unchanged. */
export function tamperLog(log: readonly LogEntry[], tamper: Tamper): LogEntry[] {
  return log.map((entry) => (entry.seq === tamper.seq ? { ...entry, command: tamper.edit(entry.command) } : entry));
}

/** A BTC-USD prices command with each venue's quote, in cents. */
function prices(coinbase: number, kraken: number, bitstamp: number): Command {
  return { type: "prices", market: "BTC-USD", quotes: { coinbase, kraken, bitstamp } };
}
