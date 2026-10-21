"use client";

import { useState } from "react";

import { formatCents, groupThousands } from "@/lib/format";
import {
  createIndexSim,
  SIM_HISTORY,
  SIM_RULES,
  SIM_TICK_MS,
  VENUE_NAMES,
  VENUES,
  type SimFrame,
  type Venue,
} from "@/lib/price-index";

import { MotionToggle, useMotion, useTicker } from "./motion";

export const SIM_SEED = 1871;

/** The number line's window: its centre, in cents, and its half-width, in bps. */
interface View {
  anchor: number;
  half: number;
}

const bps = (diff: number, of: number) => (diff / of) * 10_000;

function target(frame: SimFrame): number {
  if (frame.index.status === "price") return frame.index.mid;
  const used: readonly Venue[] = frame.index.used.length ? frame.index.used : VENUES;
  return used.reduce((sum, v) => sum + frame.quotes[v].mid, 0) / used.length;
}

/** Eases the window toward the current quotes, so the line pans and zooms rather than jumps. */
function nextView(view: View, frame: SimFrame): View {
  const anchor = view.anchor + (target(frame) - view.anchor) * 0.3;
  const widest = Math.max(...frame.index.used.map((v) => Math.abs(bps(frame.quotes[v].mid - anchor, anchor))), 0);
  const want = Math.min(80, Math.max(6, widest * 1.4));
  return { anchor, half: view.half + (want - view.half) * 0.35 };
}

