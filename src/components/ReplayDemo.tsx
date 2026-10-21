"use client";

/** The replay demo: tamper with a published log, replay it in the browser, and see where it diverges. */

import { useEffect, useId, useState } from "react";

import { shortHex } from "@/lib/format";
import { describeCommand, replay, type ReplayResult, type ReplayStep } from "@/lib/replay";
import { DEMO_LOG, TAMPERS, tamperLog } from "@/lib/replay-log";

import { useMotion } from "./motion";

const STEP_MS = 170;
const COLUMNS = "@[44rem]:grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)_8.5rem_1rem]";

/**
 * The demo panel. With motion on, a replay reveals one step every `STEP_MS`; with motion off it
 * shows every step at once, and pausing mid-run shows the rest.
 */
export function ReplayDemo() {
  const [tamperId, setTamperId] = useState("none");
  const [run, setRun] = useState<{ result: ReplayResult; revealed: number } | null>(null);
  const [motion] = useMotion();
  const groupName = useId();

  const tamper = TAMPERS.find((t) => t.id === tamperId) ?? null;
  const log = tamper ? tamperLog(DEMO_LOG, tamper) : DEMO_LOG;
  const total = run?.result.steps.length ?? 0;
  // Pausing mid-run finishes the reveal; it stays finished if motion comes back on.
  if (run && !motion && run.revealed < total) setRun({ ...run, revealed: total });
  const shown = run?.revealed ?? 0;
  const done = run !== null && shown >= total;

  useEffect(() => {
    if (!run || !motion || run.revealed >= run.result.steps.length) return;
    const timer = window.setTimeout(() => setRun({ ...run, revealed: run.revealed + 1 }), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [run, motion]);

  const start = () => {
    const result = replay(log);
    setRun({ result, revealed: motion ? 0 : result.steps.length });
  };

  const choose = (id: string) => {
    setTamperId(id);
    setRun(null);
  };

  return (
    <div className="panel @container overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-4 py-4 @[30rem]:px-5 @[44rem]:flex-row @[44rem]:items-end @[44rem]:justify-between">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-caption tracking-label text-fg-3 uppercase">
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
          <span className="text-caption tracking-label text-fg-3 uppercase">2 · Replay it</span>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center justify-center gap-2 rounded bg-glow px-4 py-2 text-sm font-medium text-ink shadow-glow transition-colors hover:bg-glow-hover"
          >
            <span aria-hidden="true">▶</span>
            {run === null ? "Replay the log" : "Replay again"}
          </button>
        </div>
      </div>

      {tamper && (
        <p className="border-b border-line bg-alarm/6 px-4 py-2.5 text-xs text-fg-2 @[30rem]:px-5">
          <span className="text-alarm">Edited seq {tamper.seq}:</span> {tamper.change}. The published roots are
          untouched.
        </p>
      )}

      <div
        aria-hidden="true"
        className={`hidden gap-x-3 border-b border-line px-5 py-2 text-label tracking-label text-fg-3 uppercase @[44rem]:grid ${COLUMNS}`}
      >
        <span>Seq</span>
        <span>Command</span>
        <span>Replayed</span>
        <span className="text-right">Published root</span>
        <span />
      </div>
      <ol className="divide-y divide-line text-xs" aria-label="Published log">
        {log.map((entry, i) => {
          const step = i < shown ? run?.result.steps[i] : undefined;
          const refused = done && run?.result.ok === false && run.result.kind === "refused" && run.result.divergedAt === entry.seq;
          const unreached = done && !refused && i >= total;
          const edited = tamper?.seq === entry.seq;
          return (
            <li
              key={entry.seq}
              className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-2.5 @[30rem]:px-5 @[44rem]:items-center ${COLUMNS} ${
                (step && !step.matches) || refused ? "bg-alarm/8" : ""
              }`}
            >
              <span className="text-fg-3 tabular-nums">
                <span className="sr-only">seq </span>
                {String(entry.seq).padStart(2, "0")}
              </span>
              <span className={`min-w-0 break-words ${edited ? "text-alarm" : unreached ? "text-fg-3" : "text-fg"}`}>
                {describeCommand(entry.command)}
                {edited && (
                  <span className="ml-2 rounded-sm border border-alarm/50 px-1 text-label uppercase">edited</span>
                )}
              </span>
              <Outcome step={step} refused={refused ? run?.result : undefined} unreached={unreached} />
              <div className="col-start-2 flex items-start justify-between gap-3 @[44rem]:contents">
                <span className="tabular-nums @[44rem]:text-right">
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
                <span className="@[44rem]:text-right">
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

      <div aria-live="polite" className="border-t border-line px-4 py-4 text-sm @[30rem]:px-5">
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
            <p className="text-alarm">
              ✗ {run.result.kind === "mismatch" ? "Root diverges" : "Replay refused"} at seq {run.result.divergedAt}. The
              replay stops there.
            </p>
            <p className="text-xs break-all text-fg-2">{run.result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** A row's replayed outcome: the event, the refusal, or that the replay never reached it. */
function Outcome({
  step,
  refused,
  unreached,
}: {
  step: ReplayStep | undefined;
  /** The failed replay, when it stopped on this row's command. */
  refused: ReplayResult | undefined;
  unreached: boolean;
}) {
  const text = step ? `→ ${step.event}` : refused && !refused.ok ? refused.message : unreached ? "not reached" : "·";
  const tone = refused ? "text-alarm" : step ? "text-fg-2" : "text-fg-3";
  const visible = step || refused || unreached ? "" : "hidden @[44rem]:inline";
  return (
    <span className={`col-start-2 min-w-0 truncate @[44rem]:col-auto ${tone} ${visible}`}>
      {step && <span className="sr-only">result: </span>}
      {text}
    </span>
  );
}
