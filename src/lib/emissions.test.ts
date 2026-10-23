/** The normalized model does not assume an absolute supply or a minting rate per dollar. */
import { describe, expect, it } from "vitest";

import { scheduledAllocationBps } from "./emissions";

describe("scheduledAllocationBps", () => {
  it("starts at zero and reaches 50, 75, 87.5 and 93.75 percent over four half-years", () => {
    expect([0, 1, 2, 3, 4].map(scheduledAllocationBps)).toEqual([0, 5000, 7500, 8750, 9375]);
  });
  it("adds half as much scheduled allocation in each successive half-year", () => {
    expect([1, 2, 3, 4].map((period) => scheduledAllocationBps(period) - scheduledAllocationBps(period - 1))).toEqual([5000, 2500, 1250, 625]);
  });
});
