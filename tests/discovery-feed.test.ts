import { describe, expect, test } from "bun:test";
import {
  filterRankedFeed,
  impressionAudit,
  rankEligibleStartups,
} from "../src/lib/marketplace/discovery-feed";
import type { InvestorWithThesis, StartupWithData } from "../src/lib/domain";

function startup(partial: Partial<StartupWithData> & { id: string; name: string }): StartupWithData {
  return {
    org_id: "org",
    visibility: "public",
    is_demo: false,
    sector: "AI",
    stage: "Seed",
    geography: "United States",
    funding_ask: 2_000_000,
    summary: "An AI company",
    tags: [],
    metrics: [],
    provenance: [],
    materials: [],
    ...partial,
  } as StartupWithData;
}

function investor(): InvestorWithThesis {
  return {
    id: "inv",
    org_id: "firm",
    is_demo: false,
    thesis: {
      investor_id: "inv",
      sectors: ["AI"],
      stages: ["Seed"],
      geographies: ["United States"],
      exclusions: [],
      check_min: 250_000,
      updated_at: "2026-09-17T00:00:00Z",
    },
  } as InvestorWithThesis;
}

describe("production discovery feed ranking", () => {
  test("assigns 1-based rank positions from rules-v1 order", () => {
    const a = startup({ id: "a", name: "Alpha", sector: "Climate" });
    const b = startup({ id: "b", name: "Beta", sector: "AI" });
    const ranked = rankEligibleStartups([a, b], investor());
    expect(ranked[0]?.startup.id).toBe("b");
    expect(ranked[0]?.rankPosition).toBe(1);
    expect(ranked[1]?.rankPosition).toBe(2);
    const audit = impressionAudit(ranked);
    expect(audit[0]).toMatchObject({ startupId: "b", rankPosition: 1, scoreVersion: "rules-v1" });
    expect(audit[0]?.score).toBeGreaterThan(0);
  });

  test("client filters only hide already-eligible ranked cards", () => {
    const ranked = rankEligibleStartups(
      [
        startup({ id: "a", name: "Alpha", sector: "AI", stage: "Seed" }),
        startup({ id: "b", name: "Beta Health", sector: "Healthcare", stage: "Seed" }),
      ],
      investor(),
    );
    const filtered = filterRankedFeed(ranked, {
      sector: "Healthcare",
      stage: "All stages",
      query: "",
    });
    expect(filtered.map((row) => row.startup.id)).toEqual(["b"]);
  });
});
