"use client";

/** The shell: a labelled prompt that reads a few commands and prints the house's answers. */

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { MAX_INPUT, recall, runShell, type Line, type Recall, type Tone } from "@/lib/shell";

const PROMPT_HOST = "guest@house:";
const PROMPT_PATH = "~$";
const PROMPT = `${PROMPT_HOST}${PROMPT_PATH}`;
const MAX_LINES = 60;

const TONES: Record<Tone, string> = {
  fg: "text-fg",
  muted: "text-fg-2",
  glow: "text-glow",
  alarm: "text-alarm",
};

interface Entry {
  id: number;
  line: Line;
}

const WELCOME: Line[] = [
  { tone: "glow", parts: ["monkeytrading shell. Nothing typed here leaves your browser."] },
  { tone: "muted", parts: ["Try help, rules, replay, or join."] },
];

/** The shell panel: output above, a labelled input below, with Up and Down to recall earlier lines. */
export function Terminal() {
  const inputId = useId();
  const [input, setInput] = useState<Recall>({ cursor: null, draft: "", value: "" });
  const [entries, setEntries] = useState<Entry[]>(() => WELCOME.map((line, id) => ({ id, line })));
  const [history, setHistory] = useState<string[]>([]);
  const nextId = useRef(WELCOME.length);
  const output = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = output.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const typed = input.value;
    const result = runShell(typed);
    const echo: Line = { tone: "muted", parts: [`${PROMPT} ${typed}`] };
    const fresh = [echo, ...result.lines].map((line) => ({ id: nextId.current++, line }));
    setEntries((prev) => (result.clear ? [] : [...prev, ...fresh].slice(-MAX_LINES)));
    if (typed.trim()) setHistory((prev) => [...prev, typed].slice(-30));
    setInput({ cursor: null, draft: "", value: "" });
    if (result.goto) {
      const target = document.getElementById(result.goto);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const next = recall(history, input, event.key === "ArrowUp" ? "up" : "down");
    if (next === null) return;
    event.preventDefault();
    setInput(next);
  };

  return (
    <div className="panel scanlines @container overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs tracking-caps uppercase @[30rem]:px-5">
        <span className="text-fg">Shell</span>
        <span className="text-fg-3">read-only</span>
      </div>
      <div
        ref={output}
        // Focusable, so the keyboard can scroll it where the browser does not make scrollers focusable.
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-label="Shell output"
        className="h-52 overflow-y-auto px-4 py-4 text-data leading-relaxed @[30rem]:h-64 @[30rem]:px-5"
      >
        {entries.map(({ id, line }) => (
          <p key={id} className={`whitespace-pre-wrap break-words ${TONES[line.tone]}`}>
            {line.parts.map((part, i) =>
              typeof part === "string" ? (
                <span key={i}>{part}</span>
              ) : (
                <a
                  key={i}
                  href={part.href}
                  className="text-glow underline decoration-glow/40 underline-offset-4 hover:decoration-glow"
                  {...(part.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {part.label}
                  {part.href.startsWith("http") && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              ),
            )}
          </p>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-3 border-t border-line px-4 py-3 @[30rem]:px-5">
        <label htmlFor={inputId} className="shrink-0 text-data text-glow">
          <span aria-hidden="true">
            <span className="hidden @[24rem]:inline">{PROMPT_HOST}</span>
            {PROMPT_PATH}
          </span>
          <span className="sr-only">Command</span>
        </label>
        <input
          id={inputId}
          value={input.value}
          onChange={(e) => setInput({ ...input, value: e.target.value })}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          maxLength={MAX_INPUT}
          placeholder="help"
          className="min-w-0 flex-1 rounded border border-edge bg-ink px-2 py-1.5 text-base text-fg caret-glow placeholder:text-fg-3 focus-visible:outline-offset-1 @[30rem]:text-data"
        />
        <button
          type="submit"
          className="shrink-0 rounded border border-edge px-3 py-1.5 text-xs text-fg-2 transition-colors hover:border-glow hover:text-fg"
        >
          Run
        </button>
      </form>
    </div>
  );
}