export function IndexPanel() {
  const [sim] = useState(() => createIndexSim(SIM_SEED));
  const [{ frame, view }, setState] = useState(() => ({
    frame: sim.initial,
    view: { anchor: target(sim.initial), half: 8 },
  }));
  const [motion, setMotion] = useMotion();
  const ref = useTicker<HTMLDivElement>(SIM_TICK_MS, motion, () =>
    setState((s) => {
      const next = sim.step();
      return { frame: next, view: nextView(s.view, next) };
    }),
  );

  const { index, quotes, now } = frame;
  const fresh = new Set<Venue>(index.used);
  const sorted = index.used.map((v) => quotes[v].mid).sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  // Spread is measured around the median of the fresh quotes, as the engine measures it.
  const n = sorted.length;
  const median = n === 0 ? target(frame) : n % 2 === 1 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  const at = (mid: number) => Math.min(98, Math.max(2, 50 + (bps(mid - view.anchor, view.anchor) / view.half) * 50));
  const broken = index.status !== "price";
  const stale = VENUES.filter((v) => !fresh.has(v));

  return (
    <div ref={ref} className="panel scanlines overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5 text-xs tracking-[0.12em] uppercase">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${broken ? "bg-alarm" : "animate-pulse-dot bg-glow"}`}
          />
          <span className="truncate text-fg">BTC-USD index</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 text-[0.625rem] tracking-[0.16em] text-amber uppercase">
            Simulation
          </span>
          <MotionToggle enabled={motion} onChange={setMotion} />
        </div>
      </div>

      <p className="sr-only">
        A simulation of three venues quoting BTC-USD, combined into a median index. When a venue stops quoting it goes
        stale and the index uses the other two; when the venues disagree by more than {SIM_RULES.maxDivergenceBps} basis
        points, the market has no price and nothing fills.
      </p>

      <div aria-hidden="true">
        <div className="grid grid-cols-[1fr_auto_4.5rem_4.25rem] gap-x-3 px-4 pt-3 pb-1 text-[0.625rem] tracking-[0.16em] text-fg-3 uppercase sm:grid-cols-[1fr_auto_5rem_5.5rem_4.5rem] sm:px-5">
          <span>Venue</span>
          <span className="text-right">Quote</span>
          <span className="text-right">Age</span>
          <span className="hidden text-right sm:block">vs median</span>
          <span className="text-right">State</span>
        </div>
        <ul className="text-[0.8125rem] tabular-nums sm:text-sm">
          {VENUES.map((venue) => {
            const q = quotes[venue];
            const isFresh = fresh.has(venue);
            const off = bps(q.mid - median, median);
            const outlier = index.status === "divergent" && isFresh && Math.abs(off) * 2 > SIM_RULES.maxDivergenceBps;
            const tone = !isFresh ? "text-amber" : outlier ? "text-alarm" : "text-glow";
            return (
              <li
                key={venue}
                className={`grid grid-cols-[1fr_auto_4.5rem_4.25rem] items-center gap-x-3 border-t border-line px-4 py-2.5 transition-opacity duration-300 sm:grid-cols-[1fr_auto_5rem_5.5rem_4.5rem] sm:px-5 ${
                  isFresh ? "" : "opacity-50"
                }`}
              >
                <span className="text-fg">{VENUE_NAMES[venue]}</span>
                <span className={`text-right ${outlier ? "text-alarm" : "text-fg"}`}>{formatCents(q.mid)}</span>
                <span className={`text-right ${isFresh ? "text-fg-2" : "text-amber"}`}>
                  {groupThousands(now - q.ts)}
                  <span className="text-fg-3"> ms</span>
                </span>
                <span className={`hidden text-right sm:block ${outlier ? "text-alarm" : "text-fg-2"}`}>
                  {isFresh ? `${off >= 0 ? "+" : "−"}${Math.abs(off).toFixed(1)}` : "—"}
                </span>
                <span className={`flex items-center justify-end gap-1.5 text-xs ${tone}`}>
                  <span
                    className={`size-1.5 rounded-full ${!isFresh ? "border border-amber" : outlier ? "bg-alarm" : "bg-glow"}`}
                  />
                  {!isFresh ? "stale" : outlier ? "apart" : "fresh"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line px-4 pt-7 pb-3 sm:px-5">
          <div className="relative">
            {VENUES.map((venue) => {
              const isFresh = fresh.has(venue);
              const x = at(quotes[venue].mid);
              return (
                <div key={venue} className="grid h-6 grid-cols-[2.25rem_1fr] items-center gap-2">
                  <span className={`text-[0.625rem] tracking-[0.12em] uppercase ${isFresh ? "text-fg-2" : "text-fg-3"}`}>
                    {venue.slice(0, 3)}
                  </span>
                  <div className="relative h-px bg-line-2">
                    <span
                      className={`absolute top-0 size-2.5 -translate-1/2 rounded-full transition-[left] duration-200 ease-out ${
                        !isFresh
                          ? "border border-fg-3 bg-ink"
                          : broken
                            ? "bg-alarm shadow-[0_0_10px_var(--color-alarm)]"
                            : "bg-fg"
                      }`}
                      style={{ left: `${x}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pointer-events-none absolute inset-y-0 right-0 left-[2.75rem]">
              {index.status === "price" && (
                <div
                  className="absolute -top-4 -bottom-1 w-px bg-glow shadow-[0_0_10px_var(--color-glow)] transition-[left] duration-200 ease-out"
                  style={{ left: `${at(index.mid)}%` }}
                >
                  <span className="absolute -top-1 left-1.5 text-[0.625rem] leading-none tracking-[0.14em] text-glow uppercase">
                    median
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-[2.25rem_1fr] gap-2">
            <span />
            <div className="relative h-4">
              {lo !== undefined && hi !== undefined && (
                <div
                  className={`absolute top-1.5 h-1 rounded-full transition-all duration-200 ease-out ${broken ? "bg-alarm/70" : "bg-glow/50"}`}
                  style={{ left: `${at(lo)}%`, width: `${Math.max(0.8, at(hi) - at(lo))}%` }}
                />
              )}
            </div>
          </div>
          <div className="mt-1 flex justify-between gap-3 pl-[2.75rem] text-[0.6875rem] text-fg-3">
            <span>±{Math.round(view.half)} bps</span>
            <span className={broken ? "text-alarm" : "text-fg-2"}>
              {index.status === "stale"
                ? `${index.used.length} of ${index.needed} quotes fresh`
                : `spread ${index.divergenceBps} bps · limit ${SIM_RULES.maxDivergenceBps}`}
            </span>
          </div>
        </div>

        <div className="border-t border-line px-4 pt-5 pb-4 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className={`text-[0.6875rem] tracking-[0.16em] uppercase ${broken ? "text-alarm" : "text-fg-3"}`}>
              {index.status === "price" ? `Index · median of ${index.used.length}` : "Index · no price"}
            </span>
            <span className="text-[0.6875rem] text-fg-3">t+{(now / 1000).toFixed(2)}s</span>
          </div>
          <div
            className={`mt-2 text-[2.25rem] leading-none font-medium tracking-[-0.03em] tabular-nums sm:text-[2.75rem] ${
              broken ? "text-alarm" : "glow"
            }`}
          >
            {index.status === "price" ? formatCents(index.mid) : "no price"}
          </div>
          <p className="mt-2.5 min-h-[1.25rem] text-xs text-fg-2">
            {index.status === "price" &&
              (stale.length
                ? `${stale.map((v) => VENUE_NAMES[v]).join(", ")} stale and left out. The index runs on the rest.`
                : "Every venue fresh and within the limit.")}
            {index.status === "divergent" &&
              `Venues ${index.divergenceBps} bps apart, past the ${SIM_RULES.maxDivergenceBps} bps limit. Nothing fills.`}
            {index.status === "stale" && `Too few fresh quotes. Nothing fills.`}
          </p>
          <Sparkline history={frame.history} />
        </div>
      </div>

      <div className="border-t border-line px-4 py-3 text-[0.6875rem] leading-relaxed text-fg-3 sm:px-5">
        Simulated quotes, seed {SIM_SEED}. Rules: quotes at most {groupThousands(SIM_RULES.maxAgeMs)} ms old, at least{" "}
        {SIM_RULES.minSources} venues, spread at most {SIM_RULES.maxDivergenceBps} bps.
      </div>
    </div>
  );
}

/** The index over recent ticks, with no-price stretches shaded. */
function Sparkline({ history }: { history: (number | null)[] }) {
  const w = SIM_HISTORY - 1;
  const h = 40;
  const prices = history.filter((p): p is number => p !== null);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max(500, (max - min) * 0.2);
  const offset = SIM_HISTORY - history.length;
  const y = (p: number) => h - ((p - min + pad) / (max - min + 2 * pad)) * h;

  const segments: { start: number; points: string }[] = [];
  const gaps: [number, number][] = [];
  let current: string[] = [];
  let start = 0;
  history.forEach((p, i) => {
    const x = i + offset;
    if (p === null) {
      if (current.length) segments.push({ start, points: current.join(" ") });
      current = [];
      const last = gaps[gaps.length - 1];
      if (last && last[1] === x - 1) last[1] = x;
      else gaps.push([x, x]);
    } else {
      if (!current.length) start = x;
      current.push(`${x},${y(p).toFixed(2)}`);
    }
  });
  if (current.length) segments.push({ start, points: current.join(" ") });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-4 block h-10 w-full overflow-visible">
      <line x1={0} x2={w} y1={h} y2={h} className="stroke-line-2" vectorEffect="non-scaling-stroke" />
      {gaps.map(([a, b]) => (
        <rect key={a} x={a - 0.5} y={0} width={b - a + 1} height={h} className="fill-alarm/20" />
      ))}
      {segments.map(({ start: s, points }) => (
        <polyline
          key={s}
          points={points}
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="stroke-glow"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
