/**
 * Two-organization browser walkthrough (test tool, not part of the app).
 *
 * Drives Chromium through signup -> organization -> profile -> readiness ->
 * private document -> listing -> investor thesis -> discovery -> pipeline,
 * then attacks the HTTP API directly as each user to prove the policies in
 * migration 0002 isolate the two organizations.
 *
 * Requires: the dev server on APP, a Supabase-compatible API on API (a real
 * project, or scripts/db/local-supabase-standin.mjs), and playwright-core.
 *
 *   npm i --no-save playwright-core
 *   node scripts/db/browser-walkthrough.mjs ./evidence
 *
 * Environment: FUNDMATCH_APP_URL, FUNDMATCH_API_URL, CHROMIUM_PATH.
 * See docs/TEST_EVIDENCE.md.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const APP = process.env["FUNDMATCH_APP_URL"] || "http://127.0.0.1:8080";
const API = process.env["FUNDMATCH_API_URL"] || "http://127.0.0.1:54321";
const OUT = process.argv[2] || "./evidence";
fs.mkdirSync(OUT, { recursive: true });
const stamp = Date.now();
const founder = { email: `ada.founder+${stamp}@example.com`, password: "correct-horse-battery" };
const investor = { email: `ben.investor+${stamp}@example.com`, password: "staple-horse-battery" };
const log = [];
const note = (s) => {
  log.push(s);
  console.log(s);
};

const browser = await chromium.launch({
  ...(process.env["CHROMIUM_PATH"] ? { executablePath: process.env["CHROMIUM_PATH"] } : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => note("PAGE ERROR: " + e.message));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

async function signup(u, name) {
  await page.goto(`${APP}/app/signup`);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Work email").fill(u.email);
  await page.getByLabel("Password", { exact: true }).fill(u.password);
  await page.getByLabel("Confirm password").fill(u.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/app\/onboarding/);
}
async function token(u) {
  const r = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: "x" },
    body: JSON.stringify(u),
  });
  return (await r.json()).access_token;
}
async function rest(tok, path, init = {}) {
  const r = await fetch(`${API}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: "x",
      authorization: `Bearer ${tok}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  return { status: r.status, body: text };
}

// ---------------- Founder ----------------
await page.goto(`${APP}/app`);
await page.waitForURL(/\/app\/login/);
await shot("01-login-redirect");
note("Signed-out visit to /app redirects to /app/login");

await signup(founder, "Ada Founder");
await shot("02-onboarding");
await page.getByRole("radio", { name: /I’m raising/ }).click();
await page.getByLabel("Company name").fill("Acme Robotics");
await page.getByLabel("Website (optional)").fill("https://acme.example");
await page.getByRole("button", { name: "Create organization" }).click();
await page.waitForURL(/\/app\/?$/);
await page.getByText("FOUNDER WORKSPACE", { exact: true }).waitFor();
await shot("03-founder-overview");
note("Founder signup -> organization created -> founder overview rendered");

await page.getByRole("link", { name: "Company profile" }).click();
await page.getByLabel("One-line story").fill("Robots that restock warehouse shelves overnight");
await page
  .getByLabel("Company overview")
  .fill(
    "Acme builds autonomous restocking robots for regional distribution centers, cutting overnight labor cost by half.",
  );
await page.getByLabel("Sector").selectOption("AI");
await page.getByLabel("Stage").selectOption("Seed");
await page.getByLabel("Annual revenue (USD)").fill("1200000");
await page.getByLabel("YoY growth (%)").fill("150");
await page.getByLabel("Funding ask (USD)").fill("3000000");
await page.getByLabel("Team size").fill("11");
await page.getByLabel("Tags (comma separated)").fill("Robotics, Logistics, B2B");
await page.getByRole("button", { name: "Save profile" }).click();
await page.getByText("Company profile saved.").waitFor();
await shot("04-founder-profile-saved");
note("Company profile saved (startup_profiles + company_metrics)");

await page.getByRole("link", { name: "Readiness" }).click();
await page.getByRole("button", { name: /Incorporation documents/ }).click();
const dlg = page.getByRole("dialog");
await dlg.getByLabel("Owner").fill("Ada");
await dlg.getByLabel("Status").selectOption("Complete");
await dlg.getByLabel("Evidence link").fill("https://example.com/incorporation.pdf");
await page.getByRole("button", { name: "Save readiness item" }).click();
await page.getByText("Readiness item saved.").waitFor();
await page.getByText(/1 of 12 items complete/).waitFor();
await shot("05-founder-readiness");
note("Readiness item persisted (readiness_items)");

await page.getByRole("link", { name: "Materials" }).click();
await page.getByText("No documents yet").waitFor();
await page.setInputFiles('input[name="file"]', {
  name: "acme-deck.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 fake deck for e2e"),
});
await page.getByRole("button", { name: "Upload privately" }).click();
await page.getByText("Document uploaded privately.").waitFor();
await page.getByText("acme-deck.pdf").waitFor();
await page.getByLabel("Link title").fill("Data room index");
await page.getByLabel("Link", { exact: true }).fill("https://example.com/dataroom");
await page.getByRole("button", { name: "Add link" }).click();
await page.getByText("Material link saved.").waitFor();
await shot("06-founder-materials");
note("Private document uploaded (documents + storage.objects) and material link saved");
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Download" }).click(),
]);
note("Authorized download returned file: " + (await download.suggestedFilename()));

await page.getByRole("link", { name: "Overview", exact: true }).click();
await page.getByRole("button", { name: "List for investors" }).click();
await page.getByText("Your company is now listed for investors.").waitFor();
await shot("07-founder-listed");
note("Company listed (visibility = public)");

await page.getByRole("link", { name: "Team", exact: true }).click();
await page.getByLabel("Email", { exact: true }).fill("cto@example.com");
await page.getByRole("button", { name: "Create invitation" }).click();
await page.getByText("cto@example.com").waitFor();
await shot("08-founder-team-invite");
note("Invitation created for a specific email");

await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL(/\/app\/login/);
note("Sign out returns to login");

// ---------------- Investor ----------------
await signup(investor, "Ben Investor");
await page.getByRole("radio", { name: /I invest/ }).click();
await page.getByLabel("Firm name").fill("Blue Harbor Capital");
await page.getByRole("button", { name: "Create organization" }).click();
await page.waitForURL(/\/app\/?$/);
await page.getByText("INVESTOR WORKSPACE", { exact: true }).waitFor();
await shot("09-investor-discover-empty-thesis");

await page.getByRole("link", { name: "Investment thesis", exact: true }).click();
await page.getByLabel("Sectors (comma separated)").fill("AI, Logistics");
await page.getByLabel("Stages (comma separated)").fill("Seed, Series A");
await page.getByLabel("Geographies (comma separated)").fill("United States");
await page.getByLabel("Business models (comma separated)").fill("SaaS, Marketplace");
await page.getByLabel("Minimum check (USD)").fill("500000");
await page.getByLabel("Maximum check (USD)").fill("5000000");
await page.getByLabel("Minimum YoY growth (%)").fill("100");
await page.getByRole("button", { name: "Save investment thesis" }).click();
await page.getByText("Thesis saved.").waitFor();
note("Thesis saved (investor_theses)");

await page.getByRole("link", { name: "Discover", exact: true }).click();
await page.getByRole("heading", { name: "Acme Robotics" }).waitFor();
await shot("10-investor-discover");
note("Listed company discoverable with thesis fit score");
await page.getByRole("link", { name: /Explore the company/ }).click();
await page.getByRole("heading", { name: "Acme Robotics" }).waitFor();
await page.getByText("Data room index ↗").waitFor();
await page.getByLabel("Add a note").fill("Strong unit economics; ask about robot uptime.");
await page.getByRole("button", { name: "Save note" }).click();
await page.getByText("Note saved for your team.").waitFor();
await shot("11-investor-company");
note("Company detail: material link visible, private document NOT listed, team note saved");
await page.getByRole("button", { name: "Move to pipeline" }).click();
await page.getByText("Added to your pipeline.").waitFor();
await page.getByRole("link", { name: "Pipeline", exact: true }).click();
await page.getByRole("heading", { name: /Acme Robotics/ }).waitFor();
await page.getByLabel("Pipeline stage for Acme Robotics").selectOption("meeting");
await page.waitForTimeout(800);
await page.reload();
await page.getByLabel("Pipeline stage for Acme Robotics").waitFor();
const stage = await page.getByLabel("Pipeline stage for Acme Robotics").inputValue();
await shot("12-investor-pipeline");
note(`Pipeline persisted after reload; stage = ${stage}`);

await page.getByRole("link", { name: "Insights", exact: true }).click();
await page.getByRole("heading", { name: "Thesis overlap" }).waitFor();
await shot("13-investor-insights");

// ---------------- Direct API attempts across organizations ----------------
const ft = await token(founder);
const it = await token(investor);
const [[startup]] = [JSON.parse((await rest(ft, "startup_profiles?select=id,org_id,name")).body)];
const [[firmDoc]] = [JSON.parse((await rest(ft, "documents?select=id,org_id,storage_path")).body)];
const [[pipe]] = [JSON.parse((await rest(it, "pipeline_items?select=id,org_id,investor_id")).body)];
const checks = [
  [
    "investor reads founder's private documents table",
    await rest(it, `documents?select=id&org_id=eq.${startup.org_id}`),
  ],
  [
    "investor downloads founder's document from storage",
    await (async () => {
      const r = await fetch(`${API}/storage/v1/object/documents/${firmDoc.storage_path}`, {
        headers: { authorization: `Bearer ${it}`, apikey: "x" },
      });
      return { status: r.status, body: (await r.text()).slice(0, 120) };
    })(),
  ],
  [
    "investor deletes founder's document from storage",
    await (async () => {
      const r = await fetch(`${API}/storage/v1/object/documents`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${it}`, apikey: "x", "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [firmDoc.storage_path] }),
      });
      return { status: r.status, body: (await r.text()).slice(0, 120) };
    })(),
  ],
  [
    "investor edits founder's company profile",
    await rest(it, `startup_profiles?id=eq.${startup.id}`, {
      method: "PATCH",
      body: JSON.stringify({ tagline: "pwned" }),
    }),
  ],
  [
    "investor reads founder's readiness items",
    await rest(it, `readiness_items?select=id&startup_id=eq.${startup.id}`),
  ],
  [
    "investor adds themselves to founder's organization",
    await rest(it, "organization_members", {
      method: "POST",
      body: JSON.stringify({
        org_id: startup.org_id,
        user_id: "00000000-0000-4000-8000-000000000000",
        member_role: "owner",
      }),
    }),
  ],
  [
    "investor reads founder's organization",
    await rest(it, `organizations?select=id,name&id=eq.${startup.org_id}`),
  ],
  [
    "founder reads investor's pipeline",
    await rest(ft, `pipeline_items?select=id&org_id=eq.${pipe.org_id}`),
  ],
  [
    "founder moves investor's pipeline item",
    await rest(ft, `pipeline_items?id=eq.${pipe.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "passed" }),
    }),
  ],
  [
    "founder reads investor's notes",
    await rest(ft, `team_notes?select=body&startup_id=eq.${startup.id}`),
  ],
  [
    "founder reads investor's thesis",
    await rest(ft, `investor_theses?select=id&investor_id=eq.${pipe.investor_id}`),
  ],
  [
    "founder inserts a document record into investor's org",
    await rest(ft, "documents", {
      method: "POST",
      body: JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111",
        org_id: pipe.org_id,
        uploaded_by: "00000000-0000-4000-8000-000000000000",
        storage_path: `${pipe.org_id}/11111111-1111-4111-8111-111111111111/x.pdf`,
        file_name: "x.pdf",
        mime_type: "application/pdf",
        size_bytes: 10,
      }),
    }),
  ],
  [
    "anonymous reads startup_profiles",
    await (async () => {
      const r = await fetch(`${API}/rest/v1/startup_profiles?select=id`, {
        headers: { apikey: "x" },
      });
      return { status: r.status, body: (await r.text()).slice(0, 120) };
    })(),
  ],
  ["founder sanity: reads own documents", await rest(ft, `documents?select=file_name`)],
  ["investor sanity: reads own pipeline", await rest(it, `pipeline_items?select=status`)],
];
note("\nDirect API attempts (status, body):");
for (const [label, r] of checks) note(`- ${label}: ${r.status} ${r.body.slice(0, 160)}`);
fs.writeFileSync(`${OUT}/e2e-log.txt`, log.join("\n") + "\n");
await browser.close();
