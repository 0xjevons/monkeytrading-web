/** Source-grounded trading rules and the dated pre-launch delivery targets. */

export type RuleKind = "counterparty" | "pricing" | "spreads" | "profit" | "financing" | "loss" | "sessions" | "capacity" | "custody" | "ownership" | "accounting";

export interface Rule {
  kind: RuleKind;
  title: string;
  detail: string;
  example: string;
}

// Trading mechanics follow the engine README; token and settlement policy follow the Content Studio.
export const RULES: readonly Rule[] = [
  { kind: "counterparty", title: "The house takes the other side", detail: "You can open a position without waiting for another trader to match it. The house takes the opposite exposure, subject to its capital and risk limits.", example: "Your long position ↔ the house’s short exposure" },
  { kind: "pricing", title: "Prices come from several venues", detail: "The engine uses the median of fresh quotes from independent venues. It stops quoting when too few sources remain or their prices disagree beyond the market’s limit.", example: "100 · 101 · 102 → median 101" },
  { kind: "spreads", title: "Spreads depend on size and risk", detail: "Orders within the normal size bands pay no spread unless stress or account adjustments apply. Larger positions can pay a size spread. Repeatedly trading just before prices move against the house can also increase your spread.", example: "Reference price, adjusted for the spreads that apply" },
  { kind: "profit", title: "The house charges a fee on profits", detail: "Closing at a profit incurs a fee on the realised gain. Closing at a loss incurs no profit fee. Spread charges and overnight financing are separate.", example: "Realised gain → your proceeds + house profit fee" },
  { kind: "financing", title: "Overnight positions accrue financing", detail: "Holding a position through daily rollover can incur a financing charge or credit. The amount uses a benchmark rate and markup, with the calculation depending on the market and whether you are long or short.", example: "Open position → daily rollover → financing" },
  { kind: "loss", title: "Losses stop at your account balance", detail: "Your positions share the margin in your account. The engine closes positions when equity falls below the close-out threshold. If a gap creates a loss beyond the account balance, the house absorbs the excess.", example: "Account balance is at risk; no debt beyond it" },
  { kind: "sessions", title: "Trading follows each market’s hours", detail: "Markets follow their trading sessions, holidays and early closes. A resting order can fill at the next eligible price after reopening, which may be far from the previous close.", example: "Friday close → market gap → next opening price" },
  { kind: "capacity", title: "House exposure limits new positions", detail: "The engine limits the house’s net exposure in each market and across the account book. It refuses new risk that exceeds those limits, even when your account has enough margin.", example: "Existing exposure + your order ≤ applicable cap" },
  { kind: "custody", title: "Withdrawals wait for daily settlement", detail: "The custody system holds USDC in an onchain vault. Withdrawal requests wait for the daily state check before funds can be released.", example: "Intraday requests → daily verification → eligible release" },
  { kind: "ownership", title: "Trader losses share the MONKEY budget", detail: "Accounts with eligible realised losses share a fixed MONKEY budget every ten minutes. Holders stake or delegate their tokens to choose operators.", example: "Eligible losses → MONKEY → stake or delegate" },
  { kind: "accounting", title: "You can replay the account history", detail: "The engine publishes its ordered commands and signed state checkpoints. You can replay the commands and compare the calculated balances with those checkpoints. An account proof checks that your balance is included in a published state.", example: "Commands → replay → compare state roots" },
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
