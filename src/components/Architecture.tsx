"use client";

/** The intended single-active-operator architecture, animated through the shared motion store. */

import { useState } from "react";

import { OperatorHandover } from "./OperatorHandover";
import { MotionToggle, useMotion, useTicker } from "./motion";

const EXECUTION = [
  { label: "Trader orders", heading: "Signed requests", detail: "The node checks and sequences each signed order.", code: "01 / INPUT" },
  { label: "One active TEE", heading: "Native Rust engine", detail: "Attestation identifies the software and keys running inside the TEE.", code: "02 / EXECUTE" },
  { label: "Public history", heading: "Commands and balances", detail: "Commands, events and signed state checkpoints.", code: "03 / VERIFY" },
  { label: "Onchain custody", heading: "Daily settlement", detail: "The planned vault releases withdrawals after daily state verification.", code: "04 / SETTLE" },
] as const;

/** Execution, custody and succession remain readable with the animation paused. */
export function Architecture() {
  const [enabled, setEnabled] = useMotion();
  const [step, setStep] = useState(0);
  const ref = useTicker<HTMLDivElement>(1800, enabled, () => setStep((current) => (current + 1) % EXECUTION.length));
  return (
    <section id="architecture" aria-labelledby="architecture-title" tabIndex={-1} className="border-t border-line focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-2 lg:gap-16"><div><p className="text-caption tracking-label text-glow uppercase">How the exchange runs</p><h2 id="architecture-title" className="mt-4 font-sans text-4xl leading-tight font-medium tracking-tight sm:text-5xl">One trading engine.<br />Rotating operators.</h2></div><p className="max-w-xl self-end text-sm leading-7 text-fg-2">One active node runs the Rust engine inside a trusted execution environment (TEE). It publishes the commands needed to replay its calculations. The plan is to verify the day’s state onchain, then let the next operator continue from that state.</p></div>
        <div ref={ref} className="mt-12 overflow-hidden rounded-xl border border-line-2 bg-ink-1">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-2 px-5 py-4 sm:px-7"><span className="text-caption text-fg-2">Execution → verification → settlement</span><MotionToggle enabled={enabled} onChange={setEnabled} /></div>
          <ol className="grid gap-0 px-5 py-8 sm:grid-cols-2 sm:px-7 lg:grid-cols-4">
            {EXECUTION.map((node, index) => <li key={node.label} className="relative py-4 sm:pr-5"><div className={`border-l-2 pl-4 transition-colors ${step === index ? "border-glow" : "border-line-2"}`}><p className="text-label tracking-caps text-fg-3">{node.code}</p><h3 className={`mt-4 text-sm ${index === 1 ? "text-glow" : "text-fg"}`}>{node.label}</h3><p className="mt-2 text-caption text-fg-2">{node.heading}</p><p className="mt-4 max-w-56 text-caption leading-6 text-fg-3">{node.detail}</p></div>{index < 3 && <span aria-hidden="true" className={`absolute top-8 right-1 hidden text-xl transition-opacity lg:block ${step === index ? "text-glow opacity-100" : "text-fg-3 opacity-50"}`}>→</span>}</li>)}
          </ol>
          <OperatorHandover />
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div><h3 className="text-sm text-fg">Withdrawals settle once a day</h3><p className="mt-3 text-caption leading-6 text-fg-2">Trades update your account during the day. Under the planned withdrawal rules, requests wait for the daily state check and onchain finality before the vault can release USDC.</p></div>
          <div><h3 className="text-sm text-fg">What is built, and what comes next</h3><p className="mt-3 text-caption leading-6 text-fg-2">The trading engine and replayable history are built. TEE hardware infrastructure is in progress. Operator selection, daily handover, withdrawal verification and bond slashing still need implementation and failure testing.</p></div>
        </div>
        <details className="mt-7 border-t border-line-2 pt-5 text-caption"><summary className="cursor-pointer leading-6 text-fg-2">What you can verify</summary><p className="mt-4 max-w-4xl leading-6 text-fg-3">Attestation lets you check which software and keys a TEE is running. It cannot tell you whether the house has enough assets or its price feeds are correct. An account proof shows that a balance belongs to a published state; replay lets you check how that state was calculated. The withdrawal contract must enforce its own verification rules. Hardware failures, unavailable hosts and disputed handovers still need recovery procedures.</p></details>
      </div>
    </section>
  );
}
