"use client";

/** The simulated public log: sequenced commands with their running roots and signed checkpoints. */

import { useState } from "react";

import { groupThousands, shortHex } from "@/lib/format";
import { SEED } from "@/lib/prng";
import { createTape, TAPE_FIRST_SEQ, TAPE_ROWS, TAPE_STEP_MS, tapeWindow, type TapeEntry } from "@/lib/tape";

import { MotionToggle, useMotion, useTicker } from "./motion";

/** The log panel; a new command arrives every `TAPE_STEP_MS` while motion is on. */
export function Tape() {
  // The tape and its first rows come from one initializer, so a discarded StrictMode call advances
  // only its own tape.
  const [{ tape, initial }] = useState(() => {
    const fresh = createTape(SEED, TAPE_FIRST_SEQ);
    return { tape: fresh, initial: tapeWindow(fresh, TAPE_ROWS) };
  });
  const [state, setState] = useState(() => ({ entries: initial, added: 0 }));
  const [motion, setMotion] = useMotion();
  const ref = useTicker<HTMLDivElement>(TAPE_STEP_MS, motion, () => {
    const next = tape.next();
    setState((s) => ({ entries: [...s.entries, ...next].slice(-TAPE_ROWS), added: next.length }));
  });

  const last = state.entries[state.entries.length - 1];
  const shift = state.added === 2 ? "animate-tape-shift-2" : state.added === 1 ? "animate-tape-shift-1" : "";

  return (
    <div ref={ref} className="panel scanlines @container overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 @[30rem]:px-5">
        <div className="flex min-w-0 items-center gap-2.5 text-xs tracking-caps uppercase">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full bg-glow ${motion ? "animate-pulse-dot" : ""}`} />
          <span className="text-fg">Public log</span>
          <span className="hidden truncate text-fg-3 @[30rem]:inline">· seq {last ? groupThousands(last.seq) : "—"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 text-label tracking-label text-amber uppercase">
            Command history
          </span>
          <MotionToggle enabled={motion} onChange={setMotion} />
        </div>
      </div>
      <p className="sr-only">
        A public log of sequenced price updates, orders, and deposits, each with its running root, and a signed
        checkpoint every twelve commands.
      </p>
      <div
        aria-hidden="true"
        className="relative h-[calc(var(--rows)*var(--row))] overflow-hidden [--row:3.25rem] [--rows:9] @[46rem]:[--row:2.25rem] @[46rem]:[--rows:13]"
      >
        <ol key={last ? `${last.kind}-${last.seq}` : "empty"} className={`absolute inset-x-0 bottom-0 ${shift}`}>
          {state.entries.map((entry, i) => (
            <TapeRow key={`${entry.kind}-${entry.seq}`} entry={entry} fresh={i >= state.entries.length - state.added} />
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * One line of the log: a command with its result and root, or a checkpoint. Below 46rem of panel
 * width a line takes two rows.
 */
function TapeRow({ entry, fresh }: { entry: TapeEntry; fresh: boolean }) {
  // A new row slides in while a tint over it fades: transform and opacity only.
  const enter = fresh
    ? "relative animate-row-in before:pointer-events-none before:absolute before:inset-0 before:bg-glow/14 before:opacity-0 before:animate-row-flash"
    : "";
  if (entry.kind === "checkpoint") {
    return (
      <li
        className={`grid h-(--row) grid-cols-[3rem_minmax(0,1fr)] content-center gap-x-3 gap-y-0.5 border-y border-glow/25 bg-glow/6 px-4 text-xs @[30rem]:px-5 @[46rem]:grid-cols-[4.5rem_auto_minmax(0,1fr)_auto] ${enter}`}
      >
        <span className="text-fg-2 tabular-nums">{groupThousands(entry.seq)}</span>
        <span className="text-glow">◆ CHECKPOINT</span>
        <span className="col-start-2 truncate text-fg @[46rem]:col-auto">state root {shortHex(entry.root, 10, 8)}</span>
        <span className="hidden text-glow @[46rem]:inline">signed</span>
      </li>
    );
  }
  const typeColour = entry.type === "PRICES" ? "text-fg-2" : entry.type === "ORDER" ? "text-glow" : "text-amber";
  return (
    <li
      className={`grid h-(--row) grid-cols-[3rem_3.5rem_minmax(0,1fr)] content-center gap-x-3 gap-y-0.5 px-4 text-xs @[30rem]:px-5 @[46rem]:grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_minmax(0,12rem)_8rem] ${enter}`}
    >
      <span className="text-fg-3 tabular-nums">{groupThousands(entry.seq)}</span>
      <span className={typeColour}>{entry.type}</span>
      <span className="truncate text-fg">{entry.detail}</span>
      <span className={`col-start-2 col-end-4 truncate @[46rem]:col-auto ${entry.refused ? "text-alarm" : "text-fg-2"}`}>
        → {entry.result}
      </span>
      <span className="hidden text-right text-fg-3 tabular-nums @[46rem]:inline">{shortHex(entry.root)}</span>
    </li>
  );
}
