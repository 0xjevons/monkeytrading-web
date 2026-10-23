/** Trader-first product page with engineering demonstrations below the trading rules. */

import type { ReactNode } from "react";

import { Architecture } from "@/components/Architecture";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { IndexPanel } from "@/components/IndexPanel";
import { Markets } from "@/components/Markets";
import { Ownership } from "@/components/Ownership";
import { ReplayDemo } from "@/components/ReplayDemo";
import { Roadmap } from "@/components/Roadmap";
import { Rules } from "@/components/Rules";
import { Tape } from "@/components/Tape";
import { GITHUB_URL } from "@/lib/site";

/** The static page shell and ordered product explanation. */
export default function Home() {
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded bg-glow px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <Markets />
        <Rules />
        <Ownership />
        <Architecture />
        <Section
          id="index"
          label="Reference pricing"
          title="A price has to earn its place."
          aside={
            <>
              <p>
                The engine combines fresh independent quotes into a median reference. If sources become stale or
                disagree beyond the configured threshold, it stops providing an executable price.
              </p>
              <p>
                Stale quotes are excluded. If the remaining sources cannot agree, trading pauses until a valid
                reference price is available.
              </p>
            </>
          }
        >
          <IndexPanel />
        </Section>
        <Section
          id="tape"
          label="Public accounting"
          title="The history behind the balance."
          aside={
            <>
              <p>
                The node publishes ordered commands and the events they produce. Signed checkpoints commit to the
                engine state, allowing others to inspect the record behind an account.
              </p>
              <p className="text-fg-3">
                Each command occupies a numbered place in the history. Signed checkpoints let a verifier compare
                the calculated state with the published state.
              </p>
            </>
          }
        >
          <Tape />
        </Section>
        <Section
          id="replay"
          label="Independent verification"
          title="Recalculate the result."
          aside={
            <>
              <p>
                Your browser can replay the log below, recompute each keccak-256 state root and compare it
                with the published result. Change a value to find the first mismatch.
              </p>
              <p className="text-fg-3">
                To verify an engine log, use <code className="text-fg-2">engine replay</code> from the{" "}
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-glow">
                  engine repository<span className="sr-only"> (opens in a new tab)</span>
                </a>.
              </p>
            </>
          }
        >
          <ReplayDemo />
        </Section>
        <Roadmap />
      </main>
      <Footer />
    </>
  );
}

/** A supporting engineering explanation alongside its interactive demonstration. */
function Section({ id, label, title, aside, children }: {
  id: string;
  label: string;
  title: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <p className="text-caption tracking-label text-glow uppercase">{label}</p>
          <h2 id={`${id}-title`} className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight">{title}</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-fg-2">{aside}</div>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
