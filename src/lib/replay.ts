/**
 * A miniature of the engine's audit: a deterministic state machine, a log of sequenced commands,
 * and a keccak-256 root of the whole state after each one. Replaying the log from an empty state
 * must reproduce every published root; the first root that differs pins down where the record and
 * the rules part ways. It illustrates the principle only: the state, commands, and root encoding
 * here are not the engine's.
 *
 * Amounts are integer cents and quantities integer thousandths, so every machine computes the same
 * bytes.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { formatCents, formatMilli, formatSigned } from "./format";
import { computeIndex, VENUES, type IndexOutcome, type Quotes, type Venue } from "./price-index";
import { unreachable } from "./unreachable";

export type Side = "buy" | "sell";

export type Command =
  | { type: "list_market"; market: string; max_divergence_bps: number; min_sources: number }
  | { type: "deposit"; account: string; amount: number }
  | { type: "prices"; market: string; quotes: Record<Venue, number> }
  | { type: "order"; account: string; market: string; side: Side; qty: number };

export interface LogEntry {
  seq: number;
  command: Command;
  /** The state root published after this command. */
  root: string;
}

interface Position {
  qty: number;
  entry: number;
}

interface Market {
  max_divergence_bps: number;
  min_sources: number;
  quotes: Partial<Record<Venue, number>>;
  index: number | null;
}

interface Account {
  balance: number;
  positions: Record<string, Position>;
}

export interface DemoState {
  last_seq: number | null;
  markets: Record<string, Market>;
  accounts: Record<string, Account>;
}

/** The outcome of applying one command: the new state and what happened, or why it was refused. */
export type Applied = { ok: true; state: DemoState; event: string } | { ok: false; error: string };

export interface ReplayStep {
  seq: number;
  event: string;
  /** The root the replay computed. */
  root: string;
  /** The root the log published. */
  published: string;
  matches: boolean;
}

/**
 * A replay's outcome. A failed one stops at `divergedAt`: on a root that differs (`mismatch`, the
 * last step), or on a command the rules refuse (`refused`, with no step of its own).
 */
export type ReplayResult =
  | { ok: true; steps: ReplayStep[] }
  | { ok: false; kind: "mismatch" | "refused"; steps: ReplayStep[]; divergedAt: number; message: string };

/** The state before the first command. */
export function emptyState(): DemoState {
  return { last_seq: null, markets: {}, accounts: {} };
}

/** JSON with object keys sorted at every level, so equal states always encode to equal bytes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const fields: [string, unknown][] = Object.entries(value);
  const entries = fields
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/**
 * `0x`-prefixed keccak-256 of the state's canonical encoding: the engine's `Engine::state_root`
 * hashes its serialized state with keccak-256 the same way, over a different encoding.
 */
export function stateRoot(state: DemoState): string {
  return `0x${bytesToHex(keccak_256(utf8ToBytes(canonicalJson(state))))}`;
}

/**
 * Applies one sequenced command and returns the new state with a one-line account of what
 * happened; the input state is left untouched. A command the rules cannot apply is refused, with
 * the reason, and changes nothing:
 * - a seq other than the one after the last applied
 * - a command naming an unlisted market, an already listed one, or an unfunded account
 * - an amount, quote, or quantity that is not a positive integer
 *
 * Error cases:
 * - a command type outside `Command`
 */
export function applyCommand(prev: DemoState, seq: number, command: Command): Applied {
  const expected = prev.last_seq === null ? 1 : prev.last_seq + 1;
  if (seq !== expected) return refuse(`seq ${seq} out of sequence: expected ${expected}`);
  const state: DemoState = structuredClone(prev);
  state.last_seq = seq;

  switch (command.type) {
    case "list_market": {
      if (state.markets[command.market]) return refuse(`${command.market} is already listed`);
      const invalid =
        notPositive(command.min_sources, "min_sources") ??
        notPositive(command.max_divergence_bps, "max_divergence_bps");
      if (invalid) return refuse(invalid);
      state.markets[command.market] = {
        max_divergence_bps: command.max_divergence_bps,
        min_sources: command.min_sources,
        quotes: {},
        index: null,
      };
      return { ok: true, state, event: `${command.market} listed` };
    }
    case "deposit": {
      const invalid = notPositive(command.amount, "amount");
      if (invalid) return refuse(invalid);
      const account = (state.accounts[command.account] ??= { balance: 0, positions: {} });
      account.balance += command.amount;
      return { ok: true, state, event: `credited ${formatCents(command.amount)} USDC` };
    }
    case "prices": {
      const market = state.markets[command.market];
      if (!market) return refuse(`${command.market} is not listed`);
      const invalid = VENUES.map((v) => notPositive(command.quotes[v], `${v} quote`)).find((e) => e !== null);
      if (invalid) return refuse(invalid);
      market.quotes = { ...command.quotes };
      // Every quote in a prices command arrives at its seq, so all are fresh.
      const quotes: Quotes = {
        coinbase: { mid: command.quotes.coinbase, ts: 0 },
        kraken: { mid: command.quotes.kraken, ts: 0 },
        bitstamp: { mid: command.quotes.bitstamp, ts: 0 },
      };
      const rules = { maxAgeMs: 0, maxDivergenceBps: market.max_divergence_bps, minSources: market.min_sources };
      const index = computeIndex(quotes, rules, 0);
      market.index = index.status === "price" ? index.mid : null;
      return { ok: true, state, event: describeIndex(index) };
    }
    case "order": {
      const market = state.markets[command.market];
      if (!market) return refuse(`${command.market} is not listed`);
      const invalid = notPositive(command.qty, "qty");
      if (invalid) return refuse(invalid);
      const account = state.accounts[command.account];
      if (!account) return refuse(`${command.account} has no balance`);
      if (market.index === null) return { ok: true, state, event: "rejected: no price" };
      const price = market.index;
      const delta = command.side === "buy" ? command.qty : -command.qty;
      const realised = trade(account, command.market, delta, price);
      const fill = `filled ${formatMilli(command.qty)} @ ${formatCents(price)}`;
      return { ok: true, state, event: realised === 0 ? fill : `${fill}, realised ${formatSigned(realised, 2)}` };
    }
    default:
      return unreachable(command, "replay");
  }
}

