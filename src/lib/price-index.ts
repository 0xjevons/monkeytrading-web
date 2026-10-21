/** The engine's reference-index rule, and the seeded three-venue market the hero simulates. */

import { mulberry32, pick, randInt } from "./prng";

/** The engine's index rules: how old a quote may be, how far quotes may spread, and how many it needs. */
export interface PriceRules {
  maxAgeMs: number;
  maxDivergenceBps: number;
  minSources: number;
}

/** A venue's latest mid, in cents, and when it arrived, in simulation milliseconds. */
export interface Quote {
  mid: number;
  ts: number;
}

export type Venue = (typeof VENUES)[number];
export type Quotes = Record<Venue, Quote>;

/** The index at a moment: a price, or no price because too few quotes are fresh or they disagree. */
export type IndexOutcome =
  | { status: "price"; mid: number; used: Venue[]; divergenceBps: number }
  | { status: "stale"; used: Venue[]; needed: number }
  | { status: "divergent"; used: Venue[]; divergenceBps: number };

/** One step of the hero simulation. */
export interface SimFrame {
  tick: number;
  /** Simulation time, in milliseconds: the tick count times `SIM_TICK_MS`. */
  now: number;
  quotes: Quotes;
  index: IndexOutcome;
  /** The index mid at each recent tick, oldest first; `null` where there was no price. */
  history: (number | null)[];
}

type Episode =
  | { kind: "calm"; until: number }
  | { kind: "stale"; venue: Venue; until: number }
  | { kind: "diverge"; venue: Venue; direction: 1 | -1; bps: number; from: number; until: number };

/** The venues the engine prices BTC-USD and ETH-USD from (`[feeds.venues]` in its `config/dev.toml`). */
export const VENUES = ["coinbase", "kraken", "bitstamp"] as const;

export const VENUE_NAMES: Readonly<Record<Venue, string>> = {
  coinbase: "Coinbase",
  kraken: "Kraken",
  bitstamp: "Bitstamp",
};

/** The `price_rules` the engine's `config/dev.toml` sets for BTC-USD. */
export const SIM_RULES: Readonly<PriceRules> = { maxAgeMs: 1000, maxDivergenceBps: 25, minSources: 2 };

export const SIM_TICK_MS = 250;
export const SIM_HISTORY = 96;
const START_MID = 10_000_000; // 100,000.00

/** Basis points `diff` is of `of`, truncated toward zero, as the engine's `Fixed::bps_of` does. */
export function bpsOf(diff: number, of: number): number {
  return Math.trunc((diff * 10_000) / of);
}

/**
 * The median of `mids`, in their unit: the middle value, or the midpoint of the middle two
 * truncated toward zero, as the engine's `compute_index` takes it.
 * Error cases:
 * - `mids` is empty
 */
export function median(mids: readonly number[]): number {
  const sorted = [...mids].sort((a, b) => a - b);
  const upper = sorted[Math.floor(sorted.length / 2)];
  const lower = sorted[Math.floor((sorted.length - 1) / 2)];
  if (upper === undefined || lower === undefined) throw new Error("median: no values");
  return Math.trunc((lower + upper) / 2);
}

/**
 * The index at `now`, as the engine's `compute_index` (`crates/core/src/price.rs`) computes it: the
 * median of quotes no older than `maxAgeMs`. With fewer fresh quotes than `minSources`, or fresh
 * quotes spread wider than `maxDivergenceBps` of the median, the market has no price.
 */
export function computeIndex(quotes: Quotes, rules: PriceRules, now: number): IndexOutcome {
  const used = VENUES.filter((v) => quotes[v].ts <= now && now - quotes[v].ts <= rules.maxAgeMs);
  if (used.length < rules.minSources) {
    return { status: "stale", used, needed: rules.minSources };
  }
  const mids = used.map((v) => quotes[v].mid);
  const mid = median(mids);
  const divergenceBps = bpsOf(Math.max(...mids) - Math.min(...mids), mid);
  if (divergenceBps > rules.maxDivergenceBps) {
    return { status: "divergent", used, divergenceBps };
  }
  return { status: "price", mid, used, divergenceBps };
}

/**
 * A deterministic three-venue market. Venues quote around a shared random walk; every so often one
 * stops quoting (and goes stale) or drifts away from the others (and the market has no price).
 * The first two episodes are scheduled early so a visitor sees both within seconds.
 */
export function createIndexSim(seed: number, rules: PriceRules = SIM_RULES) {
  const rand = mulberry32(seed);
  let tick = 0;
  let base = START_MID;
  const offsetBps: Record<Venue, number> = { coinbase: 0, kraken: 0, bitstamp: 0 };
  const quotes: Quotes = {
    coinbase: { mid: base, ts: 0 },
    kraken: { mid: base, ts: 0 },
    bitstamp: { mid: base, ts: 0 },
  };
  let episode: Episode = { kind: "calm", until: 14 };
  const scripted: Episode[] = [
    { kind: "stale", venue: "kraken", until: 34 },
    { kind: "calm", until: 50 },
    { kind: "diverge", venue: "coinbase", direction: 1, bps: 42, from: 50, until: 70 },
  ];
  const history: (number | null)[] = [];

  function nextEpisode(): Episode {
    const scriptedNext = scripted.shift();
    if (scriptedNext) return scriptedNext;
    if (episode.kind !== "calm") return { kind: "calm", until: tick + randInt(rand, 24, 48) };
    const venue = pick(rand, VENUES);
    if (rand() < 0.5) return { kind: "stale", venue, until: tick + randInt(rand, 14, 22) };
    return {
      kind: "diverge",
      venue,
      direction: rand() < 0.5 ? 1 : -1,
      bps: randInt(rand, 34, 60),
      from: tick,
      until: tick + randInt(rand, 12, 20),
    };
  }

  // Prices the current quotes, records the result in the history, and returns the frame.
  function settle(): SimFrame {
    const now = tick * SIM_TICK_MS;
    const index = computeIndex(quotes, rules, now);
    history.push(index.status === "price" ? index.mid : null);
    if (history.length > SIM_HISTORY) history.shift();
    return {
      tick,
      now,
      quotes: { coinbase: { ...quotes.coinbase }, kraken: { ...quotes.kraken }, bitstamp: { ...quotes.bitstamp } },
      index,
      history: [...history],
    };
  }

  function step(): SimFrame {
    tick += 1;
    if (tick >= episode.until) episode = nextEpisode();
    const now = tick * SIM_TICK_MS;
    // The shared price: a small random walk of up to ±1.5 bps a tick.
    base = Math.trunc(base * (1 + (rand() - 0.5) * 3e-4));
    for (const venue of VENUES) {
      // Each venue's offset from the shared price wanders within a few bps.
      let target = (rand() - 0.5) * 6;
      if (episode.kind === "diverge" && episode.venue === venue) {
        const ramp = Math.min(1, (tick - episode.from + 1) / 3);
        target = episode.direction * episode.bps * ramp;
      }
      offsetBps[venue] += (target - offsetBps[venue]) * 0.5;
      const silent = episode.kind === "stale" && episode.venue === venue;
      if (!silent && rand() < 0.8) {
        quotes[venue] = { mid: Math.trunc(base * (1 + offsetBps[venue] / 10_000)), ts: now };
      }
    }
    return settle();
  }

  return { step, initial: settle() };
}
