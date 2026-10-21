/** The project's pre-launch status: what runs locally today and what is in build. */

import { STATUS, STATUS_LABELS, type StatusItem } from "@/lib/content";
import { GITHUB_URL, TELEGRAM_URL } from "@/lib/site";
import { unreachable } from "@/lib/unreachable";

/** The status section: the board from `content.ts`, with links to the code and the waitlist. */
export function Status() {
  return (
    <section id="status" aria-labelledby="status-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="text-caption tracking-label text-amber uppercase">Status</p>
          <h2 id="status-title" className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Pre-launch. Built in the open.
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-fg-2">
            <p>
              The engine runs end to end on a single machine, with a mock enclave, mock custody, and simulated prices,
              or live crypto prices from three venues; vault deposits also run against a local chain. Nothing here
              holds real funds.
            </p>
            <p>
              On-chain withdrawals, hardware attestation, live prices for other asset classes, and the token are under
              construction, in public.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded border border-edge px-4 py-2.5 text-sm text-fg transition-colors hover:border-fg-2 hover:bg-ink-2"
            >
              Follow the code
              <span className="sr-only"> on GitHub (opens in a new tab)</span>
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded bg-glow px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-glow-hover"
            >
              Join the waitlist
              <span className="sr-only"> on Telegram (opens in a new tab)</span>
            </a>
          </div>
        </div>
        <ul className="panel divide-y divide-line">
          {STATUS.map((item) => {
            const tone = toneOf(item.state);
            return (
              <li key={item.name} className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                <span className={`flex items-center gap-2 text-caption tracking-caps uppercase ${tone.text}`}>
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${tone.dot}`} />
                  {STATUS_LABELS[item.state]}
                </span>
                <span>
                  <span className="text-sm text-fg">{item.name}</span>
                  <span className="mt-1 block text-data leading-relaxed text-fg-2">{item.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * The colours of a status: green for what runs locally, amber for what is in build.
 * Error cases:
 * - a state outside `StatusItem["state"]`
 */
function toneOf(state: StatusItem["state"]): { text: string; dot: string } {
  switch (state) {
    case "running":
      return { text: "text-glow", dot: "bg-glow" };
    case "building":
      return { text: "text-amber", dot: "border border-amber" };
    default:
      return unreachable(state, "Status");
  }
}
