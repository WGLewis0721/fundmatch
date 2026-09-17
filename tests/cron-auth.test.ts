import { afterEach, describe, expect, test } from "bun:test";
import { authenticateCronRequest } from "../src/integrations/supabase/cron-auth";

const originalCron = process.env["CRON_SECRET"];
const originalFundMatch = process.env["FUNDMATCH_CRON_SECRET"];
const originalPrevious = process.env["FUNDMATCH_CRON_SECRET_PREVIOUS"];

afterEach(() => {
  if (originalCron === undefined) delete process.env["CRON_SECRET"];
  else process.env["CRON_SECRET"] = originalCron;
  if (originalFundMatch === undefined) delete process.env["FUNDMATCH_CRON_SECRET"];
  else process.env["FUNDMATCH_CRON_SECRET"] = originalFundMatch;
  if (originalPrevious === undefined) delete process.env["FUNDMATCH_CRON_SECRET_PREVIOUS"];
  else process.env["FUNDMATCH_CRON_SECRET_PREVIOUS"] = originalPrevious;
});

function request(token?: string) {
  return new Request("https://fundmatch.test/api/agentic-worker", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("cron authentication", () => {
  test("fails closed when no cron secret is configured", async () => {
    delete process.env["CRON_SECRET"];
    delete process.env["FUNDMATCH_CRON_SECRET"];
    delete process.env["FUNDMATCH_CRON_SECRET_PREVIOUS"];

    const denied = await authenticateCronRequest(request("anything"));
    expect(denied?.status).toBe(500);
  });

  test("rejects a wrong bearer token", async () => {
    process.env["CRON_SECRET"] = "current-secret";
    delete process.env["FUNDMATCH_CRON_SECRET"];
    delete process.env["FUNDMATCH_CRON_SECRET_PREVIOUS"];

    const denied = await authenticateCronRequest(request("wrong-secret"));
    expect(denied?.status).toBe(401);
  });

  test("accepts Vercel CRON_SECRET", async () => {
    process.env["CRON_SECRET"] = "vercel-secret";
    delete process.env["FUNDMATCH_CRON_SECRET"];

    expect(await authenticateCronRequest(request("vercel-secret"))).toBeNull();
  });

  test("keeps the FundMatch secret as a compatibility fallback", async () => {
    delete process.env["CRON_SECRET"];
    process.env["FUNDMATCH_CRON_SECRET"] = "legacy-secret";

    expect(await authenticateCronRequest(request("legacy-secret"))).toBeNull();
  });
});
