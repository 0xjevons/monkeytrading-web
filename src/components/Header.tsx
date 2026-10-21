import { GITHUB_URL, TELEGRAM_URL } from "@/lib/site";

import { LogoMark } from "./Logo";

const NAV = [
  ["Index", "#index"],
  ["Tape", "#tape"],
  ["Replay", "#replay"],
  ["Rules", "#rules"],
  ["Status", "#status"],
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5 text-sm font-medium tracking-tight text-fg">
          <LogoMark className="size-5" />
          monkeytrading
        </a>
        <nav aria-label="Sections" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-1 text-xs text-fg-2">
            {NAV.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="rounded px-2.5 py-1.5 transition-colors hover:bg-ink-2 hover:text-fg">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded px-2.5 py-1.5 text-xs text-fg-2 transition-colors hover:bg-ink-2 hover:text-fg sm:block"
          >
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-glow/60 bg-glow/10 px-3 py-1.5 text-xs font-medium text-glow transition-colors hover:bg-glow hover:text-ink"
          >
            Join the waitlist<span className="sr-only"> on Telegram (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </header>
  );
}
