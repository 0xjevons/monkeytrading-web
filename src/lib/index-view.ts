/**
 * What the hero's index panel draws for a frame: each venue's state and distance from the median,
 * and the number line's window, which pans and zooms toward the current quotes.
 */

import { median, SIM_RULES, VENUES, type PriceRules, type SimFrame, type Venue } from "./price-index";

/** The number line's window. Layout only, so both values may be fractional. */
export interface LineView {
  /** The centre, in cents. */
  anchor: number;
  /** Half the window's width, in basis points of the anchor. */
  halfBps: number;
}

/** One venue's row in the panel's table. */
export interface VenueRow {
  venue: Venue;
  /** Whether the quote is fresh enough to count toward the index. */
  fresh: boolean;
  /** Distance from the median of the fresh quotes, in tenths of a basis point, truncated; `null` when stale. */
  offsetTenthBps: number | null;
  /** Whether the quote sits more than half the divergence limit from that median while the market has no price. */
  apart: boolean;
}

const MIN_HALF_BPS = 6;
const MAX_HALF_BPS = 80;

/** The median of the fresh quotes; with none fresh, the median of every venue's last quote. */
export function freshMedian(frame: SimFrame): number {
  const used = frame.index.used.length > 0 ? frame.index.used : VENUES;
  return median(used.map((v) => frame.quotes[v].mid));
}

/** The table rows for `frame`, in venue order. */
export function venueRows(frame: SimFrame, rules: PriceRules = SIM_RULES): VenueRow[] {
  const fresh = new Set<Venue>(frame.index.used);
  const centre = freshMedian(frame);
  return VENUES.map((venue) => {
    if (!fresh.has(venue)) return { venue, fresh: false, offsetTenthBps: null, apart: false };
    const offsetTenthBps = Math.trunc(((frame.quotes[venue].mid - centre) * 100_000) / centre);
    const apart = frame.index.status === "divergent" && Math.abs(offsetTenthBps) * 2 > rules.maxDivergenceBps * 10;
    return { venue, fresh: true, offsetTenthBps, apart };
  });
}

/** The lowest and highest fresh quotes, in cents, or `null` when none is fresh. */
export function freshRange(frame: SimFrame): { low: number; high: number } | null {
  const mids = frame.index.used.map((v) => frame.quotes[v].mid);
  return mids.length === 0 ? null : { low: Math.min(...mids), high: Math.max(...mids) };
}

/** The window for a frame shown on its own: centred on its median, at the narrowest zoom. */
export function initialView(frame: SimFrame): LineView {
  return { anchor: freshMedian(frame), halfBps: MIN_HALF_BPS + 2 };
}

/**
 * Eases `view` a step toward `frame`: the centre moves 30% of the way to the fresh median, and the
 * half-width 35% of the way to 1.4 times the widest fresh quote's distance, within 6 to 80 bps.
 */
export function nextView(view: LineView, frame: SimFrame): LineView {
  const anchor = view.anchor + (freshMedian(frame) - view.anchor) * 0.3;
  const widest = Math.max(0, ...frame.index.used.map((v) => Math.abs(((frame.quotes[v].mid - anchor) / anchor) * 10_000)));
  const want = Math.min(MAX_HALF_BPS, Math.max(MIN_HALF_BPS, widest * 1.4));
  return { anchor, halfBps: view.halfBps + (want - view.halfBps) * 0.35 };
}

/** Where `mid` sits on the line, as a percentage of its width, kept 2% inside each end. */
export function linePosition(view: LineView, mid: number): number {
  const offset = ((mid - view.anchor) / view.anchor) * 10_000;
  return Math.min(98, Math.max(2, 50 + (offset / view.halfBps) * 50));
}


/** The sparkline's drawing: polylines through the prices, and the runs of ticks with no price. */
export interface Sparkline {
  /** One polyline per unbroken run of prices, keyed by its first slot. */
  segments: { start: number; points: string }[];
  /** First and last slot of each run with no price, inclusive. */
  gaps: [number, number][];
}

/**
 * Lays `history` (oldest first, `null` for no price) right-aligned into `slots` x-positions and a
 * `height`-tall box, scaled to its price range with 20% headroom (at least 5.00 either side).
 */
export function sparkline(history: readonly (number | null)[], slots: number, height: number): Sparkline {
  const prices = history.filter((p): p is number => p !== null);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const pad = Math.max(500, (high - low) * 0.2);
  const offset = slots - history.length;
  const y = (p: number) => height - ((p - low + pad) / (high - low + 2 * pad)) * height;

  const segments: Sparkline["segments"] = [];
  const gaps: Sparkline["gaps"] = [];
  let run: string[] = [];
  let start = 0;
  history.forEach((price, i) => {
    const x = i + offset;
    if (price === null) {
      if (run.length > 0) segments.push({ start, points: run.join(" ") });
      run = [];
      const last = gaps[gaps.length - 1];
      if (last && last[1] === x - 1) last[1] = x;
      else gaps.push([x, x]);
      return;
    }
    if (run.length === 0) start = x;
    run.push(`${x},${y(price).toFixed(2)}`);
  });
  if (run.length > 0) segments.push({ start, points: run.join(" ") });
  return { segments, gaps };
}
