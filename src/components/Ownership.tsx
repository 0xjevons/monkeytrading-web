/** The planned MONKEY allocation schedule and its connection to operator governance. */

import { scheduledAllocationBps, SCHEDULE_HALF_YEARS } from "@/lib/emissions";

/** A normalized schedule and worked pro-rata example, without invented supply parameters. */
export function Ownership() {
  return (
    <section id="ownership" aria-labelledby="ownership-title" tabIndex={-1} className="border-t border-line bg-ink-1 focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-2 lg:gap-16">
          <div><p className="text-caption tracking-label text-glow uppercase">Trader ownership · Planned model</p><h2 id="ownership-title" className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight sm:text-5xl">Own a share of the house<br />you trade against.</h2></div>
          <p className="max-w-xl self-end text-sm leading-7 text-fg-2">MONKEY is intended to represent ownership of the house. Each ten-minute epoch has a fixed allocation, shared in proportion to eligible realised losses. Larger losses change your share of that budget; they do not expand the budget itself.</p>
        </div>
        <div className="mt-12 grid overflow-hidden rounded-xl border border-line-2 lg:grid-cols-[1.2fr_1fr]">
          <figure className="min-w-0 p-5 sm:p-8">
            <figcaption><h3 className="text-sm font-medium">The schedule halves every six months</h3><p className="mt-2 text-caption leading-6 text-fg-3">Cumulative scheduled allocation / original maximum</p></figcaption>
            <ScheduleChart />
            <p className="mt-4 text-caption leading-6 text-fg-2">50% at six months, 75% at twelve, 87.5% at eighteen and 93.75% at twenty-four. Actual minted supply can be lower because unused epoch budgets disappear permanently.</p>
            <p className="mt-3 text-label leading-5 text-fg-3">Normalized model with equal-length half-years. Absolute supply, calendar boundaries, eligibility and integer remainder rules are not finalized.</p>
          </figure>
          <div className="border-t border-line-2 bg-ink p-5 sm:p-8 lg:border-t-0 lg:border-l">
            <h3 className="text-sm font-medium">Inside one ten-minute epoch</h3>
            <p className="mt-3 text-caption leading-6 text-fg-2">Two eligible accounts realise losses of $100 and $300. They divide the same scheduled allocation 25% / 75%.</p>
            <div className="mt-7 flex h-12 overflow-hidden rounded text-caption font-medium text-ink"><span className="flex w-1/4 items-center justify-center bg-glow">25%</span><span className="flex w-3/4 items-center justify-center border-l-2 border-ink bg-fg-2">75%</span></div>
            <div className="mt-3 flex justify-between text-label text-fg-2"><span>A · $100 loss</span><span>B · $300 loss</span></div>
            <p className="mt-5 text-caption leading-6 text-fg-3">At $1,000 and $3,000, their shares stay the same. There is no fixed number of MONKEY per dollar lost.</p>
            <div className="mt-7 border-t border-line-2 pt-5"><div className="flex flex-wrap justify-between gap-2 text-caption"><span>No eligible losses?</span><span className="text-amber">Entire budget cancelled</span></div><div aria-hidden="true" className="mt-3 h-2 rounded bg-line-2" /><p className="mt-3 text-label leading-5 text-fg-3">Never banked, carried forward or claimed later.</p></div>
          </div>
        </div>
        <ol aria-label="From trading participation to operator governance" className="mt-10 grid gap-5 border-y border-line-2 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {["Eligible realised losses", "MONKEY ownership", "Stake or delegate", "Operator governance"].map((step, index) => <li key={step} className="flex items-center gap-3 text-caption"><span className="text-glow">{String(index + 1).padStart(2, "0")}</span>{step}{index < 3 && <span aria-hidden="true" className="ml-auto text-fg-3">→</span>}</li>)}
        </ol>
        <div className="mt-7 grid gap-7 lg:grid-cols-2 lg:gap-16">
          <p className="text-caption leading-6 text-fg-2">Staking is intended to connect economic participation in house value above a reserve floor with a role in choosing operators. Distribution terms remain to be specified; ownership does not guarantee yield. Papertrade originated the trader-owned-house mechanism that inspired this design.</p>
          <details className="self-start rounded border border-line-2 px-5 py-4 text-caption text-fg-2"><summary className="cursor-pointer leading-6 text-fg">Genesis participation and the emissions clock</summary><div className="mt-4 space-y-3 leading-6"><p>The proposed permissioned mainnet test starts real emissions at genesis. The clock continues through public opening without a reset, so restricted early access creates an allocation advantage.</p><p>The founder’s provisional objective is to acquire 2–5% of the original maximum scheduled supply through participation, not a reserved allocation. Access criteria, insider participation and distributions must be disclosed before genesis.</p></div></details>
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
