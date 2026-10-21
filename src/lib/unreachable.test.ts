/** Tests for the exhaustiveness check. */

import { describe, expect, it } from "vitest";

import { unreachable } from "./unreachable";

describe("unreachable", () => {
  it("throws, naming where and the value, if a value outside its type gets there", () => {
    // Only a value the type system was told is impossible can reach it, so the test has to say so.
    const impossible = { status: "unknown" } as never;
    expect(() => unreachable(impossible, "indexNote")).toThrow('indexNote: unhandled value {"status":"unknown"}');
  });
});
