/** The brand, compact section navigation and community link. */

import { TELEGRAM_URL } from "@/lib/site";

import { LogoMark } from "./Logo";

const NAV = [["Markets", "#markets"], ["Rules", "#rules"], ["Ownership", "#ownership"], ["Architecture", "#architecture"], ["Roadmap", "#roadmap"]] as const;

/** Responsive navigation stays available as a second row on narrow screens. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 max-w-[1440px] flex-wrap items-center justify-between gap-x-5 px-4 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight sm:text-base">
          <LogoMark />Monkey Trading
        </a>
        <nav aria-label="Sections" className="order-3 w-full overflow-x-auto border-t border-line py-3 lg:order-0 lg:w-auto lg:border-0">
          <ul className="flex justify-between gap-2.5 text-label tracking-caps text-fg-2 uppercase sm:justify-start sm:gap-6">
            {NAV.map(([label, href]) => <li key={href}><a href={href} className="inline-flex min-h-6 items-center hover:text-glow">{label}</a></li>)}
          </ul>
        </nav>
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded border border-edge px-3 py-2.5 text-caption text-fg hover:border-glow hover:text-glow sm:px-4">
          Join the community <span aria-hidden="true">↗</span><span className="sr-only"> on Telegram (opens in a new tab)</span>
        </a>
      </div>
    </header>
  );
}
