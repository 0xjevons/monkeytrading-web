import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { IndexPanel } from "@/components/IndexPanel";
import { ReplayDemo } from "@/components/ReplayDemo";
import { Tape } from "@/components/Tape";
import { Terminal } from "@/components/Terminal";
import { ASSET_CLASSES, RULES, STATUS } from "@/lib/content";
import { GITHUB_URL, TELEGRAM_URL } from "@/lib/site";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-glow px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <Section
          id="tape"
          label="The tape"
          title="Every command, in order, in public."
          aside={
            <>
              <p>
                The engine sequences every price update, order, and deposit into a single log, and streams it as it goes.
                At each checkpoint the enclave signs a hash of the whole state.
              </p>
              <p>
                The engine is deterministic. Given the same log, the same code reaches the same state on any machine, to
                the last unit.
              </p>
              <p className="text-fg-3">
                Simulated tape. Each root here chains the previous root with the command; the engine hashes its entire
                state.
              </p>
            </>
          }
        >
          <Tape />
        </Section>
        <Section
          id="replay"
          label="Replay it yourself"
          title="Don’t trust the house. Replay it."
          aside={
            <>
              <p>
                Below is a short published log, with the state root published after each command. Your browser replays it
                from an empty state, recomputes each keccak-256 root, and compares.
              </p>
              <p>Then change one value and replay again. The first root that differs shows exactly where.</p>
              <p className="text-fg-3">
                An illustration of the principle: the commands, state, and root encoding here are simplified, and leave out
                fees, financing, and margin. The real check is <code className="text-fg-2">engine replay</code>, in the{" "}
                <ExternalLink href={GITHUB_URL}>repository</ExternalLink>.
              </p>
            </>
          }
        >
          <ReplayDemo />
        </Section>
        <Rules />
        <Status />
        <Section
          id="shell"
          label="Shell"
          title="Prefer a prompt?"
          aside={
            <p>
              Ask the house a question. Type <code className="text-glow">help</code> to start.
            </p>
          }
        >
          <Terminal />
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section id="top" aria-labelledby="top-title" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="backdrop-grid absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute top-[-20rem] left-1/2 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_14%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pt-20 lg:pb-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-ink-1/80 px-3 py-1 text-[0.6875rem] tracking-[0.14em] text-fg-2 uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber" />
            Pre-launch · contracts for difference
          </p>
          <h1
            id="top-title"
            className="mt-7 text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-5xl lg:text-[2.125rem] xl:text-[2.875rem]"
          >
            The house is open{"\u00a0"}source.
            <br />
            <span className="glow">The ledger is public.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-fg-2 sm:text-base">
            monkeytrading is an engine for trading contracts for difference, where the house takes the other side of
            every trade. Its rules are public code. It runs inside a confidential-computing enclave and publishes every
            command it processes, so anyone can replay the record and check the state it signs.
          </p>
          <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded bg-glow px-5 py-3 text-sm font-medium text-ink shadow-[0_0_32px_-6px_var(--color-glow)] transition hover:bg-[#8affc0]"
            >
              Join the waitlist on Telegram
              <span aria-hidden="true">→</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded border border-edge px-5 py-3 text-sm text-fg transition-colors hover:border-fg-2 hover:bg-ink-2"
            >
              Read the code
              <span className="sr-only"> on GitHub (opens in a new tab)</span>
            </a>
          </div>
          <p className="mt-5 text-xs text-fg-3">Nothing here holds real funds yet.</p>
          <ul aria-label="Asset classes" className="mt-10 flex flex-wrap gap-2">
            {ASSET_CLASSES.map((name) => (
              <li key={name} className="rounded border border-line-2 px-2.5 py-1 text-[0.6875rem] text-fg-2">
                {name}
              </li>
            ))}
          </ul>
        </div>
        <div id="index" tabIndex={-1} className="focus:outline-none">
          <h2 className="sr-only">The index</h2>
          <IndexPanel />
          <p className="mt-4 text-xs leading-relaxed text-fg-3">
            Orders fill at the median of several venues. A venue that stops quoting drops out; venues that disagree mean no
            price, so there is never a stale price to pick off.
          </p>
        </div>
      </div>
    </section>
  );
}

function Section({
  id,
  label,
  title,
  aside,
  children,
}: {
  id: string;
  label: string;
  title: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-28">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[0.6875rem] tracking-[0.16em] text-glow uppercase">{label}</p>
          <h2 id={`${id}-title`} className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            {title}
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-fg-2">{aside}</div>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function Rules() {
  return (
    <section id="rules" aria-labelledby="rules-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] tracking-[0.16em] text-glow uppercase">The rules</p>
          <h2 id="rules-title" className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
            House rules, in plain sight.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-fg-2">
            Short enough to read, exact enough to replay. They are written into the engine&apos;s public code, not a
            terms page.
          </p>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule, i) => (
            <li key={rule.title} className="bg-ink-1 p-6 transition-colors hover:bg-ink-2">
              <div className="flex items-center justify-between text-[0.6875rem] tracking-[0.14em] uppercase">
                <span className="text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                {rule.building && <span className="text-amber">In build</span>}
              </div>
              <h3 className="mt-4 text-[0.9375rem] leading-snug font-medium text-fg">{rule.title}</h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-fg-2">{rule.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Status() {
  return (
    <section id="status" aria-labelledby="status-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="text-[0.6875rem] tracking-[0.16em] text-amber uppercase">Status</p>
          <h2 id="status-title" className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
            Pre-launch. Built in the open.
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-fg-2">
            <p>
              The engine runs end to end on a single machine, with a mock enclave, mock custody, and simulated prices.
              Nothing here holds real funds.
            </p>
            <p>Custody, attestation, live market data, and the token are under construction, in public.</p>
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
              className="inline-flex items-center gap-2 rounded bg-glow px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-[#8affc0]"
            >
              Join the waitlist
              <span className="sr-only"> on Telegram (opens in a new tab)</span>
            </a>
          </div>
        </div>
        <ul className="panel divide-y divide-line">
          {STATUS.map((item) => (
            <li key={item.name} className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
              <span
                className={`flex items-center gap-2 text-[0.6875rem] tracking-[0.14em] uppercase ${
                  item.state === "running" ? "text-glow" : "text-amber"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${item.state === "running" ? "bg-glow" : "border border-amber"}`}
                />
                {item.state === "running" ? "Runs locally" : "In build"}
              </span>
              <span>
                <span className="text-sm text-fg">{item.name}</span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-fg-2">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-fg-2 underline decoration-fg-3 underline-offset-4 hover:text-glow hover:decoration-glow"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
