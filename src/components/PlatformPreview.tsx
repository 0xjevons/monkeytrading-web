"use client";

/** A multi-asset workspace with local sizing controls. */

import { useId, useState } from "react";

import { formatCents, groupThousands } from "@/lib/format";
import { CANDLE_CLOSES, previewMarginCents, WATCHLIST } from "@/lib/platform";

/** A product concept: watchlist, reference-price chart and illustrative order ticket. */
export function PlatformPreview() {
  const id = useId();
  const [notionalDollars, setNotionalDollars] = useState(100_000);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<"Long" | "Short">("Long");
  const marginCents = previewMarginCents(notionalDollars * 100, leverage);
  return (
    <figure className="relative mt-12 sm:mt-16">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-caption text-fg-3">
        <figcaption className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-glow" />Trading workspace</figcaption>
        <span>Explore the sizing controls</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line-2 bg-ink-1 shadow-platform">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
          <span className="flex items-center gap-3 text-caption"><span className="size-2 rounded-full bg-glow" aria-hidden="true" />MONKEY TRADING <span className="hidden text-fg-3 sm:inline">/ WORKSPACE</span></span>
          <span className="rounded border border-line-2 px-2 py-1 text-label tracking-caps text-fg-2 uppercase">USDC account</span>
        </div>
        <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_270px] xl:grid-cols-[230px_minmax(0,1fr)_290px]">
          <div className="border-b border-line lg:border-r lg:border-b-0">
            <p className="border-b border-line px-4 py-3 text-label tracking-caps text-fg-3 uppercase">Global watchlist</p>
            <ul className="grid sm:grid-cols-5 lg:block">
              {WATCHLIST.map((item, index) => (
                <li key={item.symbol} className={`border-b border-line px-4 py-4 ${index === 0 ? "border-l-2 border-l-glow bg-glow/5" : ""}`}>
                  <div className="flex flex-wrap justify-between gap-1 text-caption"><span className="text-fg">{item.symbol}</span><span className={item.up ? "text-glow" : "text-alarm"}>{item.move}</span></div>
                  <div className="mt-2 flex flex-wrap justify-between gap-1 text-caption text-fg-3"><span>{item.asset}</span><span className="text-fg-2">{item.price}</span></div>
                </li>
              ))}
            </ul>
            <p className="hidden px-4 py-5 text-label leading-relaxed text-fg-3 lg:block">Crypto, FX, indices,<br />commodities and shares.</p>
          </div>
          <div className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
              <div><p className="text-sm font-medium">BTC / USD <span className="ml-2 text-caption text-fg-3">Bitcoin</span></p><p className="mt-2 text-2xl tracking-tight">67,420<span className="text-fg-3">.00</span> <span className="text-caption text-glow">+2.41%</span></p></div>
              <span className="rounded border border-line-2 px-2 py-1 text-label text-fg-2">15m · Reference</span>
            </div>
            <CandleChart />
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line px-2 py-5 text-center">
              <div><p className="text-label text-fg-3">Reference</p><p className="mt-2 text-caption text-fg-2">Multi-venue median</p></div>
              <div><p className="text-label text-fg-3">Execution</p><p className="mt-2 text-caption text-fg-2">House counterparty</p></div>
              <div><p className="text-label text-fg-3">Risk mode</p><p className="mt-2 text-caption text-glow">Normal</p></div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-label tracking-caps text-fg-3 uppercase">Position sizing</p>
            <fieldset className="mt-5 grid grid-cols-2 gap-2"><legend className="sr-only">Position direction</legend>
              {(["Long", "Short"] as const).map((direction) => <button key={direction} type="button" aria-pressed={side === direction} onClick={() => setSide(direction)} className={`rounded border py-2.5 text-caption ${side === direction ? "border-glow bg-glow/10 text-glow" : "border-line-2 text-fg-2"}`}>{direction}</button>)}
            </fieldset>
            <div className="mt-5">
              <label htmlFor={`${id}-size`} className="flex justify-between gap-2 text-caption text-fg-2">Position size <span className="text-fg">${groupThousands(notionalDollars)}</span></label>
              <input id={`${id}-size`} type="range" min={25_000} max={1_000_000} step={25_000} value={notionalDollars} onChange={(event) => setNotionalDollars(Number(event.target.value))} className="mt-3 w-full accent-glow" />
              <label htmlFor={`${id}-leverage`} className="mt-4 flex justify-between text-caption text-fg-2">Leverage <span className="text-glow">{leverage}×</span></label>
              <input id={`${id}-leverage`} type="range" min={1} max={50} value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} className="mt-3 w-full accent-glow" />
            </div>
            <dl className="mt-5 space-y-3 border-y border-line py-4 text-caption">
              <div className="flex justify-between gap-2"><dt className="text-fg-3">Required margin</dt><dd>${formatCents(marginCents)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-fg-3">Counterparty</dt><dd>Protocol house</dd></div>
            </dl>
            <div className="mt-4 flex items-center justify-between text-label"><span className="text-fg-3">House capacity</span><span className="text-glow">Risk checked</span></div>
            <div aria-hidden="true" className="mt-2 flex h-1.5 gap-1">{[0, 1, 2, 3, 4, 5, 6, 7].map((segment) => <span key={segment} className={`flex-1 rounded-sm ${segment < 5 ? "bg-glow/70" : "bg-line-2"}`} />)}</div>
            <p className="mt-4 text-label leading-relaxed text-fg-3">Required margin equals position size divided by leverage.</p>
            <p className="mt-4 rounded border border-line-2 px-3 py-3 text-center text-caption text-fg-2">{side} · ${groupThousands(notionalDollars)} position</p>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** Deterministic, decorative candlesticks with no live-market implication. */
function CandleChart() {
  return (
    <svg viewBox="0 0 560 255" role="img" aria-label="Bitcoin candlestick chart" className="h-auto w-full px-3 pb-4">
      {[30, 80, 130, 180, 230].map((y) => <line key={y} x1="8" y1={y} x2="550" y2={y} stroke="var(--color-line)" />)}
      {[40, 140, 240, 340, 440, 540].map((x) => <line key={x} x1={x} y1="15" x2={x} y2="235" stroke="var(--color-line)" />)}
      {CANDLE_CLOSES.map((close, index) => {
        const open = CANDLE_CLOSES[index - 1] ?? 173;
        const up = close < open;
        return <g key={index} style={{ color: up ? "var(--color-glow)" : "var(--color-fg-2)" }}>
          <line x1={18 + index * 18} x2={18 + index * 18} y1={Math.min(open, close) + 12} y2={Math.max(open, close) + 42} stroke="currentColor" />
          <rect x={13 + index * 18} y={Math.min(open, close) + 24} width="10" height={Math.max(3, Math.abs(open - close))} fill={up ? "currentColor" : "var(--color-ink-1)"} stroke="currentColor" />
          <rect x={13 + index * 18} y={236 - (index % 5) * 6} width="10" height={8 + (index % 5) * 6} fill="currentColor" opacity="0.22" />
        </g>;
      })}
      <line x1="8" y1="47" x2="550" y2="47" stroke="var(--color-glow)" strokeDasharray="3 5" opacity="0.6" />
    </svg>
  );
}
