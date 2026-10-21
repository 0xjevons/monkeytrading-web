"use client";

/** The hero's simulated BTC-USD index: three venues, the median between them, and when there is none. */

import { useState, type ReactNode } from "react";

import { formatCents, formatFixed, formatSigned, groupThousands } from "@/lib/format";
import { freshRange, initialView, linePosition, nextView, sparkline, venueRows } from "@/lib/index-view";
import {
  createIndexSim,
  SIM_HISTORY,
  SIM_RULES,
  SIM_TICK_MS,
  VENUE_NAMES,
  VENUES,
  type IndexOutcome,
} from "@/lib/price-index";
import { SEED } from "@/lib/prng";
import { unreachable } from "@/lib/unreachable";

import { MotionToggle, useMotion, useTicker } from "./motion";

const GRID = "grid grid-cols-[1fr_auto_4.25rem_auto] gap-x-3 @[30rem]:grid-cols-[1fr_auto_5rem_6rem_4.5rem]";

/** The panel: a venue table, the number line, the index with its history, and a pause control. */
export function IndexPanel() {
  const [sim] = useState(() => createIndexSim(SEED));
  const [{ frame, view }, setState] = useState(() => ({ frame: sim.initial, view: initialView(sim.initial) }));
  const [motion, setMotion] = useMotion();
  const ref = useTicker<HTMLDivElement>(SIM_TICK_MS, motion, () => {
    const next = sim.step();
    setState((s) => ({ frame: next, view: nextView(s.view, next) }));
  });

  const { index, quotes, now } = frame;
  const rows = venueRows(frame);
  const range = freshRange(frame);
  const at = (mid: number) => linePosition(view, mid);
  const broken = index.status !== "price";

  return (
    <div ref={ref} className="panel scanlines @container overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 @[30rem]:px-5">
        <div className="flex min-w-0 items-center gap-2.5 text-xs tracking-caps uppercase">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${broken ? "bg-alarm" : "bg-glow"} ${motion && !broken ? "animate-pulse-dot" : ""}`}
          />
          <span className="truncate text-fg">BTC-USD index</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 text-label tracking-label text-amber uppercase">
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
        <div className={`${GRID} px-4 pt-3 pb-1 text-label tracking-label text-fg-3 uppercase @[30rem]:px-5`}>
          <span>Venue</span>
          <span className="text-right">Quote</span>
          <span className="text-right">Age</span>
          <span className="hidden text-right @[30rem]:block">vs median</span>
          <span className="text-right">State</span>
        </div>
        <ul className="text-data tabular-nums @[30rem]:text-sm">
          {rows.map(({ venue, fresh, offsetTenthBps, apart }) => (
            <li key={venue} className={`${GRID} items-center border-t border-line px-4 py-2.5 @[30rem]:px-5`}>
              <span className={fresh ? "text-fg" : "text-fg-3"}>{VENUE_NAMES[venue]}</span>
              <span className={`text-right ${apart ? "text-alarm" : fresh ? "text-fg" : "text-fg-3"}`}>
                {formatCents(quotes[venue].mid)}
              </span>
              <span className={`text-right ${fresh ? "text-fg-2" : "text-amber"}`}>
                {groupThousands(now - quotes[venue].ts)}
                <span className={fresh ? "text-fg-3" : "text-amber"}> ms</span>
              </span>
              <span className={`hidden text-right @[30rem]:block ${apart ? "text-alarm" : "text-fg-2"}`}>
                {offsetTenthBps === null ? (
                  "—"
                ) : (
                  <>
                    {formatSigned(offsetTenthBps, 1)}
                    <span className="text-fg-3"> bps</span>
                  </>
                )}
              </span>
              <span
                className={`flex items-center justify-end gap-1.5 text-xs ${!fresh ? "text-amber" : apart ? "text-alarm" : "text-glow"}`}
              >
                <span
                  className={`size-1.5 rounded-full ${!fresh ? "border border-amber" : apart ? "bg-alarm" : "bg-glow"}`}
                />
                <span className="hidden @[21rem]:inline">{!fresh ? "stale" : apart ? "apart" : "fresh"}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-4 pt-7 pb-3 @[30rem]:px-5">
          <div className="relative">
            {rows.map(({ venue, fresh }) => (
              <div key={venue} className="grid h-6 grid-cols-[2.25rem_1fr] items-center gap-2">
                <span className={`text-label tracking-caps uppercase ${fresh ? "text-fg-2" : "text-fg-3"}`}>
                  {venue.slice(0, 3)}
                </span>
                <div className="relative h-px bg-line-2">
                  <Slide at={at(quotes[venue].mid)}>
                    <span
                      className={`absolute top-0 left-0 size-2.5 -translate-1/2 rounded-full ${
                        !fresh ? "border border-fg-3 bg-ink" : broken ? "bg-alarm shadow-[0_0_10px_var(--color-alarm)]" : "bg-fg"
                      }`}
                    />
                  </Slide>
                </div>
              </div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 right-0 left-[2.75rem]">
              {index.status === "price" && (
                <Slide at={at(index.mid)}>
                  <div className="absolute -top-4 -bottom-1 left-0 w-px bg-glow shadow-[0_0_10px_var(--color-glow)]">
                    <span className="absolute -top-1 left-1.5 text-label leading-none tracking-caps text-glow uppercase">
                      median
                    </span>
                  </div>
                </Slide>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-[2.25rem_1fr] gap-2">
            <span />
            <div className="relative h-4">
              {range !== null && (
                <div
                  className={`absolute inset-x-0 top-1.5 h-1 origin-left transition-transform duration-200 ease-out ${broken ? "bg-alarm/70" : "bg-glow/50"}`}
                  style={{
                    transform: `translateX(${at(range.low)}%) scaleX(${Math.max(0.8, at(range.high) - at(range.low)) / 100})`,
                  }}
                />
              )}
            </div>
          </div>
          <div className="mt-1 flex justify-between gap-3 pl-[2.75rem] text-caption text-fg-3">
            <span>±{Math.round(view.halfBps)} bps</span>
            <span className={broken ? "text-alarm" : "text-fg-2"}>
              {index.status === "stale"
                ? `${index.used.length} of ${index.needed} quotes fresh`
                : `${index.divergenceBps} bps apart · limit ${SIM_RULES.maxDivergenceBps}`}
            </span>
          </div>
        </div>

        <div className="border-t border-line px-4 pt-5 pb-4 @[30rem]:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className={`text-caption tracking-label uppercase ${broken ? "text-alarm" : "text-fg-3"}`}>
              {index.status === "price" ? `Index · median of ${index.used.length}` : "Index · no price"}
            </span>
            <span className="text-caption text-fg-3">t+{formatFixed(Math.trunc(now / 10), 2)}s</span>
          </div>
          <div
            className={`mt-2 text-[2.25rem] leading-none font-medium tracking-tight tabular-nums @[30rem]:text-[2.75rem] ${
              broken ? "text-alarm" : "glow"
            }`}
          >
            {index.status === "price" ? formatCents(index.mid) : "no price"}
          </div>
          <p className="mt-2.5 min-h-10 text-xs text-fg-2 @[30rem]:min-h-5">{indexNote(index)}</p>
          <Sparkline history={frame.history} />
        </div>
      </div>

      <div className="border-t border-line px-4 py-3 text-caption leading-relaxed text-fg-3 @[30rem]:px-5">
        Simulated quotes, seed {SEED}. Rules: quotes at most {groupThousands(SIM_RULES.maxAgeMs)} ms old, at least{" "}
        {SIM_RULES.minSources} venues, at most {SIM_RULES.maxDivergenceBps} bps apart.
      </div>
    </div>
  );
}

/**
 * The line under the index that says why it has, or has no, price.
 * Error cases:
 * - an index status outside `IndexOutcome`
 */
function indexNote(index: IndexOutcome): string {
  const stale = VENUES.filter((v) => !index.used.includes(v)).map((v) => VENUE_NAMES[v]);
  switch (index.status) {
    case "price":
      return stale.length > 0
        ? `${stale.join(", ")} stale and left out. The index runs on the rest.`
        : "Every venue fresh and within the limit.";
    case "divergent":
      return `Venues ${index.divergenceBps} bps apart, past the ${SIM_RULES.maxDivergenceBps} bps limit. Nothing fills.`;
    case "stale":
      return "Too few fresh quotes. Nothing fills.";
    default:
      return unreachable(index, "indexNote");
  }
}

/**
 * Moves its children `at` percent along the line beneath it with a transform, so only the
 * compositor works on each tick.
 */
function Slide({ at, children }: { at: number; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 transition-transform duration-200 ease-out"
      style={{ transform: `translateX(${at}%)` }}
    >
      {children}
    </div>
  );
}

/** The index over recent ticks, with the stretches that had no price shaded. */
function Sparkline({ history }: { history: (number | null)[] }) {
  const height = 40;
  const { segments, gaps } = sparkline(history, SIM_HISTORY, height);
  return (
    <svg viewBox={`0 0 ${SIM_HISTORY - 1} ${height}`} preserveAspectRatio="none" className="mt-4 block h-10 w-full overflow-visible">
      <line x1={0} x2={SIM_HISTORY - 1} y1={height} y2={height} className="stroke-line-2" vectorEffect="non-scaling-stroke" />
      {gaps.map(([first, last]) => (
        <rect key={first} x={first - 0.5} y={0} width={last - first + 1} height={height} className="fill-alarm/20" />
      ))}
      {segments.map(({ start, points }) => (
        <polyline
          key={start}
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
