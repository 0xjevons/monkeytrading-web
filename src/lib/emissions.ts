/** Normalized schedule model from the canonical ten-minute MONKEY allocation proposal. */

// Equal-length half-years; this is a mathematical ceiling, not the final calendar or minted supply.
export const SCHEDULE_HALF_YEARS = [0, 1, 2, 3, 4] as const;

/** Cumulative scheduled allocation in basis points of the original maximum after full half-years. */
export function scheduledAllocationBps(halfYears: number): number {
  return Math.trunc(10_000 * (1 - 2 ** -halfYears));
}
