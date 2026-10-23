/** Small mechanism diagrams for every substantive trading rule. */

import type { RuleKind } from "@/lib/content";
import { unreachable } from "@/lib/unreachable";

/** A static explanatory figure; its text equivalent sits directly below it. */
export function RuleVisual({ kind }: { kind: RuleKind }) {
  return (
    <svg viewBox="0 0 320 86" aria-hidden="true" className="h-auto w-full text-fg-2 [&_text]:fill-current [&_text]:font-mono [&_text]:text-[10px]">
      <Diagram kind={kind} />
    </svg>
  );
}

/** Selects a visual model of the rule rather than a decorative category icon. */
function Diagram({ kind }: { kind: RuleKind }) {
  switch (kind) {
    case "counterparty": return <>
      <Box x={3} width={95} label="YOUR POSITION" />
      <path d="M110 33h98m-8-5 8 5-8 5M208 49h-98m8-5-8 5 8 5" fill="none" stroke="var(--color-glow)" />
      <Box x={220} width={97} label="HOUSE" />
      <text x="160" y="76" textAnchor="middle">Equal, opposite exposure</text>
    </>;
    case "pricing": return <>
      <path d="M34 34h250" stroke="var(--color-line-2)" />
      {[50, 160, 270].map((x, i) => <g key={x}><circle cx={x} cy="34" r={i === 1 ? 8 : 5} fill={i === 1 ? "var(--color-glow)" : "var(--color-fg-3)"} /><text x={x} y="65" textAnchor="middle">{100 + i}</text></g>)}
      <text x="160" y="14" textAnchor="middle">MEDIAN</text>
    </>;
    case "spreads": return <>
      <path d="M15 62h290" stroke="var(--color-line-2)" />
      <path d="M15 56h70V44h70V30h70V15h70" fill="none" stroke="var(--color-glow)" strokeWidth="2" />
      <text x="16" y="80">Ordinary size</text><text x="304" y="80" textAnchor="end">Larger / stressed risk</text>
      <text x="21" y="20">Spread adjustment</text>
    </>;
    case "profit": return <>
      <text x="160" y="14" textAnchor="middle">REALISED GAIN</text>
      <path d="M160 20v13M80 33h160M80 33v9m160-9v9" fill="none" stroke="var(--color-glow)" />
      <rect x="5" y="42" width="145" height="29" rx="3" fill="var(--color-ink-2)" stroke="var(--color-glow)" />
      <rect x="170" y="42" width="145" height="29" rx="3" fill="var(--color-ink-2)" stroke="var(--color-line-2)" />
      <text x="77" y="60" textAnchor="middle">Trader proceeds</text><text x="243" y="60" textAnchor="middle">Profit fee</text>
    </>;
    case "financing": return <>
      <text x="10" y="17">HOLD POSITION</text><text x="310" y="17" textAnchor="end">PAY / RECEIVE</text>
      <path d="M15 44h290" stroke="var(--color-line-2)" /><path d="M160 25v38" stroke="var(--color-glow)" strokeWidth="2" />
      <circle cx="20" cy="44" r="4" fill="var(--color-fg-3)" /><circle cx="300" cy="44" r="4" fill="var(--color-glow)" />
      <text x="160" y="80" textAnchor="middle">Daily rollover</text>
    </>;
    case "loss": return <>
      <path d="M10 13 70 23 113 19 158 42 204 51 241 62h65" fill="none" stroke="var(--color-fg-2)" strokeWidth="2" />
      <path d="M10 64h300" stroke="var(--color-glow)" strokeWidth="2" /><path d="m241 62 45 17" stroke="var(--color-alarm)" strokeDasharray="3 3" />
      <text x="12" y="80">Account floor</text><text x="307" y="17" textAnchor="end">Excess loss → house</text>
    </>;
    case "sessions": return <>
      <rect x="8" y="23" width="92" height="27" fill="var(--color-glow)" opacity="0.15" /><rect x="220" y="23" width="92" height="27" fill="var(--color-glow)" opacity="0.15" />
      <path d="M15 43 45 38 72 40 96 32m3 0h119m2-12 28-8 30 6 26-10" fill="none" stroke="var(--color-glow)" strokeWidth="2" />
      <path d="m100 32 119-12" stroke="var(--color-fg-3)" strokeDasharray="3 4" />
      <text x="8" y="76">Session</text><text x="160" y="76" textAnchor="middle">Closed / gap risk</text><text x="312" y="76" textAnchor="end">Reopen</text>
    </>;
    case "capacity": return <>
      <text x="5" y="15">NET EXPOSURE</text><text x="307" y="15" textAnchor="end">CAP</text>
      <rect x="5" y="28" width="302" height="20" fill="var(--color-line)" /><rect x="5" y="28" width="172" height="20" fill="var(--color-fg-3)" /><rect x="181" y="28" width="54" height="20" fill="var(--color-glow)" />
      <path d="M307 22v32" stroke="var(--color-glow)" strokeWidth="2" />
      <text x="5" y="75">Existing exposure</text><text x="205" y="75" textAnchor="middle">+ Order</text><text x="307" y="75" textAnchor="end">Limit</text>
    </>;
    case "custody": return <>
      <Box x={4} width={88} label="REQUEST" /><Box x={116} width={88} label="VERIFY" /><Box x={228} width={88} label="RELEASE" />
      <path d="M96 41h16m96 0h16" stroke="var(--color-glow)" />
      <text x="160" y="77" textAnchor="middle">Daily settlement boundary</text>
    </>;
    case "ownership": return <>
      <Box x={4} width={88} label="LOSSES" /><Box x={116} width={88} label="MONKEY" /><Box x={228} width={88} label="DELEGATE" />
      <path d="M96 41h16m96 0h16" stroke="var(--color-glow)" />
      <text x="160" y="77" textAnchor="middle">Ten-minute budgets → operator governance</text>
    </>;
    case "accounting": return <>
      {[5, 39, 73].map((x) => <rect key={x} x={x} y="22" width="24" height="38" rx="2" stroke="var(--color-fg-3)" fill="none" />)}
      <path d="M106 41h35m-7-4 7 4-7 4m80 0h25" fill="none" stroke="var(--color-glow)" />
      <Box x={148} width={62} label="REPLAY" /><Box x={244} width={72} label="ROOT ✓" />
      <text x="50" y="78" textAnchor="middle">Command log</text><text x="273" y="78" textAnchor="middle">Compare</text>
    </>;
    default: return unreachable(kind, "Trading rule diagram");
  }
}

/** A labelled state in the compact process diagrams. */
function Box({ x, width, label }: { x: number; width: number; label: string }) {
  return <g><rect x={x} y="22" width={width} height="38" rx="4" fill="var(--color-ink-2)" stroke="var(--color-line-2)" /><text x={x + width / 2} y="45" textAnchor="middle">{label}</text></g>;
}
