/** The six dated delivery targets and factual implementation states. */

import { ROADMAP } from "@/lib/content";
import { TELEGRAM_URL } from "@/lib/site";

/** Dates express target sequencing; readiness remains the release gate. */
export function Roadmap() {
  return (
    <section id="roadmap" aria-labelledby="roadmap-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <span id="status" className="scroll-mt-36" />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16"><div><p className="text-caption tracking-label text-glow uppercase">Roadmap / 23 October–3 December 2026</p><h2 id="roadmap-title" className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight sm:text-5xl">Six weeks toward<br />the first trading phase.</h2></div><p className="max-w-xl self-end text-sm leading-7 text-fg-2">These are dated delivery targets, not fixed launch promises. Security, custody, market-data and access readiness determine when genesis testing and public trading can begin.</p></div>
        <ol className="mt-12 grid gap-x-12 md:grid-cols-2">
          {ROADMAP.map((week, index) => <li key={week.dates} className="border-t border-line-2 py-7"><div className="flex flex-wrap items-center justify-between gap-3 text-caption"><span className="text-glow">Week {String(index + 1).padStart(2, "0")}</span><span className="text-fg-3">{week.dates} 2026</span></div><h3 className="mt-4 text-base font-medium">{week.title}</h3><ul className="mt-5 space-y-4">{week.items.map((item) => <li key={item.name} className="flex items-start justify-between gap-4 text-caption leading-6"><span className="max-w-sm text-fg-2">{item.name}</span><span className={`shrink-0 rounded border px-2 text-label ${item.state === "Done" ? "border-glow/30 text-glow" : item.state === "In Progress" ? "border-amber/30 text-amber" : "border-line-2 text-fg-3"}`}>{item.state}</span></li>)}</ul></li>)}
        </ol>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-6 border-t border-line-2 pt-8"><p className="text-sm text-fg-2">Follow the build and the conditions for participating.</p><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded bg-glow px-5 py-3 text-caption font-medium text-ink hover:bg-glow-hover">Join the community <span aria-hidden="true">↗</span><span className="sr-only"> on Telegram (opens in a new tab)</span></a></div>
      </div>
    </section>
  );
}
