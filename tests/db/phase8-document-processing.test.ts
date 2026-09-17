/**
 * Phase 8 promotion boundary and suggestion provenance.
 *
 * Runs against a PostgreSQL database with the shim + migrations applied
 * (see scripts/db/apply-migrations.sh). Skipped unless FUNDMATCH_TEST_DATABASE_URL
 * is set, so `bun test` stays green without a database.
 *
 * What matters here: an AI proposal can never become a company fact without an
 * authorized human decision, recording the same proposals twice is a no-op, and
 * a member of another organization cannot touch any of it.
 */
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import postgres from "postgres";

const url = process.env["FUNDMATCH_TEST_DATABASE_URL"];
const maybe = url ? describe : describe.skip;

type Sql = ReturnType<typeof postgres>;
type Actor = { id: string; email: string };

maybe("phase 8 document processing", () => {
  const sql: Sql = postgres(url ?? "postgres://invalid", { max: 1, onnotice: () => {} });
  const founder: Actor = { id: "", email: `p8-founder-${Date.now()}@example.com` };
  const outsider: Actor = { id: "", email: `p8-outsider-${Date.now()}@example.com` };
  let startupOrg = "";
  let outsiderOrg = "";
  let startupId = "";
  let documentId = "";
  const runId = "33333333-3333-4333-8333-333333333333";

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

  async function fails(p: Promise<unknown>, pattern?: RegExp): Promise<string> {
    try {
      await p;
    } catch (e) {
      const msg = (e as Error).message;
      if (pattern) expect(msg).toMatch(pattern);
      return msg;
    }
    throw new Error("expected the statement to be rejected");
  }

  /** The worker runs as the service role, never as a browser session. */
  async function asWorker<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
    return sql.begin(async (tx) => {
      await tx.unsafe("set local role service_role");
      return fn(tx as unknown as Sql);
    }) as Promise<T>;
  }

  function proposal(overrides: Record<string, unknown> = {}) {
    return {
      fieldKey: "sector",
      label: "Sector",
      suggestedValue: "Climate",
      currentValue: "B2B SaaS",
      confidence: 0.75,
      rationale: "Read from a labelled line.",
      sourceKey: "fundmatch_literal",
      sourceLocator: "page 1",
      sourceExcerpt: "Sector: Climate",
      ...overrides,
    };
  }

  async function record(items: Record<string, unknown>[]): Promise<number> {
    const [row] = await asWorker(
      (tx) =>
        tx`select public.record_document_suggestions(${documentId}::uuid, ${runId}::uuid, ${sql.json(items)}) as count`,
    );
    return Number(row!["count"]);
  }

  async function pending(): Promise<Record<string, unknown>[]> {
    return as(
      founder,
      (tx) =>
        tx`select id, field_key, suggested_value, source_locator, source_excerpt, run_id, confidence
           from public.profile_suggestions
           where startup_id = ${startupId} and status = 'pending'
           order by field_key, suggested_value`,
    );
  }

  beforeAll(async () => {
    for (const actor of [founder, outsider]) {
      const [row] = await sql`insert into auth.users (email) values (${actor.email}) returning id`;
      actor.id = row!["id"] as string;
    }

    startupOrg = (
      await as(
        founder,
        (tx) => tx`select public.create_organization('Phase8 Robotics', 'startup') as id`,
      )
    )[0]!["id"] as string;
    outsiderOrg = (
      await as(
        outsider,
        (tx) => tx`select public.create_organization('Phase8 Outsiders', 'startup') as id`,
      )
    )[0]!["id"] as string;
    startupId = (
      await as(
        founder,
        (tx) => tx`select id from public.startup_profiles where org_id = ${startupOrg}`,
      )
    )[0]!["id"] as string;

    // The path check keys on the row id, exactly as the real upload flow does:
    // the client mints the id, then writes bytes to <org>/<id>/<file>.
    documentId = crypto.randomUUID();
    await as(
      founder,
      (tx) => tx`
        insert into public.documents
          (id, org_id, startup_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, kind)
        values (${documentId}, ${startupOrg}, ${startupId}, ${founder.id},
                ${`${startupOrg}/${documentId}/deck.pdf`},
                'deck.pdf', 'application/pdf', 2048, 'deck')`,
    );
    await sql`update public.documents set status = 'uploaded' where id = ${documentId}`;
  });

  afterAll(async () => {
    await sql`delete from public.organizations where id in ${sql([startupOrg, outsiderOrg])}`;
    await sql`delete from public.profiles where id in ${sql([founder.id, outsider.id])}`;
    await sql`delete from auth.users where id in ${sql([founder.id, outsider.id])}`;
    await sql.end();
  });

  test("the worker records proposals with their source, and repeating it changes nothing", async () => {
    expect(await record([proposal()])).toBe(1);
    expect(await record([proposal()])).toBe(0);

    const rows = await pending();
    expect(rows.length).toBe(1);
    expect(rows[0]!["field_key"]).toBe("sector");
    expect(rows[0]!["source_locator"]).toBe("page 1");
    expect(rows[0]!["source_excerpt"]).toBe("Sector: Climate");
    expect(rows[0]!["run_id"]).toBe(runId);

    // The company itself is untouched: a proposal is not a fact.
    const [company] = await as(
      founder,
      (tx) => tx`select sector from public.startup_profiles where id = ${startupId}`,
    );
    expect(company!["sector"]).toBe("B2B SaaS");
  });

  test("two conflicting values for one field are both kept for the human to resolve", async () => {
    expect(await record([proposal({ fieldKey: "stage", suggestedValue: "Seed" })])).toBe(1);
    expect(await record([proposal({ fieldKey: "stage", suggestedValue: "Series A" })])).toBe(1);
    const rows = (await pending()).filter((row) => row["field_key"] === "stage");
    expect(rows.map((row) => row["suggested_value"])).toEqual(["Seed", "Series A"]);
  });

  test("proposals are refused for a document with no company to attach them to", async () => {
    const orphanId = crypto.randomUUID();
    await sql`
      insert into public.documents
        (id, org_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, kind, status)
      values (${orphanId}, ${startupOrg}, ${founder.id},
              ${`${startupOrg}/${orphanId}/notes.txt`},
              'notes.txt', 'text/plain', 64, 'other', 'uploaded')`;
    await fails(
      asWorker(
        (tx) =>
          tx`select public.record_document_suggestions(${orphanId}::uuid, ${runId}::uuid, ${sql.json([proposal()])})`,
      ),
      /not linked to a company/,
    );
    await sql`delete from public.documents where id = ${orphanId}`;
  });

  test("accepting a proposal is what writes the company fact, with provenance", async () => {
    const target = (await pending()).find((row) => row["field_key"] === "sector")!;
    await as(
      founder,
      (tx) => tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, true)`,
    );

    const [company] = await as(
      founder,
      (tx) => tx`select sector from public.startup_profiles where id = ${startupId}`,
    );
    expect(company!["sector"]).toBe("Climate");

    const [provenance] = await as(
      founder,
      (tx) =>
        tx`select source_key, value_preview from public.source_provenance
           where startup_id = ${startupId} and field_key = 'sector'`,
    );
    expect(provenance!["source_key"]).toBe("fundmatch_literal");
    expect(provenance!["value_preview"]).toBe("Climate");

    // Resolved once, resolvable never again.
    await fails(
      as(
        founder,
        (tx) => tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, true)`,
      ),
      /already resolved/,
    );
  });

  test("a correction stores the reviewer's value, not the proposed one", async () => {
    expect(await record([proposal({ fieldKey: "geography", suggestedValue: "USA" })])).toBe(1);
    const target = (await pending()).find((row) => row["field_key"] === "geography")!;
    await as(
      founder,
      (tx) =>
        tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, true, 'United States')`,
    );

    const [company] = await as(
      founder,
      (tx) => tx`select geography from public.startup_profiles where id = ${startupId}`,
    );
    expect(company!["geography"]).toBe("United States");

    const [row] = await as(
      founder,
      (tx) =>
        tx`select suggested_value, rationale, status from public.profile_suggestions where id = ${target["id"]}`,
    );
    expect(row!["status"]).toBe("accepted");
    expect(row!["suggested_value"]).toBe("United States");
    expect(row!["rationale"]).toContain("Corrected by reviewer from: USA");
  });

  test("rejecting records the decision and leaves the company untouched", async () => {
    expect(
      await record([proposal({ fieldKey: "business_model", suggestedValue: "Marketplace" })]),
    ).toBe(1);
    const target = (await pending()).find((row) => row["field_key"] === "business_model")!;
    await as(
      founder,
      (tx) => tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, false)`,
    );
    const [company] = await as(
      founder,
      (tx) => tx`select business_model from public.startup_profiles where id = ${startupId}`,
    );
    expect(company!["business_model"]).not.toBe("Marketplace");
    const [row] = await as(
      founder,
      (tx) => tx`select status from public.profile_suggestions where id = ${target["id"]}`,
    );
    expect(row!["status"]).toBe("rejected");
  });

  test("a correction cannot be smuggled in through a rejection", async () => {
    expect(
      await record([proposal({ fieldKey: "website", suggestedValue: "https://a.example" })]),
    ).toBe(1);
    const target = (await pending()).find((row) => row["field_key"] === "website")!;
    await fails(
      as(
        founder,
        (tx) =>
          tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, false, 'https://evil.example')`,
      ),
      /must be accepted/,
    );
  });

  test("accepted readiness proposals update the founder's checklist, never beyond it", async () => {
    await as(founder, (tx) => tx`select public.ensure_readiness_items(${startupId}::uuid, 'vc')`);
    expect(
      await record([
        proposal({
          fieldKey: "readiness:vc:Financials-0",
          label: "Revenue, burn & runway",
          suggestedValue: "In progress",
          currentValue: "Missing",
        }),
      ]),
    ).toBe(1);

    const target = (await pending()).find(
      (row) => row["field_key"] === "readiness:vc:Financials-0",
    )!;
    await as(
      founder,
      (tx) => tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, true)`,
    );

    const [item] = await as(
      founder,
      (tx) =>
        tx`select status, suggested_by, notes from public.readiness_items
           where startup_id = ${startupId} and template = 'vc' and item_key = 'Financials-0'`,
    );
    expect(item!["status"]).toBe("In progress");
    expect(item!["suggested_by"]).toBe("fundmatch_literal");
    expect(String(item!["notes"])).toContain("page 1");
  });

  test("a readiness proposal cannot invent a status or an item", async () => {
    expect(
      await record([
        proposal({
          fieldKey: "readiness:vc:Traction-0",
          suggestedValue: "Complete",
          label: "Customer & retention metrics",
        }),
      ]),
    ).toBe(1);
    const bogusStatus = (await pending()).find(
      (row) => row["field_key"] === "readiness:vc:Traction-0",
    )!;
    await fails(
      as(
        founder,
        (tx) =>
          tx`select public.resolve_profile_suggestion(${bogusStatus["id"]}::uuid, true, 'Shipped')`,
      ),
      /Unsupported readiness status/,
    );

    expect(
      await record([
        proposal({
          fieldKey: "readiness:vc:DoesNotExist-9",
          suggestedValue: "In progress",
          label: "Imaginary item",
        }),
      ]),
    ).toBe(1);
    const missingItem = (await pending()).find(
      (row) => row["field_key"] === "readiness:vc:DoesNotExist-9",
    )!;
    await fails(
      as(
        founder,
        (tx) => tx`select public.resolve_profile_suggestion(${missingItem["id"]}::uuid, true)`,
      ),
      /not found/,
    );
  });

  test("another organization can neither see nor resolve these proposals", async () => {
    expect(
      await record([proposal({ fieldKey: "tagline", suggestedValue: "Robots that restock" })]),
    ).toBe(1);
    const target = (await pending()).find((row) => row["field_key"] === "tagline")!;

    const visible = await as(
      outsider,
      (tx) => tx`select id from public.profile_suggestions where id = ${target["id"]}`,
    );
    expect(visible.length).toBe(0);

    await fails(
      as(
        outsider,
        (tx) => tx`select public.resolve_profile_suggestion(${target["id"]}::uuid, true)`,
      ),
      /not found/,
    );

    const [company] = await as(
      founder,
      (tx) => tx`select tagline from public.startup_profiles where id = ${startupId}`,
    );
    expect(company!["tagline"]).not.toBe("Robots that restock");
  });

  test("browser sessions cannot reach the worker's own entry points", async () => {
    for (const statement of [
      "select public.record_document_suggestions('00000000-0000-4000-8000-000000000000'::uuid, null, '[]'::jsonb)",
      "select public.start_document_run('00000000-0000-4000-8000-000000000000'::uuid)",
      "select public.agentic_queue_send('agent_runs', '{}'::jsonb)",
      "select * from public.agentic_queue_read('agent_runs')",
      "select public.agentic_queue_archive('agent_runs', 1)",
    ]) {
      await fails(
        as(founder, (tx) => tx.unsafe(statement)),
        /permission denied/,
      );
      await fails(
        as(null, (tx) => tx.unsafe(statement)),
        /permission denied/,
      );
    }
  });

  test("the queue helpers only accept FundMatch's own queues", async () => {
    await fails(
      asWorker((tx) => tx`select public.agentic_queue_send('pg_shadow', '{}'::jsonb)`),
      /Unknown FundMatch queue/,
    );
  });

  // 0006/0007 need pgvector and pgmq, which stock PostgreSQL does not ship, so
  // this assertion only runs where the agentic foundation is actually installed.
  test("private RAG chunks and vectors stay invisible to browser sessions", async () => {
    const [present] = await sql`select to_regclass('public.document_chunks') is not null as ok`;
    if (!present!["ok"]) return;
    await fails(
      as(founder, (tx) => tx`select * from public.document_chunks`),
      /permission denied/,
    );
    await fails(
      as(founder, (tx) => tx`select * from public.chunk_embeddings`),
      /permission denied/,
    );
  });
});
