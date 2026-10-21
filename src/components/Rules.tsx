/** The house rules: the engine's terms as short statements, with the unbuilt ones marked. */

import { RULES, STATUS_LABELS } from "@/lib/content";

/** The rules section: one card per rule from `content.ts`. */
export function Rules() {
  return (
    <section id="rules" aria-labelledby="rules-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-caption tracking-label text-glow uppercase">The rules</p>
          <h2 id="rules-title" className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            House rules, in plain sight.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-fg-2">
            Short enough to read, exact enough to replay. The built rules are written into the engine&apos;s public
            code, not a terms page; those marked in build are on their way there.
          </p>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule, i) => (
            <li key={rule.title} className="bg-ink-1 p-6 transition-colors hover:bg-ink-2">
              <div className="flex items-center justify-between text-caption tracking-caps uppercase">
                <span className="text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                {rule.building && <span className="text-amber">{STATUS_LABELS.building}</span>}
              </div>
              <h3 className="mt-4 text-lead leading-snug font-medium text-fg">{rule.title}</h3>
              <p className="mt-2 text-data leading-relaxed text-fg-2">{rule.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
