import { mulberry32, randInt } from "./prng";

export const VENUES = ["binance", "coinbase", "kraken"] as const;
export type Venue = (typeof VENUES)[number];

export const VENUE_NAMES: Record<Venue, string> = {
  binance: "Binance",
  coinbase: "Coinbase",
  kraken: "Kraken",
};

/** The engine's index rules: how old a quote may be, how far quotes may spread, and how many it needs. */
export interface PriceRules {
  maxAgeMs: number;
  maxDivergenceBps: number;
  minSources: number;
}

/** The rules the engine's local configuration applies to BTC-USD. */
export const SIM_RULES: PriceRules = { maxAgeMs: 1000, maxDivergenceBps: 25, minSources: 2 };

/** A venue's latest mid, in cents, and when it arrived. */
export interface Quote {
  mid: number;
  ts: number;
}

export type Quotes = Record<Venue, Quote>;

export type IndexOutcome =
  | { status: "price"; mid: number; used: Venue[]; divergenceBps: number }
  | { status: "stale"; used: Venue[]; needed: number }
  | { status: "divergent"; used: Venue[]; divergenceBps: number };

/** Basis points `diff` is of `of`, truncated toward zero. */
export function bpsOf(diff: number, of: number): number {
  return Math.trunc((diff * 10_000) / of);
}

/**
 * The index at `now`, as the engine computes it: the median of quotes no older than `maxAgeMs`.
 * With fewer fresh quotes than `minSources`, or fresh quotes spread wider than
 * `maxDivergenceBps` around the median, the market has no price.
 */
export function computeIndex(quotes: Quotes, rules: PriceRules, now: number): IndexOutcome {
  const fresh = VENUES.filter((v) => {
    const q = quotes[v];
    return q.ts <= now && now - q.ts <= rules.maxAgeMs;
  });
  if (fresh.length < rules.minSources) {
    return { status: "stale", used: fresh, needed: rules.minSources };
  }
  const mids = fresh.map((v) => quotes[v].mid).sort((a, b) => a - b);
  const n = mids.length;
  const mid = n % 2 === 1 ? mids[(n - 1) / 2]! : Math.trunc((mids[n / 2 - 1]! + mids[n / 2]!) / 2);
  const divergenceBps = bpsOf(mids[n - 1]! - mids[0]!, mid);
  if (divergenceBps > rules.maxDivergenceBps) {
    return { status: "divergent", used: fresh, divergenceBps };
  }
  return { status: "price", mid, used: fresh, divergenceBps };
}

/** One step of the hero simulation. */
export interface SimFrame {
  tick: number;
  now: number;
  quotes: Quotes;
  index: IndexOutcome;
  /** The index mid at each recent tick, oldest first; `null` where there was no price. */
  history: (number | null)[];
}

export const SIM_TICK_MS = 250;
export const SIM_HISTORY = 96;
const START_MID = 10_000_000; // 100,000.00

type Episode =
  | { kind: "calm"; until: number }
  | { kind: "stale"; venue: Venue; until: number }
  | { kind: "diverge"; venue: Venue; direction: 1 | -1; bps: number; from: number; until: number };

/**
 * A deterministic three-venue market. Venues quote around a shared random walk; every so often one
 * stops quoting (and goes stale) or drifts away from the others (and the market has no price).
 * The first two episodes are scheduled early so a visitor sees both within seconds.
 */
export function createIndexSim(seed: number, rules: PriceRules = SIM_RULES) {
  const rand = mulberry32(seed);
  let tick = 0;
  let base = START_MID;
  const offsetBps: Record<Venue, number> = { binance: 0, coinbase: 0, kraken: 0 };
  const quotes: Quotes = {
    binance: { mid: base, ts: 0 },
    coinbase: { mid: base, ts: 0 },
    kraken: { mid: base, ts: 0 },
  };
  const scripted: Episode[] = [
    { kind: "calm", until: 14 },
    { kind: "stale", venue: "kraken", until: 34 },
    { kind: "calm", until: 50 },
    { kind: "diverge", venue: "coinbase", direction: 1, bps: 42, from: 50, until: 70 },
  ];
  let episode: Episode = scripted.shift()!;
  const history: (number | null)[] = [];

  function nextEpisode(): Episode {
    const scriptedNext = scripted.shift();
    if (scriptedNext) return scriptedNext;
    if (episode.kind !== "calm") return { kind: "calm", until: tick + randInt(rand, 24, 48) };
    const venue = VENUES[randInt(rand, 0, VENUES.length - 1)]!;
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

  /** Prices the current quotes, records the result in the history, and returns the frame. */
  function settle(): SimFrame {
    const now = tick * SIM_TICK_MS;
    const index = computeIndex(quotes, rules, now);
    history.push(index.status === "price" ? index.mid : null);
    if (history.length > SIM_HISTORY) history.shift();
    return {
      tick,
      now,
      quotes: { binance: { ...quotes.binance }, coinbase: { ...quotes.coinbase }, kraken: { ...quotes.kraken } },
      index,
      history: [...history],
    };
  }

  function step(): SimFrame {
    tick += 1;
    if (tick >= episode.until) episode = nextEpisode();
    const now = tick * SIM_TICK_MS;
    // The shared price: a small random walk of up to ±1.5 bps a tick.
    base = Math.round(base * (1 + (rand() - 0.5) * 3e-4));
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
        quotes[venue] = { mid: Math.round(base * (1 + offsetBps[venue] / 10_000)), ts: now };
      }
    }
    return settle();
  }

  return { step, initial: settle() };
}
