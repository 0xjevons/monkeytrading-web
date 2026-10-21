import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { formatCents, formatMilli } from "./format";
import { computeIndex, VENUES, type Quotes, type Venue } from "./price-index";

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

export function emptyState(): DemoState {
  return { last_seq: null, markets: {}, accounts: {} };
}

/** A command the rules refuse: the log cannot be applied past it. */
export class ReplayError extends Error {}

/** JSON with object keys sorted at every level, so equal states always encode to equal bytes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** `0x`-prefixed keccak-256 of the state's canonical encoding. */
export function stateRoot(state: DemoState): string {
  return `0x${bytesToHex(keccak_256(utf8ToBytes(canonicalJson(state))))}`;
}

/**
 * Applies one sequenced command and returns the new state with a one-line account of what
 * happened. The input state is left untouched.
 * Error cases:
 * - a seq other than the one after the last applied
 * - a command naming an unlisted market, an already listed one, or an unfunded account
 * - an amount, quote, or quantity that is not a positive integer
 */
export function applyCommand(prev: DemoState, seq: number, command: Command): { state: DemoState; event: string } {
  const expected = prev.last_seq === null ? 1 : prev.last_seq + 1;
  if (seq !== expected) throw new ReplayError(`seq ${seq} out of sequence: expected ${expected}`);
  const state: DemoState = structuredClone(prev);
  state.last_seq = seq;

  switch (command.type) {
    case "list_market": {
      if (state.markets[command.market]) throw new ReplayError(`${command.market} is already listed`);
      requirePositive(command.min_sources, "min_sources");
      requirePositive(command.max_divergence_bps, "max_divergence_bps");
      state.markets[command.market] = {
        max_divergence_bps: command.max_divergence_bps,
        min_sources: command.min_sources,
        quotes: {},
        index: null,
      };
      return { state, event: `${command.market} listed` };
    }
    case "deposit": {
      requirePositive(command.amount, "amount");
      const account = (state.accounts[command.account] ??= { balance: 0, positions: {} });
      account.balance += command.amount;
      return { state, event: `credited ${formatCents(command.amount)} USDC` };
    }
    case "prices": {
      const market = requireMarket(state, command.market);
      for (const venue of VENUES) requirePositive(command.quotes[venue], `${venue} quote`);
      market.quotes = { ...command.quotes };
      const quotes = Object.fromEntries(VENUES.map((v) => [v, { mid: command.quotes[v], ts: 0 }])) as Quotes;
      const index = computeIndex(
        quotes,
        { maxAgeMs: 0, maxDivergenceBps: market.max_divergence_bps, minSources: market.min_sources },
        0,
      );
      if (index.status === "price") {
        market.index = index.mid;
        return { state, event: `index ${formatCents(index.mid)}` };
      }
      market.index = null;
      return {
        state,
        event:
          index.status === "divergent"
            ? `no price: quotes ${index.divergenceBps} bps apart`
            : `no price: ${index.used.length} of ${index.needed} quotes`,
      };
    }
    case "order": {
      const market = requireMarket(state, command.market);
      requirePositive(command.qty, "qty");
      const account = state.accounts[command.account];
      if (!account) throw new ReplayError(`${command.account} has no balance`);
      if (market.index === null) return { state, event: "rejected: no price" };
      const price = market.index;
      const delta = command.side === "buy" ? command.qty : -command.qty;
      const realised = trade(account, command.market, delta, price);
      const fill = `filled ${formatMilli(command.qty)} @ ${formatCents(price)}`;
      return { state, event: realised === 0 ? fill : `${fill}, realised ${signedCents(realised)}` };
    }
  }
}

/** Moves a position by `delta` thousandths at `price` and returns the profit or loss realised. */
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

function requireMarket(state: DemoState, market: string): Market {
  const found = state.markets[market];
  if (!found) throw new ReplayError(`${market} is not listed`);
  return found;
}

function requirePositive(value: number | undefined, name: string): void {
  if (value === undefined || !Number.isSafeInteger(value) || value <= 0) {
    throw new ReplayError(`${name} must be a positive integer`);
  }
}

function signedCents(cents: number): string {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}

export interface ReplayStep {
  seq: number;
  event: string;
  /** The root the replay computed. */
  root: string;
  /** The root the log published. */
  published: string;
  matches: boolean;
}

export type ReplayResult =
  | { ok: true; steps: ReplayStep[] }
  | { ok: false; steps: ReplayStep[]; divergedAt: number; message: string };

/**
 * Re-applies `log` from an empty state and checks each published root, stopping at the first
 * command that fails or root that differs, as `engine replay` does. The last step of a failed
 * replay is the one that diverged.
 */
export function replay(log: readonly LogEntry[]): ReplayResult {
  let state = emptyState();
  const steps: ReplayStep[] = [];
  for (const entry of log) {
    let event: string;
    try {
      ({ state, event } = applyCommand(state, entry.seq, entry.command));
    } catch (err) {
      if (!(err instanceof ReplayError)) throw err;
      return { ok: false, steps, divergedAt: entry.seq, message: `applying seq ${entry.seq}: ${err.message}` };
    }
    const root = stateRoot(state);
    const matches = root === entry.root;
    steps.push({ seq: entry.seq, event, root, published: entry.root, matches });
    if (!matches) {
      return {
        ok: false,
        steps,
        divergedAt: entry.seq,
        message: `state root mismatch at seq ${entry.seq}: log says ${entry.root}, replay gives ${root}`,
      };
    }
  }
  return { ok: true, steps };
}

/** A one-line rendering of a command, as the log viewer shows it. */
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
  }
}
