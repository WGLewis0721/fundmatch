import { test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileIntelligence } from "../src/components/intelligence/profile-intelligence";
import { extractLiteral } from "../src/lib/intelligence/extraction";
import { confirmExtraction } from "../src/lib/intelligence/review";
const preferences = {
  sectors: ["Consumer"],
  stages: [],
  geographies: [],
  businessModels: [],
  exclusions: [],
  checkMin: null,
  checkMax: null,
  currency: "USD",
  minGrowth: null,
};
test("server rendering never invokes PDF or AI and shows explicit unavailable state", () => {
  const html = renderToStaticMarkup(
    <ProfileIntelligence profileId="fixture" preferences={preferences} />,
  );
  expect(html).toContain("AI and private storage are not connected");
  expect(html).toContain("No confirmed claims yet");
  expect(html).toContain('aria-label="Upload deck"');
  expect(html).not.toContain("Confirmed profile saved");
});
test("untrusted confirmed text is escaped in profile display", () => {
  const ex = extractLiteral({
    id: "doc",
    name: "fixture.txt",
    sha256: "a".repeat(64),
    pages: [{ number: 1, text: "Description: <img src=x onerror=alert(1)>" }],
  });
  const profile = confirmExtraction(
    ex,
    {
      extractionId: ex.id,
      expectedVersion: 0,
      idempotencyKey: "safe-test-key",
      decisions: [{ claimId: ex.claims[0]!.id, action: "accept" }],
    },
    { id: "fixture", version: 0, claims: [] },
    "reviewer",
  );
  const html = renderToStaticMarkup(
    <ProfileIntelligence profileId="fixture" initialProfile={profile} preferences={preferences} />,
  );
  expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("Not a funding probability");
  expect(html).toContain("Confirm suggestion for review");
});
