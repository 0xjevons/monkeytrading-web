"use client";

import { useState } from "react";

import { groupThousands, shortHex } from "@/lib/format";
import { createTape, type TapeEntry } from "@/lib/tape";

import { MotionToggle, useMotion, useTicker } from "./motion";

const SEED = 1871;
const FIRST_SEQ = 48_201;
const ROWS = 13;
const STEP_MS = 1100;

function fill(tape: ReturnType<typeof createTape>, rows: number): TapeEntry[] {
  const entries: TapeEntry[] = [];
  while (entries.length < rows) entries.push(...tape.next());
  return entries.slice(-rows);
}

export function Tape() {
  const [tape] = useState(() => createTape(SEED, FIRST_SEQ));
  const [state, setState] = useState(() => ({ entries: fill(tape, ROWS), added: 0 }));
  const [motion, setMotion] = useMotion();
  const ref = useTicker<HTMLDivElement>(STEP_MS, motion, () => {
    const next = tape.next();
    setState((s) => ({ entries: [...s.entries, ...next].slice(-ROWS), added: next.length }));
  });

  const last = state.entries[state.entries.length - 1];

  return (
    <div ref={ref} className="panel scanlines overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5 text-xs tracking-[0.12em] uppercase">
          <span aria-hidden="true" className="size-2 rounded-full bg-glow animate-pulse-dot" />
          <span className="text-fg">Public log</span>
          <span className="hidden text-fg-3 sm:inline">· seq {last ? groupThousands(last.seq) : "—"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-sm border border-amber/40 px-1.5 py-0.5 text-[0.625rem] tracking-[0.16em] text-amber uppercase">
            Simulation
          </span>
          <MotionToggle enabled={motion} onChange={setMotion} />
        </div>
      </div>
      <p className="sr-only">
        A simulated public log: sequenced price updates, orders, and deposits, each with its running root, and a signed
        checkpoint every twelve commands.
      </p>
      <div
        aria-hidden="true"
        className="fade-top relative h-[calc(var(--rows)*var(--row))] overflow-hidden [--row:3.25rem] [--rows:9] sm:[--row:2.25rem] sm:[--rows:13]"
      >
        <ol
          key={last ? `${last.kind}-${last.seq}` : "empty"}
          className="absolute inset-x-0 bottom-0 animate-tape-shift"
          style={{ ["--shift" as string]: `calc(${state.added} * var(--row))` }}
        >
          {state.entries.map((entry, i) => (
            <TapeRow key={`${entry.kind}-${entry.seq}`} entry={entry} fresh={i >= state.entries.length - state.added} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function TapeRow({ entry, fresh }: { entry: TapeEntry; fresh: boolean }) {
  const enter = fresh ? "animate-row-in" : "";
  if (entry.kind === "checkpoint") {
    return (
      <li
        className={`grid h-(--row) grid-cols-[3.75rem_minmax(0,1fr)] content-center gap-x-3 gap-y-0.5 border-y border-glow/25 bg-glow/[0.06] px-4 text-xs sm:grid-cols-[5rem_auto_minmax(0,1fr)_auto] sm:px-5 ${enter}`}
      >
        <span className="text-fg-2 tabular-nums">{groupThousands(entry.seq)}</span>
        <span className="text-glow">◆ CHECKPOINT</span>
        <span className="col-start-2 truncate text-fg sm:col-auto">state root {shortHex(entry.root, 10, 8)}</span>
        <span className="hidden text-glow sm:inline">signed</span>
      </li>
    );
  }
  const typeColour = entry.type === "PRICES" ? "text-fg-2" : entry.type === "ORDER" ? "text-glow" : "text-amber";
  return (
    <li
      className={`grid h-(--row) grid-cols-[3.75rem_4rem_minmax(0,1fr)] content-center gap-x-3 gap-y-0.5 px-4 text-xs sm:grid-cols-[5rem_4.5rem_minmax(0,1fr)_minmax(0,13rem)_8.5rem] sm:px-5 ${enter}`}
    >
      <span className="text-fg-3 tabular-nums">{groupThousands(entry.seq)}</span>
      <span className={typeColour}>{entry.type}</span>
      <span className="truncate text-fg">{entry.detail}</span>
      <span className={`col-start-2 col-end-4 truncate sm:col-auto ${entry.refused ? "text-alarm" : "text-fg-2"}`}>
        → {entry.result}
      </span>
      <span className="hidden text-right text-fg-3 tabular-nums sm:inline">{shortHex(entry.root)}</span>
    </li>
  );
}
