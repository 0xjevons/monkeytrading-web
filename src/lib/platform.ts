/** Illustrative platform values; none are market data, measured capacity or launch limits. */

export const WATCHLIST = [
  { symbol: "BTC / USD", asset: "Bitcoin", price: "67,420.00", move: "+2.41%", up: true },
  { symbol: "ETH / USD", asset: "Ethereum", price: "2,614.80", move: "+1.82%", up: true },
  { symbol: "EUR / USD", asset: "Euro / US Dollar", price: "1.0824", move: "−0.18%", up: false },
  { symbol: "US 500", asset: "US equity index", price: "5,842.50", move: "+0.63%", up: true },
  { symbol: "XAU / USD", asset: "Gold", price: "2,731.20", move: "+0.92%", up: true },
] as const;

export const CANDLE_CLOSES = [158, 150, 164, 145, 138, 153, 128, 119, 132, 106, 110, 92, 102, 89, 71, 79, 66, 84, 75, 60, 67, 42, 54, 37, 49, 30, 39, 23] as const;

/** Illustrative required margin in cents, truncated as in fixed-point engine arithmetic. */
export function previewMarginCents(notionalCents: number, leverage: number): number {
  return Math.trunc(notionalCents / leverage);
}
