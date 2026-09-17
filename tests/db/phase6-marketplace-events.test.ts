import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";

const url = process.env["FUNDMATCH_TEST_DATABASE_URL"];
const maybe = url ? describe : describe.skip;

type Sql = ReturnType<typeof postgres>;
type Actor = { id: string; email: string };

maybe("Phase 6 production discovery + marketplace events", () => {
  const sql: Sql = postgres(url ?? "postgres://invalid", { max: 1, onnotice: () => {} });
  const founder: Actor = { id: "", email: `phase6-founder-${Date.now()}@example.com` };
  const investor: Actor = { id: "", email: `phase6-investor-${Date.now()}@example.com` };
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

  beforeAll(async () => {
    for (const actor of [founder, investor]) {
      const [row] = await sql`insert into auth.users (email) values (${actor.email}) returning id`;
      actor.id = row!["id"] as string;
    }

    startupOrg = (
      await as(founder, (tx) => tx`select public.create_organization('Phase 6 Startup', 'startup') as id`)
    )[0]!["id"] as string;
    firmOrg = (
      await as(investor, (tx) => tx`select public.create_organization('Phase 6 Firm', 'investment_firm') as id`)
    )[0]!["id"] as string;

    startupId = (
      await as(founder, (tx) => tx`select id from public.startup_profiles where org_id = ${startupOrg}`)
    )[0]!["id"] as string;
    investorId = (
      await as(investor, (tx) => tx`select id from public.investor_profiles where org_id = ${firmOrg}`)
    )[0]!["id"] as string;

    await as(
      founder,
      (tx) => tx`
        update public.startup_profiles
        set visibility = 'public',
            sector = 'Infrastructure',
            stage = 'Seed',
            geography = 'United States',
            business_model = 'SaaS',
            funding_ask = 2000000,
            tags = array['cloud']
        where id = ${startupId}
      `,
    );
    await as(
      investor,
      (tx) => tx`
        update public.investor_theses
        set stages = array['Seed'],
            geographies = array['United States'],
            exclusions = array['Gambling'],
            check_min = 500000,
            check_max = 3000000
        where investor_id = ${investorId}
      `,
    );
  });

  afterAll(async () => {
    await sql`delete from public.organizations where id in ${sql([startupOrg, firmOrg])}`;
    await sql`delete from public.profiles where id in ${sql([founder.id, investor.id])}`;
    await sql`delete from auth.users where id in ${sql([founder.id, investor.id])}`;
    await sql.end();
  });

  test("browser roles cannot mutate session or event ledger tables directly", async () => {
    const rows = await sql`
      select
        has_table_privilege('authenticated','public.discovery_sessions','INSERT') as ds_insert,
        has_table_privilege('authenticated','public.discovery_sessions','UPDATE') as ds_update,
        has_table_privilege('authenticated','public.discovery_sessions','DELETE') as ds_delete,
        has_table_privilege('authenticated','public.marketplace_events','INSERT') as ev_insert,
        has_table_privilege('authenticated','public.marketplace_events','UPDATE') as ev_update,
        has_table_privilege('authenticated','public.marketplace_events','DELETE') as ev_delete,
        has_table_privilege('anon','public.marketplace_events','INSERT') as anon_ev_insert
    `;
    expect(rows[0]).toEqual({
      ds_insert: false,
      ds_update: false,
      ds_delete: false,
      ev_insert: false,
      ev_update: false,
      ev_delete: false,
      anon_ev_insert: false,
    });
  });

  test("anonymous clients cannot execute the discovery RPC boundary", async () => {
    let denied = false;
    try {
      await as(null, (tx) => tx`select public.start_discovery_session(${investorId}::uuid)`);
    } catch (error) {
      denied = /permission denied/i.test((error as Error).message);
    }
    expect(denied).toBe(true);
  });

  test("hard eligibility returns a listed matching company and enforces explicit exclusions", async () => {
    const sessionId = (
      await as(
        investor,
        (tx) => tx`select public.start_discovery_session(${investorId}::uuid) as id`,
      )
    )[0]!["id"] as string;

    const eligible = await as(
      investor,
      (tx) => tx`
        select * from public.get_eligible_discovery_candidates(
          ${investorId}::uuid, ${sessionId}::uuid, 100
        )
      `,
    );
    expect(eligible.some((row) => row["startup_id"] === startupId)).toBe(true);

    await as(founder, (tx) => tx`
      update public.startup_profiles set tags = array['cloud','gambling'] where id = ${startupId}
    `);
    const excluded = await as(
      investor,
      (tx) => tx`
        select * from public.get_eligible_discovery_candidates(
          ${investorId}::uuid, ${sessionId}::uuid, 100
        )
      `,
    );
    expect(excluded.some((row) => row["startup_id"] === startupId)).toBe(false);

    await as(founder, (tx) => tx`
      update public.startup_profiles set tags = array['cloud'] where id = ${startupId}
    `);
  });

  test("impression is idempotent, decision is auditable, and current state resumes predictably", async () => {
    const sessionId = (
      await as(
        investor,
        (tx) => tx`select public.start_discovery_session(${investorId}::uuid) as id`,
      )
    )[0]!["id"] as string;

    const first = await as(
      investor,
      (tx) => tx`
        select public.record_discovery_impression(
          ${sessionId}::uuid, ${startupId}::uuid, 82, 'rules-v1', 1, 'eligibility-v1'
        ) as id
      `,
    );
    const again = await as(
      investor,
      (tx) => tx`
        select public.record_discovery_impression(
          ${sessionId}::uuid, ${startupId}::uuid, 82, 'rules-v1', 1, 'eligibility-v1'
        ) as id
      `,
    );
    expect(again[0]!["id"]).toBe(first[0]!["id"]);

    await as(
      investor,
      (tx) => tx`
        select public.record_discovery_decision(
          ${sessionId}::uuid, ${startupId}::uuid, 'save'::public.swipe_decision
        )
      `,
    );

    const events = await as(
      investor,
      (tx) => tx`
        select event_type, score::int as score, score_version, rank_position
        from public.marketplace_events
        where session_id = ${sessionId}::uuid and startup_id = ${startupId}
        order by created_at
      `,
    );
    expect(events.map((row) => row["event_type"])).toEqual(["impression", "save"]);
    expect(events[1]).toMatchObject({ score: 82, score_version: "rules-v1", rank_position: 1 });

    const afterDecision = await as(
      investor,
      (tx) => tx`
        select * from public.get_eligible_discovery_candidates(
          ${investorId}::uuid, ${sessionId}::uuid, 100
        )
      `,
    );
    expect(afterDecision.some((row) => row["startup_id"] === startupId)).toBe(false);

    const cleared = await as(
      investor,
      (tx) => tx`select public.reset_discovery_decisions(${investorId}::uuid) as n`,
    );
    expect(cleared[0]!["n"]).toBe(1);

    const auditStillThere = await as(
      investor,
      (tx) => tx`
        select count(*)::int as n from public.marketplace_events
        where org_id = ${firmOrg}::uuid and event_type in ('impression','save','decision_reset')
      `,
    );
    expect(auditStillThere[0]!["n"]).toBeGreaterThanOrEqual(3);
  });

  test("founder organization cannot read the investor firm's event ledger", async () => {
    const leaked = await as(
      founder,
      (tx) => tx`select id from public.marketplace_events where org_id = ${firmOrg}::uuid`,
    );
    expect(leaked).toEqual([]);
  });
});
