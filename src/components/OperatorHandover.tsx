/** The planned link from delegated operator selection to authenticated active-node succession. */

const GOVERNANCE = [
  { title: "MONKEY stake / delegation", detail: "Holders delegate voting power to operator candidates." },
  { title: "Candidate TEE registry", detail: "Eligible operators register an attested node and a bond." },
  { title: "Select the successor", detail: "Delegated stake selects the next active operator." },
] as const;

const HANDOVER = [
  { title: "Incumbent active TEE", detail: "The active executor above reaches the daily command boundary." },
  { title: "Authenticated state", detail: "Signed checkpoint, recorded history and validated boundary state." },
  { title: "Successor active TEE", detail: "The selected operator verifies the handover and takes the active role." },
] as const;

/** Arrows bind selection to the incoming executor, and the outgoing state to its successor. */
export function OperatorHandover() {
  return (
    <div className="border-t border-line-2 bg-ink px-5 py-7 sm:px-7">
      <p className="text-label tracking-caps text-glow uppercase">Planned operator governance & daily handover</p>
      <ol aria-label="Delegated operator selection" className="mt-6 grid gap-4 md:grid-cols-3 md:gap-9">
        {GOVERNANCE.map((node, index) => <li key={node.title} className="relative"><div className="rounded border border-line-2 bg-ink-1 p-4"><h3 className="text-caption text-fg">{node.title}</h3><p className="mt-3 text-caption leading-6 text-fg-3">{node.detail}</p></div>{index < 2 && <span aria-hidden="true" className="mx-auto mt-3 block text-center text-glow md:absolute md:top-7 md:-right-6 md:mt-0"><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></span>}</li>)}
      </ol>
      <div className="my-3 grid md:grid-cols-3"><p className="flex items-center justify-center gap-3 text-label leading-6 text-glow md:col-start-3"><span aria-hidden="true">↓</span>Authorizes the next active TEE</p></div>
      <ol aria-label="Authenticated state handover" className="grid gap-4 md:grid-cols-3 md:gap-9">
        {HANDOVER.map((node, index) => <li key={node.title} className="relative"><div className={`h-full rounded border p-4 ${index === 2 ? "border-glow/60 bg-glow/5" : "border-line-2 bg-ink-1"}`}><h3 className={`text-caption ${index === 2 ? "text-glow" : "text-fg"}`}>{node.title}</h3><p className="mt-3 text-caption leading-6 text-fg-3">{node.detail}</p></div>{index < 2 && <span aria-hidden="true" className="mx-auto mt-3 block text-center text-glow md:absolute md:top-7 md:-right-6 md:mt-0"><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></span>}</li>)}
      </ol>
      <svg viewBox="0 0 900 34" aria-hidden="true" className="mt-2 hidden h-8 w-full md:block" preserveAspectRatio="none"><path d="M754 1v25H147V1m-4 7 4-7 4 7" fill="none" stroke="var(--color-glow)" strokeOpacity="0.55" /></svg>
      <p className="mt-4 text-center text-caption leading-6 text-fg-2 md:mt-1"><span aria-hidden="true" className="text-glow">↻ </span>The successor becomes the one active executor for the next epoch.</p>
    </div>
  );
}
