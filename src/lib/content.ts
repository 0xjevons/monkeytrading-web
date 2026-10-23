/** Source-grounded trading rules and the dated pre-launch delivery targets. */

export type RuleKind = "counterparty" | "pricing" | "spreads" | "profit" | "financing" | "loss" | "sessions" | "capacity" | "custody" | "ownership" | "accounting";

export interface Rule {
  kind: RuleKind;
  title: string;
  detail: string;
  example: string;
  planned?: boolean;
}

// Trading mechanics follow the engine README; token and settlement policy follow the Content Studio.
export const RULES: readonly Rule[] = [
  { kind: "counterparty", title: "Trade against the protocol house", detail: "The house takes the other side of each position. Available size depends on its risk capacity, without waiting for a matching trader.", example: "Your long position ↔ the house’s short exposure" },
  { kind: "pricing", title: "One reference, several sources", detail: "Recent independent venue quotes form a median reference. Too few fresh sources or excessive disagreement means no executable price.", example: "100 · 101 · 102 → median 101" },
  { kind: "spreads", title: "Spreads follow the risk you add", detail: "Ordinary orders have no spread. Size bands, market stress and house exposure can add one; consistently adverse markouts can add an account spread.", example: "Base reference + applicable risk adjustments" },
  { kind: "profit", title: "A share of realised wins", detail: "The profit fee applies to realised gains, with no profit fee on losses. Spreads and financing remain separate parts of trading cost.", example: "Realised gain → your proceeds + house profit fee" },
  { kind: "financing", title: "Carry has a daily price", detail: "Positions crossing rollover pay or receive financing at a benchmark rate with a markup. Direction and market determine the cash flow.", example: "Open position → daily rollover → financing" },
  { kind: "loss", title: "Your account sets the loss limit", detail: "Positions share account margin. Close-out reduces risk when equity is too low; losses beyond the account balance fall on the house.", example: "Account balance is at risk; no debt beyond it" },
  { kind: "sessions", title: "Global markets keep local hours", detail: "Exchange sessions, holidays and early closes apply. Resting orders fill at the first eligible reopening price, including any gap.", example: "Friday close → market gap → next opening price" },
  { kind: "capacity", title: "Size is bounded by house exposure", detail: "Per-market and aggregate net-exposure caps limit new risk. Their thresholds use house net asset value and fixed floors; capital does not provide unlimited fills.", example: "Existing exposure + your order ≤ applicable cap" },
  { kind: "custody", title: "Fast trading, daily custody release", detail: "USDC belongs in an onchain vault. The intended design queues withdrawals until verified daily settlement; execution and withdrawal eligibility have different clocks.", example: "Intraday requests → daily verification → eligible release", planned: true },
  { kind: "ownership", title: "Participation can become ownership", detail: "Eligible realised losses share each ten-minute MONKEY budget. Staking and delegation are intended to connect trader ownership with operator governance.", example: "Eligible losses → MONKEY → stake or delegate", planned: true },
  { kind: "accounting", title: "Check the record behind your balance", detail: "The ordered command history and state checkpoints support independent replay. Account membership proofs check inclusion; replay checks the transitions.", example: "Commands → replay → compare state roots" },
];

export const ASSET_CLASSES = [
  { name: "Crypto", symbols: "BTC / ETH", hours: "Continuous markets" },
  { name: "FX", symbols: "EUR/USD · USD/JPY", hours: "Global currency sessions" },
  { name: "Indices", symbols: "US 500 · Germany 40", hours: "Exchange calendars" },
  { name: "Commodities", symbols: "Gold · Oil", hours: "Defined reference contracts" },
  { name: "Equities", symbols: "Individual shares", hours: "Local market hours" },
] as const;

export interface RoadmapWeek {
  dates: string;
  title: string;
  items: readonly { name: string; state: "Todo" | "In Progress" | "Done" }[];
}

export const ROADMAP: readonly RoadmapWeek[] = [
  { dates: "23–29 Oct", title: "Execution & risk core", items: [
    { name: "Pricing, margin, close-out, fees and exposure caps", state: "Done" },
    { name: "Deterministic history, replay and account proofs", state: "Done" },
  ] },
  { dates: "30 Oct–5 Nov", title: "Custody & resilience", items: [
    { name: "USDC vault deposit path", state: "Done" },
    { name: "Withdrawal gates, recovery and failure testing", state: "In Progress" },
  ] },
  { dates: "6–12 Nov", title: "Market data & benchmarks", items: [
    { name: "Live crypto venue adapters", state: "Done" },
    { name: "Cross-asset data, capacity and latency benchmarks", state: "In Progress" },
  ] },
  { dates: "13–19 Nov", title: "MONKEY emissions & staking", items: [
    { name: "Ten-minute budgets, halving and cancellation accounting", state: "Todo" },
    { name: "Staking and delegation contracts", state: "Todo" },
  ] },
  { dates: "20–26 Nov", title: "Attested operators & governance", items: [
    { name: "TEE hardware infrastructure and verification", state: "In Progress" },
    { name: "Registry, operator selection and daily handover", state: "Todo" },
  ] },
  { dates: "27 Nov–3 Dec", title: "Genesis & public rollout", items: [
    { name: "Security, access policy and genesis disclosures", state: "Todo" },
    { name: "Permissioned testing, then readiness for public access", state: "Todo" },
  ] },
];