/**
 * The event text for a prices command's index.
 * Error cases:
 * - a status outside `IndexOutcome`
 */
function describeIndex(index: IndexOutcome): string {
  switch (index.status) {
    case "price":
      return `index ${formatCents(index.mid)}`;
    case "divergent":
      return `no price: quotes ${index.divergenceBps} bps apart`;
    case "stale":
      return `no price: ${index.used.length} of ${index.needed} quotes`;
    default:
      return unreachable(index, "replay");
  }
}

/** Moves a position by `delta` thousandths at `price` and returns the profit or loss realised, in cents. */
function trade(account: Account, market: string, delta: number, price: number): number {
  const pos = account.positions[market] ?? { qty: 0, entry: 0 };
  let realised = 0;
  let qty = pos.qty;
  let entry = pos.entry;
  if (qty !== 0 && Math.sign(qty) !== Math.sign(delta)) {
    const closed = Math.min(Math.abs(qty), Math.abs(delta));
    realised = Math.trunc(((price - entry) * closed * Math.sign(qty)) / 1000);
    qty += Math.sign(delta) * closed;
    delta -= Math.sign(delta) * closed;
    if (qty === 0) entry = 0;
  }
  if (delta !== 0) {
    entry = Math.trunc((Math.abs(qty) * entry + Math.abs(delta) * price) / (Math.abs(qty) + Math.abs(delta)));
    qty += delta;
  }
  account.balance += realised;
  if (qty === 0) delete account.positions[market];
  else account.positions[market] = { qty, entry };
  return realised;
}

/** A refusal with its reason. */
function refuse(error: string): Applied {
  return { ok: false, error };
}

/** Why `value` is not a positive safe integer, or `null` when it is. */
function notPositive(value: number | undefined, name: string): string | null {
  return value === undefined || !Number.isSafeInteger(value) || value <= 0 ? `${name} must be a positive integer` : null;
}

/**
 * Re-applies `log` from an empty state and checks each published root, stopping at the first
 * command that fails or root that differs, as `engine replay` does. The last step of a failed
 * replay is the one that diverged.
 */
export function replay(log: readonly LogEntry[]): ReplayResult {
  let state = emptyState();
  const steps: ReplayStep[] = [];
  for (const entry of log) {
    const applied = applyCommand(state, entry.seq, entry.command);
    if (!applied.ok) {
      const message = `applying seq ${entry.seq}: ${applied.error}`;
      return { ok: false, kind: "refused", steps, divergedAt: entry.seq, message };
    }
    state = applied.state;
    const root = stateRoot(state);
    const matches = root === entry.root;
    steps.push({ seq: entry.seq, event: applied.event, root, published: entry.root, matches });
    if (!matches) {
      return {
        ok: false,
        kind: "mismatch",
        steps,
        divergedAt: entry.seq,
        message: `state root mismatch at seq ${entry.seq}: log says ${entry.root}, replay gives ${root}`,
      };
    }
  }
  return { ok: true, steps };
}

/**
 * A one-line rendering of a command, as the log viewer shows it.
 * Error cases:
 * - a command type outside `Command`
 */
export function describeCommand(command: Command): string {
  switch (command.type) {
    case "list_market":
      return `list ${command.market}, max spread ${command.max_divergence_bps} bps, min ${command.min_sources} quotes`;
    case "deposit":
      return `deposit ${formatCents(command.amount)} USDC to ${command.account}`;
    case "prices":
      return `prices ${command.market}: ${VENUES.map((v) => `${v} ${formatCents(command.quotes[v])}`).join(", ")}`;
    case "order":
      return `order ${command.account} ${command.side} ${formatMilli(command.qty)} ${command.market}`;
    default:
      return unreachable(command, "replay");
  }
}
