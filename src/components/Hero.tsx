/** Trader-first positioning and the simulated product workspace. */

import { GITHUB_URL, TELEGRAM_URL } from "@/lib/site";

import { PlatformPreview } from "./PlatformPreview";

/** The opening product argument, with no measured performance claims. */
export function Hero() {
  return (
    <section id="top" aria-labelledby="top-title" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="backdrop-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-[1440px] px-4 pt-14 pb-16 sm:px-8 sm:pt-20 lg:px-12 lg:pt-24">
        <p className="flex items-center gap-3 text-caption tracking-caps text-fg-2 uppercase"><span className="h-px w-8 bg-glow" aria-hidden="true" />Monkey Trading</p>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-20">
          <h1 id="top-title" className="font-sans text-[2.6rem] leading-[1.05] font-medium tracking-[-0.055em] sm:text-6xl xl:text-7xl">Trade global markets<br /><span className="text-glow">with institutional size.</span></h1>
          <div>
            <p className="max-w-xl text-sm leading-7 text-fg-2 sm:text-base">Trade large positions with high leverage across crypto, FX, indices, commodities and shares. The house takes the other side of your trade. The engine processes orders without putting every trade onchain.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded bg-glow px-5 py-3 text-caption font-medium text-ink hover:bg-glow-hover">Follow Monkey Trading <span aria-hidden="true">↗</span><span className="sr-only"> on Telegram (opens in a new tab)</span></a>
              <a href="#rules" className="rounded border border-edge px-5 py-3 text-caption hover:border-fg-2">Read the trading rules <span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </div>
        <PlatformPreview />
        <div className="mt-7 flex flex-wrap justify-between gap-4 text-caption leading-relaxed text-fg-3">
          <p>Offchain execution · USDC settlement · Public accounting</p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-fg-2 hover:text-glow">Read the source code <span aria-hidden="true">↗</span><span className="sr-only"> on GitHub (opens in a new tab)</span></a>
        </div>
      </div>
    </section>
  );
}
