/** The footer: the Jevons quotation, links elsewhere, and the risk notice. */

import { EMAIL, GITHUB_URL, TELEGRAM_URL, X_URL } from "@/lib/site";

import { LogoMark } from "./Logo";

const LINKS = [
  ["GitHub", GITHUB_URL],
  ["Telegram", TELEGRAM_URL],
  ["X", X_URL],
] as const;

/** The page footer. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-1">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-xl">
          <p className="flex items-center gap-2.5 text-sm font-medium text-fg">
            <LogoMark className="size-10" />
            Monkey Trading
          </p>
          <figure className="mt-6">
            <blockquote className="font-serif text-2xl text-fg italic">“Value depends entirely upon utility.”</blockquote>
            <figcaption className="mt-2 text-xs text-fg-3">
              W. S. Jevons, <cite>The Theory of Political Economy</cite>, 1871
            </figcaption>
          </figure>
        </div>
        <nav aria-label="Elsewhere">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-fg-2 lg:flex-col lg:items-end">
            {LINKS.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-glow"
                >
                  {label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-glow">
                {EMAIL}
              </a>
            </li>
          </ul>
        </nav>
        <div className="border-t border-line pt-8 lg:col-span-2">
          <h2 className="text-caption tracking-label text-fg-3 uppercase">Risk notice</h2>
          <p className="mt-3 max-w-4xl text-xs leading-relaxed text-fg-2">
            CFDs are complex, leveraged products, and losses can be rapid. Monkey Trading is pre-launch software: nothing
            on this site is an offer of, or an invitation to buy, any product, service, or token, and nothing here holds
            real funds. It is not available to persons in the United States or in sanctioned jurisdictions.
          </p>
          <p className="mt-6 text-xs text-fg-3">The code is open source under the Apache License 2.0.</p>
        </div>
      </div>
    </footer>
  );
}
