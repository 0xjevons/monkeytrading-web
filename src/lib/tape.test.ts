import { describe, expect, it } from "vitest";

import { CHECKPOINT_EVERY, createTape, type TapeEntry } from "./tape";

const take = (seed: number, n: number, firstSeq = 1): TapeEntry[] => {
  const tape = createTape(seed, firstSeq);
  const out: TapeEntry[] = [];
  while (out.length < n) out.push(...tape.next());
  return out;
};

describe("createTape", () => {
  it("is deterministic for a seed", () => {
    expect(take(7, 60)).toEqual(take(7, 60));
    expect(take(7, 10)).not.toEqual(take(8, 10));
  });

  it("numbers commands consecutively from the first seq", () => {
    const seqs = take(7, 40, 100)
      .filter((e) => e.kind === "command")
      .map((e) => e.seq);
    expect(seqs).toEqual(seqs.map((_, i) => 100 + i));
  });

  it("checkpoints every twelfth command with that command's root", () => {
    const entries = take(7, 60);
    entries.forEach((entry, i) => {
      if (entry.kind !== "checkpoint") return;
      const before = entries[i - 1]!;
      expect(entry.seq % CHECKPOINT_EVERY).toBe(0);
      expect(before).toMatchObject({ kind: "command", seq: entry.seq, root: entry.root });
    });
    const checkpoints = entries.filter((e) => e.kind === "checkpoint").map((e) => e.seq);
    expect(checkpoints.slice(0, 3)).toEqual([12, 24, 36]);
  });

  it("gives every command a new keccak-256 root", () => {
    const roots = take(7, 50)
      .filter((e) => e.kind === "command")
      .map((e) => e.root);
    expect(new Set(roots).size).toBe(roots.length);
    for (const root of roots) expect(root).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("rejects orders in a market whose last prices diverged", () => {
    const commands = take(1871, 2_000).filter((e) => e.kind === "command");
    const refusedOrders = commands.filter((e) => e.type === "ORDER" && e.refused);
    expect(refusedOrders.length).toBeGreaterThan(0);
    for (const order of refusedOrders) expect(order.result).toBe("rejected · no price");
  });
});
