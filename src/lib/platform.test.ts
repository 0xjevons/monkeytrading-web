/** Unit conversions used by the illustrative sizing controls. */
import { describe, expect, it } from "vitest";

import { previewMarginCents } from "./platform";

describe("previewMarginCents", () => {
  it("computes margin from dollar-cent notional and leverage", () => {
    expect(previewMarginCents(10_000_000, 10)).toBe(1_000_000);
    expect(previewMarginCents(10_000_000, 50)).toBe(200_000);
  });
  it("truncates sub-cent amounts and handles unlevered or zero exposure", () => {
    expect(previewMarginCents(100, 3)).toBe(33);
    expect(previewMarginCents(100, 1)).toBe(100);
    expect(previewMarginCents(0, 10)).toBe(0);
  });
});
