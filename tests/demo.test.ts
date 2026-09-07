import { describe, expect, test } from "bun:test";
import { initialState, StateSchema, fit, makeTasks, safeUrl } from "../src/lib/demo-data";

describe("FundMatch demo behavior", () => {
  test("thesis edits alter fit and exclusions penalize matching companies", () => {
    const state = initialState();
    const dippi = state.companies[0]!;
    const baseline = fit(dippi, state.thesis);
    const changed = fit(dippi, { ...state.thesis, sectors: ["Climate"], stages: ["Series B"] });
    expect(changed.score).toBeLessThan(baseline.score);
    const excluded = fit(dippi, { ...state.thesis, exclusions: ["Alcohol"] });
    expect(excluded.score).toBeLessThan(baseline.score);
    expect(excluded.rationale.some((r) => r.key === "exclusions")).toBe(true);
  });
  test("saved state round-trips and corrupt or incompatible storage is rejected", () => {
    const state = initialState();
    state.decisions["dippi"] = "interested";
    state.pipeline["dippi"] = "Meeting";
    state.notes.push({
      id: "note",
      company: "dippi",
      text: "Review unit economics",
      date: "2026-09-07T00:00:00Z",
    });
    state.tasks["dippi:vc"] = makeTasks("vc");
    state.tasks["dippi:vc"][0]!.status = "Complete";
    expect(StateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(StateSchema.safeParse({ ...state, companies: [] }).success).toBe(false);
    expect(StateSchema.safeParse({ ...state, version: 0 }).success).toBe(false);
    expect(StateSchema.safeParse({ ...state, pipeline: { dippi: "bogus" } }).success).toBe(false);
  });
  test("readiness templates are independent and begin honestly incomplete", () => {
    const vc = makeTasks("vc"),
      pe = makeTasks("pe");
    expect(vc.every((x) => x.status === "Missing")).toBe(true);
    expect(pe.some((x) => x.title === "Earnings quality & adjustments")).toBe(true);
    expect(vc.some((x) => x.title === "Earnings quality & adjustments")).toBe(false);
    vc[0]!.status = "Complete";
    expect(makeTasks("vc")[0]!.status).toBe("Missing");
    expect(new Set(vc.map((t) => t.id)).size).toBe(vc.length);
  });
  test("external links reject executable and invalid schemes", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///etc/passwd",
      "not-a-url",
    ])
      expect(safeUrl(value)).toBe(false);
    expect(safeUrl("https://example.com/deck")).toBe(true);
  });
});
