import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";

const url = process.env["FUNDMATCH_TEST_DATABASE_URL"];
const maybe = url ? describe : describe.skip;

type Sql = ReturnType<typeof postgres>;
type Actor = { id: string; email: string };

maybe("Phase 5 helper-function privileges", () => {
  const sql: Sql = postgres(url ?? "postgres://invalid", { max: 1, onnotice: () => {} });
  const founder: Actor = { id: "", email: `helper-founder-${Date.now()}@example.com` };
  const investor: Actor = { id: "", email: `helper-investor-${Date.now()}@example.com` };
  let startupOrg = "";
  let firmOrg = "";
  let startupId = "";
  let investorId = "";

  async function as<T>(actor: Actor | null, fn: (tx: Sql) => Promise<T>): Promise<T> {
    return sql.begin(async (tx) => {
      const claims = actor
        ? { sub: actor.id, email: actor.email, role: "authenticated" }
        : { role: "anon" };
      await tx.unsafe(`select set_config('request.jwt.claims', '${JSON.stringify(claims)}', true)`);
      await tx.unsafe(`set local role ${actor ? "authenticated" : "anon"}`);
      return fn(tx as unknown as Sql);
    }) as Promise<T>;
  }

  async function expectDenied(promise: Promise<unknown>): Promise<void> {
    try {
      await promise;
    } catch (error) {
      expect((error as Error).message).toMatch(/permission denied/i);
      return;
    }
    throw new Error("expected permission denied");
  }

  beforeAll(async () => {
    for (const actor of [founder, investor]) {
      const [row] = await sql`insert into auth.users (email) values (${actor.email}) returning id`;
      actor.id = row!["id"] as string;
    }

    startupOrg = (
      await as(
        founder,
        (tx) => tx`select public.create_organization('Helper Test Startup', 'startup') as id`,
      )
    )[0]!["id"] as string;
    firmOrg = (
      await as(
        investor,
        (tx) => tx`select public.create_organization('Helper Test Firm', 'investment_firm') as id`,
      )
    )[0]!["id"] as string;

    startupId = (
      await as(founder, (tx) => tx`select id from public.startup_profiles where org_id = ${startupOrg}`)
    )[0]!["id"] as string;
    investorId = (
      await as(investor, (tx) => tx`select id from public.investor_profiles where org_id = ${firmOrg}`)
    )[0]!["id"] as string;
  });

  afterAll(async () => {
    await sql`delete from public.organizations where id in ${sql([startupOrg, firmOrg])}`;
    await sql`delete from public.profiles where id in ${sql([founder.id, investor.id])}`;
    await sql`delete from auth.users where id in ${sql([founder.id, investor.id])}`;
    await sql.end();
  });

  test("anonymous role cannot execute RLS SECURITY DEFINER helpers", async () => {
    const randomId = "00000000-0000-0000-0000-000000000001";
    await expectDenied(as(null, (tx) => tx`select public.is_org_member(${randomId}::uuid)`));
    await expectDenied(as(null, (tx) => tx`select public.startup_org(${randomId}::uuid)`));
    await expectDenied(as(null, (tx) => tx`select public.investor_org(${randomId}::uuid)`));
    await expectDenied(as(null, (tx) => tx`select public.can_view_startup(${randomId}::uuid)`));
  });

  test("trigger helpers are not executable by authenticated clients", async () => {
    const rows = await sql`
      select
        has_function_privilege('authenticated', 'public.guard_last_owner()', 'EXECUTE') as guard_last_owner,
        has_function_privilege('authenticated', 'public.guard_document_user_update()', 'EXECUTE') as guard_document,
        has_function_privilege('authenticated', 'public.delete_document_object()', 'EXECUTE') as delete_document,
        has_function_privilege('authenticated', 'public.touch_updated_at()', 'EXECUTE') as touch_updated_at,
        has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') as handle_new_user
    `;
    expect(rows[0]).toEqual({
      guard_last_owner: false,
      guard_document: false,
      delete_document: false,
      touch_updated_at: false,
      handle_new_user: false,
    });
  });

  test("organization lookup helpers reveal only the caller's organization", async () => {
    const founderOwn = await as(
      founder,
      (tx) => tx`select public.startup_org(${startupId}::uuid) as org_id`,
    );
    expect(founderOwn).toEqual([{ org_id: startupOrg }]);

    const investorOwn = await as(
      investor,
      (tx) => tx`select public.investor_org(${investorId}::uuid) as org_id`,
    );
    expect(investorOwn).toEqual([{ org_id: firmOrg }]);

    const investorLookingAtStartup = await as(
      investor,
      (tx) => tx`select public.startup_org(${startupId}::uuid) as org_id`,
    );
    expect(investorLookingAtStartup).toEqual([{ org_id: null }]);

    const founderLookingAtFirm = await as(
      founder,
      (tx) => tx`select public.investor_org(${investorId}::uuid) as org_id`,
    );
    expect(founderLookingAtFirm).toEqual([{ org_id: null }]);
  });
});
