"use client";

/**
 * The page's one motion switch: whether the simulations and their animations run, a ticker that
 * stops off screen, and the pause / play control each animated panel shows.
 */

import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

// The visitor's explicit choice from a pause / play control; `null` follows the OS setting. The one
// browser-only store for motion, written only from event handlers.
let choice: boolean | null = null;
const listeners = new Set<() => void>();

/** Calls `onChange` when the visitor's choice or the OS's reduced-motion setting changes. */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCE);
  listeners.add(onChange);
  query.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    query.removeEventListener("change", onChange);
  };
}

/** Whether motion is on: the visitor's choice, or else on unless the OS asks for reduced motion. */
function motionEnabled() {
  return choice ?? !window.matchMedia(REDUCE).matches;
}

/**
 * Whether the page's simulations and animations run: off under `prefers-reduced-motion` until the
 * visitor presses play, and off during the server render, which shows the first frame. One switch
 * drives every animated panel.
 */
export function useMotion(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, motionEnabled, () => false);
  const setEnabled = (next: boolean) => {
    choice = next;
    for (const listener of listeners) listener();
  };
  return [enabled, setEnabled];
}

/**
 * Calls `onTick` every `intervalMs` while `enabled`, the returned element is on screen, and the
 * tab is visible, so off-screen panels cost nothing.
 */
export function useTicker<T extends Element>(intervalMs: number, enabled: boolean, onTick: () => void) {
  const ref = useRef<T>(null);
  const tick = useEffectEvent(onTick);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let onScreen = false;
    let timer: number | undefined;
    const sync = () => {
      const run = onScreen && document.visibilityState === "visible";
      if (run && timer === undefined) timer = window.setInterval(() => tick(), intervalMs);
      if (!run && timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);

  return ref;
}

/** The pause / play switch shown on each animated panel; it pauses every animation on the page. */
export function MotionToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="inline-flex min-h-6 items-center gap-1.5 rounded border border-line-2 px-2 py-1 text-caption tracking-caps text-fg-2 uppercase transition-colors hover:border-edge hover:text-fg"
    >
      <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5 fill-current">
        {enabled ? (
          <>
            <rect x="1.5" y="1" width="2.25" height="8" rx="0.5" />
            <rect x="6.25" y="1" width="2.25" height="8" rx="0.5" />
          </>
        ) : (
          <path d="M2 1.2v7.6a.5.5 0 0 0 .76.43l6.1-3.8a.5.5 0 0 0 0-.86L2.76.77A.5.5 0 0 0 2 1.2Z" />
        )}
      </svg>
      {enabled ? "Pause" : "Play"}
      <span className="sr-only"> animations</span>
    </button>
  );
}
