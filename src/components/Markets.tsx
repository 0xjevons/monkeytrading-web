/** Market breadth follows a common engine and market-specific admission rules. */

import { ASSET_CLASSES } from "@/lib/content";

/** The intended cross-asset catalogue, with the readiness boundary visible. */
export function Markets() {
  return (
    <section id="markets" aria-labelledby="markets-title" tabIndex={-1} className="border-t border-line bg-ink-1 focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-caption tracking-label text-glow uppercase">Markets</p><h2 id="markets-title" className="mt-3 font-sans text-3xl font-medium tracking-tight">Trade across asset classes.</h2></div><p className="max-w-md text-caption leading-6 text-fg-2">Crypto price feeds are built. Each additional market needs reliable prices, defined trading hours and tested risk limits before it can open.</p></div>
        <ul className="mt-9 grid gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {ASSET_CLASSES.map((asset) => <li key={asset.name} className="border-l border-line-2 pl-4"><h3 className="text-sm text-fg">{asset.name}</h3><p className="mt-3 text-caption text-fg-2">{asset.symbols}</p><p className="mt-2 text-label text-fg-3">{asset.hours}</p></li>)}
        </ul>
      </div>
    </section>
  );
}
