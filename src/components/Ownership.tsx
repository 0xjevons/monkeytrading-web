/** The planned MONKEY allocation schedule and its connection to operator governance. */

import { scheduledAllocationBps, SCHEDULE_HALF_YEARS } from "@/lib/emissions";

/** A normalized schedule and worked pro-rata example, without invented supply parameters. */
export function Ownership() {
  return (
    <section id="ownership" aria-labelledby="ownership-title" tabIndex={-1} className="border-t border-line bg-ink-1 focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-2 lg:gap-16">
          <div><p className="text-caption tracking-label text-glow uppercase">MONKEY distribution</p><h2 id="ownership-title" className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight sm:text-5xl">Own a share of the house<br />you trade against.</h2></div>
          <p className="max-w-xl self-end text-sm leading-7 text-fg-2">Ownership of the house is distributed to traders through MONKEY. Every ten minutes, a fixed token budget is divided among accounts with eligible realised losses. Your share depends on your loss relative to everyone else’s in that period.</p>
        </div>
        <div className="mt-12 grid overflow-hidden rounded-xl border border-line-2 lg:grid-cols-[1.2fr_1fr]">
          <figure className="min-w-0 p-5 sm:p-8">
            <figcaption><h3 className="text-sm font-medium">The schedule halves every six months</h3><p className="mt-2 text-caption leading-6 text-fg-3">Share of the original maximum scheduled supply</p></figcaption>
            <ScheduleChart />
            <p className="mt-4 text-caption leading-6 text-fg-2">The schedule allocates up to 50% in six months and 75% in a year. Periods with no eligible losses issue nothing, and their unused tokens are cancelled permanently.</p>
            <p className="mt-3 text-label leading-5 text-fg-3">The chart shows scheduled allocation as a share of the original maximum supply, using equal-length half-years.</p>
          </figure>
          <div className="border-t border-line-2 bg-ink p-5 sm:p-8 lg:border-t-0 lg:border-l">
            <h3 className="text-sm font-medium">How one ten-minute budget is shared</h3>
            <p className="mt-3 text-caption leading-6 text-fg-2">If two eligible accounts lose $100 and $300 in one period, they receive 25% and 75% of that period’s tokens.</p>
            <div className="mt-7 flex h-12 overflow-hidden rounded text-caption font-medium text-ink"><span className="flex w-1/4 items-center justify-center bg-glow">25%</span><span className="flex w-3/4 items-center justify-center border-l-2 border-ink bg-fg-2">75%</span></div>
            <div className="mt-3 flex justify-between text-label text-fg-2"><span>A · $100 loss</span><span>B · $300 loss</span></div>
            <p className="mt-5 text-caption leading-6 text-fg-3">If they instead lose $1,000 and $3,000, they receive the same shares of the same budget. Losing more does not create more tokens.</p>
            <div className="mt-7 border-t border-line-2 pt-5"><div className="flex flex-wrap justify-between gap-2 text-caption"><span>No eligible losses?</span><span className="text-amber">Entire budget cancelled</span></div><div aria-hidden="true" className="mt-3 h-2 rounded bg-line-2" /><p className="mt-3 text-label leading-5 text-fg-3">Cancelled tokens cannot be issued in a later period.</p></div>
          </div>
        </div>
        <ol aria-label="From trading participation to operator governance" className="mt-10 grid gap-5 border-y border-line-2 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {["Eligible realised losses", "MONKEY ownership", "Stake or delegate", "Operator governance"].map((step, index) => <li key={step} className="flex items-center gap-3 text-caption"><span className="text-glow">{String(index + 1).padStart(2, "0")}</span>{step}{index < 3 && <span aria-hidden="true" className="ml-auto text-fg-3">→</span>}</li>)}
        </ol>
        <div className="mt-7 grid gap-7 lg:grid-cols-2 lg:gap-16">
          <p className="text-caption leading-6 text-fg-2">MONKEY holders stake or delegate to choose operators. Stakers share in house value above a required reserve. Papertrade introduced the mechanism of distributing house ownership through trader losses that inspired this design.</p>
          <details className="self-start rounded border border-line-2 px-5 py-4 text-caption text-fg-2"><summary className="cursor-pointer leading-6 text-fg">Who gets access at genesis?</summary><div className="mt-4 space-y-3 leading-6"><p>Genesis starts with restricted mainnet access, real funds and real MONKEY issuance. The emissions clock starts then and does not restart when public trading opens. Early access therefore gives participants an allocation advantage.</p><p>There is no reserved founder allocation. Founder participation uses the same ten-minute distribution mechanism.</p></div></details>
        </div>
      </div>
    </section>
  );
}

/** The piecewise-linear cumulative budget when each half-year has a constant epoch rate. */
function ScheduleChart() {
  const points = SCHEDULE_HALF_YEARS.map((period) => ({ x: 36 + period * 127, y: 200 - scheduledAllocationBps(period) * 0.016 }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <svg viewBox="0 0 580 248" role="img" aria-label="Scheduled allocation ceiling: zero at genesis, 50 percent at month six, 75 at twelve, 87.5 at eighteen and 93.75 at twenty-four" className="mt-6 h-auto w-full">
      {[0, 25, 50, 75, 100].map((percentage) => <g key={percentage}><line x1="36" y1={200 - percentage * 1.6} x2="550" y2={200 - percentage * 1.6} stroke="var(--color-line-2)" /><text x="27" y={204 - percentage * 1.6} textAnchor="end" fill="var(--color-fg-3)" fontSize="9">{percentage}</text></g>)}
      <polygon points={`36,200 ${line} 544,200`} fill="var(--color-glow)" opacity="0.07" />
      <polyline points={line} fill="none" stroke="var(--color-glow)" strokeWidth="2" />
      {points.map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r="4" fill="var(--color-glow)" />{index > 0 && <text x={point.x} y={point.y - 13} textAnchor="middle" fill="var(--color-fg)" fontSize="12">{scheduledAllocationBps(index) / 100}%</text>}<text x={point.x} y="228" textAnchor="middle" fill="var(--color-fg-3)" fontSize="10">{index === 0 ? "Genesis" : `${index * 6} mo`}</text></g>)}
    </svg>
  );
}
