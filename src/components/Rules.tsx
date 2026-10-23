/** Illustrated trading mechanics with planned rules explicitly identified. */

import { RULES } from "@/lib/content";

import { RuleVisual } from "./RuleVisual";

/** The trading economics and risk limits, before the deeper technical material. */
export function Rules() {
  return (
    <section id="rules" aria-labelledby="rules-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div><p className="text-caption tracking-label text-glow uppercase">How trading works</p><h2 id="rules-title" className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight sm:text-5xl">What you pay.<br />What you can lose.</h2></div>
          <p className="max-w-xl self-end text-sm leading-7 text-fg-2">When you make money, the house pays. When you lose, the house receives the loss. Its capital and exposure limits determine how much you can trade. The rules below explain pricing, costs and margin; custody settlement and MONKEY distribution are still being built.</p>
        </div>
        <ul className="mt-12 grid gap-x-16 md:grid-cols-2">
          {RULES.map((rule, index) => (
            <li key={rule.kind} className={`grid gap-5 border-t border-line py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${index === RULES.length - 1 ? "md:col-span-2 xl:grid-cols-2" : ""}`}>
              <div>
                <div className="flex items-center gap-3 text-label tracking-caps text-fg-3 uppercase"><span>{String(index + 1).padStart(2, "0")}</span>{rule.planned && <span className="text-amber">Planned</span>}</div>
                <h3 className="mt-3 text-sm leading-relaxed font-medium text-fg">{rule.title}</h3>
                <p className="mt-3 text-data leading-6 text-fg-2">{rule.detail}</p>
              </div>
              <figure className="self-center rounded border border-line bg-ink-1 px-3 py-4">
                <RuleVisual kind={rule.kind} />
                <figcaption className="mt-3 border-t border-line pt-3 text-label leading-5 text-fg-3">{rule.example}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
