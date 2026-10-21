/** Tests for the replay demo: replaying the published log, tampering with it, and state roots. */

import { describe, expect, it } from "vitest";

import { canonicalJson, emptyState, replay, stateRoot, type LogEntry } from "./replay";
import { DEMO_LOG, TAMPERS, tamperLog } from "./replay-log";

const ROOT = /^0x[0-9a-f]{64}$/;

describe("replay", () => {
  it("reproduces every published root of the demo log", () => {
    const result = replay(DEMO_LOG);
    expect(result.ok).toBe(true);
    expect(result.steps.map((s) => s.seq)).toEqual(DEMO_LOG.map((e) => e.seq));
    expect(result.steps.every((s) => s.matches && s.root === s.published)).toBe(true);
  });

  it.each(TAMPERS.map((t) => [t.label, t] as const))("pins %s to the seq it edits", (_, tamper) => {
    const result = replay(tamperLog(DEMO_LOG, tamper));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("mismatch");
    expect(result.divergedAt).toBe(tamper.seq);
    // It stops at the first mismatch, after every earlier root matched.
    expect(result.steps).toHaveLength(tamper.seq);
    expect(result.steps.slice(0, -1).every((s) => s.matches)).toBe(true);
    const last = result.steps[result.steps.length - 1];
    expect(last?.matches).toBe(false);
    expect(result.message).toBe(
      `state root mismatch at seq ${tamper.seq}: log says ${last?.published}, replay gives ${last?.root}`,
    );
  });

  it("detects an edited published root as well as an edited command", () => {
    const log: LogEntry[] = DEMO_LOG.map((e) => (e.seq === 5 ? { ...e, root: `0x${"ab".repeat(32)}` } : e));
    const result = replay(log);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.divergedAt).toBe(5);
  });

  it("refuses a command out of sequence", () => {
    const log = DEMO_LOG.filter((e) => e.seq !== 4);
    const result = replay(log);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result).toEqual({
      ok: false,
      kind: "refused",
      steps: result.steps,
      divergedAt: 5,
      message: "applying seq 5: seq 5 out of sequence: expected 4",
    });
    expect(result.steps.map((s) => s.seq)).toEqual([1, 2, 3]);
  });

  it("leaves the published log untouched when tampering", () => {
    const before = JSON.stringify(DEMO_LOG);
    for (const tamper of TAMPERS) tamperLog(DEMO_LOG, tamper);
    expect(JSON.stringify(DEMO_LOG)).toBe(before);
  });
});

describe("state roots", () => {
  it("encodes keys in sorted order at every level", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { f: 1, e: null }], c: "x" } })).toBe(
      '{"a":{"c":"x","d":[2,{"e":null,"f":1}]},"b":1}',
    );
  });

  it("does not depend on the order fields were set in", () => {
    const one = { last_seq: 1, markets: {}, accounts: { a: { balance: 1, positions: {} } } };
    const two = { accounts: { a: { positions: {}, balance: 1 } }, markets: {}, last_seq: 1 };
    expect(stateRoot(one)).toBe(stateRoot(two));
  });

  it("is keccak-256 of the canonical encoding", () => {
    // keccak-256 (not SHA3-256) of '{"accounts":{},"last_seq":null,"markets":{}}', computed with an independent tool.
    expect(stateRoot(emptyState())).toMatch(ROOT);
    expect(stateRoot(emptyState())).toBe("0x81f74f13951f9ad2a0a9e40a3f2cdb1485f8b9971764e35f01232cda12d1a8e5");
  });
});
