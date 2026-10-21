/** The replay demo's published log, its roots, and the edits a visitor can make to it. */

import type { Command, LogEntry } from "./replay";

export interface Tamper {
  id: string;
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
    command: prices(10_001_240, 10_001_890, 10_000_970),
    root: "0x73dd35534b714ae316ef25649efb8c80f4d07935f2387dd2cd8c2e4bd7163130",
  },
  {
    seq: 4,
    command: { type: "order", account: A, market: "BTC-USD", side: "buy", qty: 250 },
    root: "0xd33a263cc92f638911ed9873a010f727c7a469c2e5cd4ad4694398eff7ab1fec",
  },
  {
    seq: 5,
    command: { type: "deposit", account: B, amount: 2_000_000 },
    root: "0x861ce29593e5bf943608ecf207be8860d3dcb8c31c60eb6a0b64f9161c6625e3",
  },
  {
    seq: 6,
    command: { type: "order", account: B, market: "BTC-USD", side: "sell", qty: 100 },
    root: "0xd4cfceb5fa7ce2b46e0a273d9777496fe00225fcbf50c153e60e717d866698b4",
  },
  {
    seq: 7,
    command: prices(10_023_110, 10_056_000, 10_022_840),
    root: "0x385ec322abe6376083184f459821cc23f8d23d953a8798ee687cbe8056d6f2c9",
  },
  {
    seq: 8,
    command: { type: "order", account: A, market: "BTC-USD", side: "sell", qty: 250 },
    root: "0xcaf92ddb17a89f4af12d7c2327aec887088e4c7423fe854b3c4388070ad128c1",
  },
  {
    seq: 9,
    command: prices(10_040_270, 10_040_520, 10_039_990),
    root: "0x31a247e6b887af4475b396644fdfe2e03c063210e514851070e7acc8e54ff887",
  },
  {
    seq: 10,
    command: { type: "order", account: A, market: "BTC-USD", side: "sell", qty: 250 },
    root: "0xa165ab316d46d13049a43a454d6df582c02bcb261854a7de63524f7015d30c8b",
  },
  {
    seq: 11,
    command: { type: "order", account: B, market: "BTC-USD", side: "buy", qty: 100 },
    root: "0x89734abdbfb9915c94b006a1b351878426d7653a1b43a597a0fcc42168c81cd7",
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
function prices(binance: number, coinbase: number, kraken: number): Command {
  return { type: "prices", market: "BTC-USD", quotes: { binance, coinbase, kraken } };
}
