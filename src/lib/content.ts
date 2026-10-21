/**
 * The site's claims about the engine, in one place. Every statement here must match the engine
 * repository's README; anything not yet built is marked `building`.
 */

export interface Rule {
  title: string;
  detail: string;
  /** Not yet built; shown with an "in build" tag. */
  building?: boolean;
}

export const RULES: readonly Rule[] = [
  {
    title: "The house takes the other side.",
    detail: "Every order trades against the house at a reference price, as with a conventional CFD broker.",
  },
  {
    title: "Orders fill at the median.",
    detail: "The reference price is the median of recent quotes from several independent venues.",
  },
  {
    title: "No price beats a bad price.",
    detail: "If too few venues have quoted recently, or their quotes disagree by more than a set margin, nothing fills.",
  },
  {
    title: "Ordinary orders pay no spread.",
    detail:
      "A spread applies only to very large positions, at times of stress, and to accounts whose trades are consistently followed by a move in their favour.",
  },
  {
    title: "Losing trades pay nothing.",
    detail: "Winning trades pay a fixed share of the profit they realise.",
  },
  {
    title: "Overnight positions pay or earn financing.",
    detail: "At the daily rollover, at a benchmark interest rate plus or minus a markup.",
  },
  {
    title: "Losses stop at your balance.",
    detail: "Margin is shared across an account. Losses beyond its balance fall on the house, never on the trader.",
  },
  {
    title: "Markets keep their hours.",
    detail:
      "Real-world markets keep their exchange's hours, holidays, and early closes. Orders resting over a close fill at the first price after the open, gap and all.",
  },
  {
    title: "The house caps its own risk.",
    detail:
      "Its net exposure is capped in each market, and across all of them, at the larger of a fraction of its net asset value and a fixed dollar floor.",
  },
  {
    title: "Collateral stays on-chain.",
    detail: "USDC, held in a vault contract on Arbitrum One. The chain safeguards funds and never executes trades.",
    building: true,
  },
  {
    title: "Losing trades mint ownership.",
    detail:
      "The MONKEY token, which represents ownership of the house, is minted to traders on their losing trades. Staked holders share, in USDC, the house's net asset value above a reserve floor.",
    building: true,
  },
  {
    title: "Every command is published.",
    detail: "Anyone can replay the log against the code and check the state hash at every checkpoint.",
  },
];

export const ASSET_CLASSES = ["Crypto-assets", "Currencies", "Stock indices", "Commodities", "Shares"] as const;

export interface StatusItem {
  name: string;
  state: "running" | "building";
  detail: string;
}

/** How the page and the shell name each status. */
export const STATUS_LABELS: Readonly<Record<StatusItem["state"], string>> = {
  running: "Runs locally",
  building: "In build",
};

export const STATUS: readonly StatusItem[] = [
  {
    name: "Engine core",
    state: "running",
    detail: "Pricing, spreads, margin and close-out, fees, financing, trading sessions, and exposure caps.",
  },
  {
    name: "Public log and replay",
    state: "running",
    detail:
      "Replay checks the state hash at every checkpoint, from a node's log or the archive it serves. Signature checks are in build.",
  },
  {
    name: "Live crypto prices",
    state: "running",
    detail: "BTC-USD and ETH-USD from Coinbase, Kraken, and Bitstamp, in place of simulated prices.",
  },
  {
    name: "Live prices for other markets",
    state: "building",
    detail: "Currencies, stock indices, commodities, and shares run on simulated prices today.",
  },
  {
    name: "Vault deposits",
    state: "running",
    detail:
      "USDC deposits to the vault contract, against a local chain, each credited once the batch holding it is posted to Ethereum.",
  },
  {
    name: "Withdrawals on Arbitrum One",
    state: "building",
    detail: "Withdrawals from the vault contract. The default local node uses mock custody.",
  },
  {
    name: "Hardware attestation",
    state: "building",
    detail: "Attestation on AMD SEV-SNP, and a verifier for it. The enclave is a mock today.",
  },
  {
    name: "MONKEY token",
    state: "building",
    detail: "Minting on losing trades, and staking against the house's net asset value.",
  },
];
