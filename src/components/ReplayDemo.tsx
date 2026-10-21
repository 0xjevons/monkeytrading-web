"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { shortHex } from "@/lib/format";
import { describeCommand, replay, type ReplayResult } from "@/lib/replay";
import { DEMO_LOG, TAMPERS, tamperLog } from "@/lib/replay-log";

import { useMotion } from "./motion";

const STEP_MS = 170;

export function ReplayDemo() {
  const [tamperId, setTamperId] = useState<string>("none");
  const [run, setRun] = useState<{ result: ReplayResult; shown: number } | null>(null);
  const [motion] = useMotion();
  const groupName = useId();

  const tamper = TAMPERS.find((t) => t.id === tamperId) ?? null;
  const log = useMemo(() => (tamper ? tamperLog(DEMO_LOG, tamper) : [...DEMO_LOG]), [tamper]);

  const total = run?.result.steps.length ?? 0;
  const done = run !== null && run.shown >= total;

  useEffect(() => {
    if (!run || run.shown >= run.result.steps.length) return;
    const timer = window.setTimeout(() => setRun({ ...run, shown: run.shown + 1 }), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [run]);

  const start = () => {
    const result = replay(log);
    setRun({ result, shown: motion ? 0 : result.steps.length });
  };

  const choose = (id: string) => {
    setTamperId(id);
    setRun(null);
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
            1 · Tamper with the log, or don&apos;t
          </legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: "none", label: "Leave it as published" }, ...TAMPERS].map((option) => (
              <label
                key={option.id}
                className="cursor-pointer rounded border border-line-2 px-2.5 py-1.5 text-xs text-fg-2 transition-colors hover:border-edge hover:text-fg has-checked:border-glow/70 has-checked:bg-glow/10 has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-glow"
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={tamperId === option.id}
                  onChange={() => choose(option.id)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex shrink-0 flex-col gap-2.5">
          <span className="text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">2 · Replay it</span>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center justify-center gap-2 rounded bg-glow px-4 py-2 text-sm font-medium text-ink shadow-[0_0_24px_-4px_var(--color-glow)] transition hover:bg-[#8affc0]"
          >
            <span aria-hidden="true">▶</span>
            {run === null ? "Replay the log" : "Replay again"}
          </button>
        </div>
      </div>

      {tamper && (
        <p className="border-b border-line bg-alarm/[0.06] px-4 py-2.5 text-xs text-fg-2 sm:px-5">
          <span className="text-alarm">Edited seq {tamper.seq}:</span> {tamper.change}. The published roots are
          untouched.
        </p>
      )}

      <div
        aria-hidden="true"
        className="hidden grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)_8.5rem_1rem] gap-x-3 border-b border-line px-5 py-2 text-[0.625rem] tracking-[0.16em] text-fg-3 uppercase md:grid"
      >
        <span>Seq</span>
        <span>Command</span>
        <span>Replayed</span>
        <span className="text-right">Published root</span>
        <span />
      </div>
      <ol className="divide-y divide-line text-xs" aria-label="Published log">
        {log.map((entry, i) => {
          const step = run && i < run.shown ? run.result.steps[i] : undefined;
          const unreached = run !== null && done && i >= total;
          const edited = tamper?.seq === entry.seq;
          return (
            <li
              key={entry.seq}
              className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5 md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)_8.5rem_1rem] md:items-center ${
                unreached ? "opacity-40" : ""
              } ${step && !step.matches ? "bg-alarm/[0.08]" : ""}`}
            >
              <span className="text-fg-3 tabular-nums">
                <span className="sr-only">seq </span>
                {String(entry.seq).padStart(2, "0")}
              </span>
              <span className={`min-w-0 break-words ${edited ? "text-alarm" : "text-fg"}`}>
                {describeCommand(entry.command)}
                {edited && <span className="ml-2 rounded-sm border border-alarm/50 px-1 text-[0.625rem] uppercase">edited</span>}
              </span>
              <span className={`col-start-2 min-w-0 truncate text-fg-2 md:col-auto ${step || unreached ? "" : "hidden md:inline"}`}>
                {step ? (
                  <>
                    <span className="sr-only">result: </span>→ {step.event}
                  </>
                ) : (
                  <span className="text-fg-3">{unreached ? "not reached" : "·"}</span>
                )}
              </span>
              <div className="col-start-2 flex items-start justify-between gap-3 md:contents">
                <span className="tabular-nums md:text-right">
                  <span className="text-fg-3">
                    <span className="sr-only">published root </span>
                    {shortHex(entry.root)}
                  </span>
                  {step && !step.matches && (
                    <span className="block text-alarm">
                      <span className="sr-only">replay gives </span>
                      {shortHex(step.root)}
                    </span>
                  )}
                </span>
                <span className="md:text-right">
                  {step &&
                    (step.matches ? (
                      <span className="text-glow">
                        ✓<span className="sr-only"> root matches</span>
                      </span>
                    ) : (
                      <span className="text-alarm">
                        ✗<span className="sr-only"> root differs</span>
                      </span>
                    ))}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="border-t border-line px-4 py-4 text-sm sm:px-5">
        {!run && (
          <p className="text-fg-2">
            {DEMO_LOG.length} commands, {DEMO_LOG.length} published roots. Press replay to recompute them in your
            browser.
          </p>
        )}
        {run && !done && <p className="text-fg-2">Replaying…</p>}
        {run && done && run.result.ok && (
          <p className="text-fg">
            <span className="glow">✓ All {total} roots match.</span>{" "}
            <span className="text-fg-2">The same log under the same rules reaches the same state, on any machine.</span>
          </p>
        )}
        {run && done && !run.result.ok && (
          <div className="space-y-2">
            <p className="text-alarm">✗ Root diverges at seq {run.result.divergedAt}. The replay stops there.</p>
            <p className="font-mono text-xs break-all text-fg-2">{run.result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
