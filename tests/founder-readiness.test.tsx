import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FounderProfileSchema,
  fromDemoCompany,
  fromStartup,
  packetFilename,
  packetMaterials,
  preparationChecks,
  readinessProgress,
} from "../src/lib/founder-readiness";
import { fit, initialState, makeTasks, StateSchema } from "../src/lib/demo-data";
import {
  PacketDocument,
  packetHtml,
  type PacketProps,
} from "../src/components/fundmatch/investor-packet";
import { FounderBuilder } from "../src/components/fundmatch/founder-builder";
import type { StartupWithData } from "../src/lib/domain";

const company = initialState().companies[0]!;
const profile = fromDemoCompany(company);
const props: PacketProps = {
  profile,
  materials: [],
  tasks: makeTasks("vc"),
  template: "vc",
  demo: true,
  generatedAt: "2026-09-10T12:00:00Z",
};

describe("founder profile and readiness", () => {
  test("blank numbers remain unknown; real zero and negative growth survive", () => {
    const draft = FounderProfileSchema.parse({
      ...profile,
      revenue: "",
      growth: -20,
      ask: "",
      team: "",
    });
    expect(draft.revenue).toBeNull();
    expect(draft.ask).toBeNull();
    expect(draft.team).toBeNull();
    expect(draft.growth).toBe(-20);
    expect(FounderProfileSchema.parse({ ...draft, revenue: 0 }).revenue).toBe(0);
    expect(FounderProfileSchema.safeParse({ ...draft, ask: -1 }).success).toBe(false);
    expect(FounderProfileSchema.safeParse({ ...draft, team: 1.5 }).success).toBe(false);
    expect(FounderProfileSchema.safeParse({ ...draft, revenue: Infinity }).success).toBe(false);
    expect(
      FounderProfileSchema.safeParse({ ...draft, website: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
  test("old saved demos migrate without data loss and new drafts round-trip", () => {
    const state = initialState();
    expect(StateSchema.parse(state)).toEqual(state);
    state.companies[0] = {
      ...company,
      story: "Founder supplied narrative",
      revenue: null,
      growth: null,
      ask: null,
      team: null,
    };
    const restored = StateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(restored.companies[0]!.story).toBe("Founder supplied narrative");
    expect(restored.companies[0]!.revenue).toBeNull();
    expect(Number.isFinite(fit(restored.companies[0]!, state.thesis).score)).toBe(true);
  });
  test("private workspace adapter does not turn absent metrics into zero", () => {
    const startup = {
      name: "Test",
      tagline: null,
      summary: null,
      story: null,
      sector: "AI",
      stage: "Seed",
      geography: "US",
      business_model: null,
      website: null,
      tags: [],
      metrics: [],
      funding_ask: null,
      team_size: null,
    } as unknown as StartupWithData;
    expect(fromStartup(startup).revenue).toBeNull();
    expect(fromStartup(startup).growth).toBeNull();
  });
  test("readiness presence does not auto-complete diligence", () => {
    const tasks = makeTasks("vc");
    const checks = preparationChecks({ ...profile, revenue: 0, story: "a".repeat(50) }, [], 1);
    expect(checks.find((c) => c.id === "revenue")!.complete).toBe(true);
    expect(checks.find((c) => c.id === "materials")!.complete).toBe(true);
    expect(readinessProgress(tasks).percent).toBe(0);
    expect(readinessProgress([])).toEqual({ complete: 0, total: 0, percent: 0 });
    tasks[0]!.status = "Complete";
    expect(readinessProgress(tasks).complete).toBe(1);
    expect(readinessProgress(makeTasks("pe")).complete).toBe(0);
  });
  test("builder can server-render without backend calls", () => {
    const html = renderToStaticMarkup(
      <FounderBuilder
        profile={profile}
        onSave={async () => {
          throw new Error("Must not run");
        }}
        onContinue={() => {}}
      />,
    );
    expect(html).toContain("Save draft");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Company basics");
  });
});

describe("investor packet sharing boundary", () => {
  const materials = [
    { id: "deck", title: "Shared deck", url: "https://example.com/deck" },
    { id: "secret", title: "Do not share", url: "https://example.com/secret" },
    { id: "bad", title: "Bad", url: "javascript:alert(1)" },
  ];
  test("external links require explicit selection and safe protocols", () => {
    expect(packetMaterials(materials, [])).toEqual([]);
    expect(packetMaterials(materials, ["deck", "bad"])).toEqual([materials[0]!]);
  });
  test("export escapes hostile text and has no executable content", async () => {
    const html = await packetHtml({
      ...props,
      profile: {
        ...profile,
        name: '<script>alert("x")</script>',
        summary: '<img src=x onerror="alert(1)">',
        website: "javascript:alert(1)",
      },
      materials: packetMaterials(materials, ["deck"]),
    });
    expect(html).toStartWith("<!doctype html>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("https://example.com/deck");
    expect(html).not.toContain("https://example.com/secret");
    expect(html).toContain("FICTIONAL DEMO");
  });
  test("extra internal records and checklist notes never enter the output", async () => {
    const privateData = {
      ...props,
      demo: false,
      documents: [
        { storage_path: "private-organization/private-deck.pdf", file_name: "secret-deck" },
      ],
      pendingSuggestions: [{ value: "FAKE-ARR-99M" }],
      tasks: [
        {
          ...makeTasks("vc")[0]!,
          notes: "CONFIDENTIAL-BOARD-NOTE",
          evidence: "https://secret.example/evidence",
          owner: "Private person",
        },
      ],
    };
    const html = await packetHtml(privateData);
    for (const secret of [
      "private-organization",
      "secret-deck",
      "FAKE-ARR-99M",
      "CONFIDENTIAL-BOARD-NOTE",
      "secret.example",
      "Private person",
    ])
      expect(html).not.toContain(secret);
    expect(html).toContain("Company-reported · not verified");
    expect(html).not.toContain("FICTIONAL DEMO");
  });
  test("unknown metrics and missing narrative are explicit", () => {
    const html = renderToStaticMarkup(
      <PacketDocument
        {...props}
        profile={{ ...profile, revenue: null, growth: null, ask: null, team: null, story: "" }}
      />,
    );
    expect(html).toContain("Not provided");
    expect(html).not.toContain("$0");
    expect(html).toContain("have not been provided");
    expect(html).toContain("Annual revenue (zero for pre-revenue) — not yet supplied");
  });
  test("packet filenames cannot inject a path", () => {
    expect(packetFilename("../../Dippi <script>")).toBe("Dippi-script-FundMatch-packet.html");
    expect(packetFilename("💰")).toBe("company-FundMatch-packet.html");
  });
});
