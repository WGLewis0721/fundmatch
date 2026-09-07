/**
 * Row-level security and storage-policy tests.
 *
 * Runs against a PostgreSQL database that has the shim + migrations applied
 * (see scripts/db/apply-migrations.sh). Skipped unless FUNDMATCH_TEST_DATABASE_URL
 * is set, so `bun test` stays green without a database.
 *
 * Two unrelated organizations are created (a startup and an investment firm),
 * each with its own user, and every cross-organization read/write attempt is
 * asserted to fail or return nothing. This mirrors what PostgREST/Supabase
 * Storage would allow for those users' JWTs.
 */
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import postgres from "postgres";

const url = process.env["FUNDMATCH_TEST_DATABASE_URL"];
const maybe = url ? describe : describe.skip;

type Sql = ReturnType<typeof postgres>;
type Actor = { id: string; email: string };

maybe("organization isolation (RLS + storage policies)", () => {
  const sql: Sql = postgres(url ?? "postgres://invalid", { max: 1, onnotice: () => {} });
  const founder: Actor = { id: "", email: `founder-${Date.now()}@example.com` };
  const investor: Actor = { id: "", email: `investor-${Date.now()}@example.com` };
  const outsider: Actor = { id: "", email: `outsider-${Date.now()}@example.com` };
  let startupOrg = "";
  let firmOrg = "";
  let startupId = "";
  let investorId = "";
  let documentId = "";

  /** Run `fn` as the given user through the `authenticated` role (like PostgREST). */
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

  beforeAll(async () => {
    for (const a of [founder, investor, outsider]) {
      const [row] = await sql`insert into auth.users (email) values (${a.email}) returning id`;
      a.id = row!["id"] as string;
    }
  });

  afterAll(async () => {
    await sql`delete from public.organizations where created_by in ${sql([founder.id, investor.id, outsider.id])}`;
    await sql`delete from public.profiles where id in ${sql([founder.id, investor.id, outsider.id])}`;
    await sql`delete from auth.users where id in ${sql([founder.id, investor.id, outsider.id])}`;
    await sql.end();
  });

  test("signup trigger creates a profile only visible to its owner", async () => {
    const mine = await as(
      founder,
      (tx) => tx`select id from public.profiles where id = ${founder.id}`,
    );
    expect(mine.length).toBe(1);
    const theirs = await as(
      investor,
      (tx) => tx`select id from public.profiles where id = ${founder.id}`,
    );
    expect(theirs.length).toBe(0);
  });

  test("anonymous callers see nothing and cannot create organizations", async () => {
    await fails(
      as(null, (tx) => tx`select * from public.organizations`),
      /permission denied/,
    );
    await fails(
      as(null, (tx) => tx`select public.create_organization('Nope', 'startup')`),
      /permission denied/,
    );
  });

  test("users create their own organizations and become owners", async () => {
    startupOrg = (
      await as(
        founder,
        (tx) =>
          tx`select public.create_organization('Acme Robotics', 'startup', 'https://acme.example') as id`,
      )
    )[0]!["id"] as string;
    firmOrg = (
      await as(
        investor,
        (tx) =>
          tx`select public.create_organization('Blue Harbor Capital', 'investment_firm') as id`,
      )
    )[0]!["id"] as string;
    const membership = await as(
      founder,
      (tx) => tx`select member_role from public.organization_members where org_id = ${startupOrg}`,
    );
    expect(membership).toEqual([{ member_role: "owner" }]);
    startupId = (
      await as(
        founder,
        (tx) => tx`select id from public.startup_profiles where org_id = ${startupOrg}`,
      )
    )[0]!["id"] as string;
    investorId = (
      await as(
        investor,
        (tx) => tx`select id from public.investor_profiles where org_id = ${firmOrg}`,
      )
    )[0]!["id"] as string;
    expect(startupId).toBeTruthy();
    expect(investorId).toBeTruthy();
  });

  test("direct inserts into organizations and memberships are rejected", async () => {
    await fails(
      as(
        founder,
        (tx) => tx`insert into public.organizations (name, type) values ('Sneaky', 'startup')`,
      ),
      /row-level security/,
    );
    // Self-granting membership in someone else's organization.
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.organization_members (org_id, user_id, member_role) values (${firmOrg}, ${founder.id}, 'owner')`,
      ),
      /row-level security/,
    );
    // Adding a stranger to your own organization directly (must go through invitations).
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.organization_members (org_id, user_id) values (${startupOrg}, ${outsider.id})`,
      ),
      /row-level security/,
    );
    const visible = await as(
      founder,
      (tx) => tx`select id from public.organizations where id = ${firmOrg}`,
    );
    expect(visible.length).toBe(0);
  });

  test("invitations require admin rights and a matching email", async () => {
    await fails(
      as(outsider, (tx) => tx`select public.invite_member(${startupOrg}, ${outsider.email})`),
      /admins/,
    );
    await as(
      founder,
      (tx) => tx`select public.invite_member(${startupOrg}, ${outsider.email}, 'member')`,
    );
    const token = (
      await as(
        founder,
        (tx) => tx`select token from public.organization_invitations where org_id = ${startupOrg}`,
      )
    )[0]!["token"] as string;
    // The investor holds the token but has a different email.
    await fails(
      as(investor, (tx) => tx`select public.accept_invitation(${token})`),
      /different email/,
    );
    await as(outsider, (tx) => tx`select public.accept_invitation(${token})`);
    const roles = await as(
      outsider,
      (tx) =>
        tx`select member_role from public.organization_members where org_id = ${startupOrg} and user_id = ${outsider.id}`,
    );
    expect(roles).toEqual([{ member_role: "member" }]);
    await fails(
      as(outsider, (tx) => tx`select public.accept_invitation(${token})`),
      /not valid/,
    );
    // A plain member cannot promote themselves or remove the owner.
    await fails(
      as(
        outsider,
        (tx) =>
          tx`update public.organization_members set member_role = 'owner' where user_id = ${outsider.id} returning id`,
      ).then((r) => {
        if (r.length === 0) throw new Error("row-level security (no rows updated)");
      }),
      /row-level security/,
    );
    // The last owner cannot be removed.
    await fails(
      as(
        founder,
        (tx) =>
          tx`delete from public.organization_members where org_id = ${startupOrg} and user_id = ${founder.id}`,
      ),
      /at least one owner/,
    );
    // Members may leave.
    await as(
      outsider,
      (tx) =>
        tx`delete from public.organization_members where org_id = ${startupOrg} and user_id = ${outsider.id}`,
    );
  });

  test("startup profile: founders edit, outsiders can't see private companies", async () => {
    await as(
      founder,
      (tx) =>
        tx`update public.startup_profiles set tagline = 'Robots for warehouses', funding_ask = 3000000 where id = ${startupId}`,
    );
    const hidden = await as(
      investor,
      (tx) => tx`select id from public.startup_profiles where id = ${startupId}`,
    );
    expect(hidden.length).toBe(0);
    const updated = await as(
      investor,
      (tx) =>
        tx`update public.startup_profiles set tagline = 'pwned' where id = ${startupId} returning id`,
    );
    expect(updated.length).toBe(0);
    // Listing the company makes it discoverable, but still not editable by others.
    await as(
      founder,
      (tx) => tx`update public.startup_profiles set visibility = 'public' where id = ${startupId}`,
    );
    const listed = await as(
      investor,
      (tx) => tx`select tagline from public.startup_profiles where id = ${startupId}`,
    );
    expect(listed).toEqual([{ tagline: "Robots for warehouses" }]);
    const stillNo = await as(
      investor,
      (tx) =>
        tx`update public.startup_profiles set tagline = 'pwned' where id = ${startupId} returning id`,
    );
    expect(stillNo.length).toBe(0);
    // A founder cannot move their company into another organization.
    await fails(
      as(
        founder,
        (tx) => tx`update public.startup_profiles set org_id = ${firmOrg} where id = ${startupId}`,
      ),
      /row-level security/,
    );
    // Demo seed rows are invisible to real accounts.
    const demo = await as(
      investor,
      (tx) => tx`select count(*)::int as n from public.startup_profiles where is_demo`,
    );
    expect(demo).toEqual([{ n: 0 }]);
  });

  test("metrics and materials follow the startup's organization", async () => {
    await as(
      founder,
      (tx) =>
        tx`insert into public.company_metrics (startup_id, metric_key, label, value_numeric, value_display) values (${startupId}, 'growth', 'YoY growth', 120, '120%')`,
    );
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into public.company_metrics (startup_id, metric_key, label, value_numeric, value_display) values (${startupId}, 'arr', 'ARR', 1, '$1')`,
      ),
      /row-level security/,
    );
    const readable = await as(
      investor,
      (tx) => tx`select value_display from public.company_metrics where startup_id = ${startupId}`,
    );
    expect(readable).toEqual([{ value_display: "120%" }]);
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.founder_materials (startup_id, title, kind, url) values (${startupId}, 'Deck', 'link', 'javascript:alert(1)')`,
      ),
      /row-level security/,
    );
    await as(
      founder,
      (tx) =>
        tx`insert into public.founder_materials (startup_id, title, kind, url, created_by) values (${startupId}, 'Deck', 'link', 'https://example.com/deck', ${founder.id})`,
    );
    const removed = await as(
      investor,
      (tx) => tx`delete from public.founder_materials where startup_id = ${startupId} returning id`,
    );
    expect(removed.length).toBe(0);
  });

  test("investor thesis, decisions and pipeline are private to the firm", async () => {
    await as(
      investor,
      (tx) =>
        tx`update public.investor_theses set sectors = '{AI}', check_min = 500000, check_max = 5000000 where investor_id = ${investorId}`,
    );
    const thesis = await as(
      founder,
      (tx) => tx`select id from public.investor_theses where investor_id = ${investorId}`,
    );
    expect(thesis.length).toBe(0);
    const firm = await as(
      founder,
      (tx) => tx`select id from public.investor_profiles where id = ${investorId}`,
    );
    expect(firm.length).toBe(0);

    await as(
      investor,
      (tx) =>
        tx`insert into public.swipes (user_id, investor_id, startup_id, decision) values (${investor.id}, ${investorId}, ${startupId}, 'interested')`,
    );
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.swipes (user_id, investor_id, startup_id, decision) values (${investor.id}, ${investorId}, ${startupId}, 'pass')`,
      ),
      /row-level security/,
    );
    const swipes = await as(
      founder,
      (tx) => tx`select id from public.swipes where startup_id = ${startupId}`,
    );
    expect(swipes.length).toBe(0);

    await as(
      investor,
      (tx) =>
        tx`insert into public.pipeline_items (org_id, investor_id, startup_id, owner_id, status) values (${firmOrg}, ${investorId}, ${startupId}, ${investor.id}, 'new')`,
    );
    // Wrong org_id for the investor profile is rejected even for a member.
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into public.pipeline_items (org_id, investor_id, startup_id, status) values (${startupOrg}, ${investorId}, ${startupId}, 'new')`,
      ),
      /row-level security/,
    );
    const pipeline = await as(
      founder,
      (tx) => tx`select id from public.pipeline_items where startup_id = ${startupId}`,
    );
    expect(pipeline.length).toBe(0);
    const moved = await as(
      founder,
      (tx) =>
        tx`update public.pipeline_items set status = 'passed' where startup_id = ${startupId} returning id`,
    );
    expect(moved.length).toBe(0);
    const own = await as(
      investor,
      (tx) =>
        tx`update public.pipeline_items set status = 'meeting' where startup_id = ${startupId} returning status`,
    );
    expect(own).toEqual([{ status: "meeting" }]);
  });

  test("notes stay inside the authoring organization", async () => {
    await as(
      investor,
      (tx) =>
        tx`insert into public.team_notes (org_id, startup_id, investor_id, author_id, author_name, body) values (${firmOrg}, ${startupId}, ${investorId}, ${investor.id}, 'Investor', 'Strong team')`,
    );
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into public.team_notes (org_id, startup_id, author_id, author_name, body) values (${startupOrg}, ${startupId}, ${investor.id}, 'Investor', 'planted')`,
      ),
      /row-level security/,
    );
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.team_notes (org_id, startup_id, author_id, author_name, body) values (${startupOrg}, ${startupId}, ${investor.id}, 'Spoof', 'forged author')`,
      ),
      /row-level security/,
    );
    const leaked = await as(
      founder,
      (tx) => tx`select body from public.team_notes where startup_id = ${startupId}`,
    );
    expect(leaked.length).toBe(0);
  });

  test("readiness items belong to the founder's organization", async () => {
    const created = await as(
      founder,
      (tx) => tx`select public.ensure_readiness_items(${startupId}, 'vc') as n`,
    );
    expect(created[0]!["n"]).toBe(12);
    const again = await as(
      founder,
      (tx) => tx`select public.ensure_readiness_items(${startupId}, 'vc') as n`,
    );
    expect(again[0]!["n"]).toBe(0);
    await fails(
      as(investor, (tx) => tx`select public.ensure_readiness_items(${startupId}, 'pe')`),
      /Company not found/,
    );
    const seen = await as(
      investor,
      (tx) => tx`select id from public.readiness_items where startup_id = ${startupId}`,
    );
    expect(seen.length).toBe(0);
    const edited = await as(
      investor,
      (tx) =>
        tx`update public.readiness_items set status = 'Complete' where startup_id = ${startupId} returning id`,
    );
    expect(edited.length).toBe(0);
    await fails(
      as(
        founder,
        (tx) =>
          tx`update public.readiness_items set evidence_url = 'javascript:alert(1)' where startup_id = ${startupId} and item_key = 'Company-0'`,
      ),
      /readiness_items_evidence_check/,
    );
    const ok = await as(
      founder,
      (tx) =>
        tx`update public.readiness_items set status = 'Complete', owner = 'CFO', evidence_url = 'https://example.com/x' where startup_id = ${startupId} and item_key = 'Company-0' returning status`,
    );
    expect(ok).toEqual([{ status: "Complete" }]);
  });

  test("documents: record first, then storage object, both scoped to the organization", async () => {
    documentId = crypto.randomUUID();
    const path = `${startupOrg}/${documentId}/deck.pdf`;
    // Path must match the org + id layout.
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.documents (id, org_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, kind) values (${documentId}, ${startupOrg}, ${founder.id}, ${`${firmOrg}/${documentId}/deck.pdf`}, 'deck.pdf', 'application/pdf', 1000, 'deck')`,
      ),
      /documents_path_check/,
    );
    // Disallowed MIME type.
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.documents (id, org_id, uploaded_by, storage_path, file_name, mime_type, size_bytes) values (${documentId}, ${startupOrg}, ${founder.id}, ${`${startupOrg}/${documentId}/x.exe`}, 'x.exe', 'application/x-msdownload', 1000)`,
      ),
      /documents_mime_check/,
    );
    // Another organization's member cannot create records in this org.
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into public.documents (id, org_id, uploaded_by, storage_path, file_name, mime_type, size_bytes) values (${documentId}, ${startupOrg}, ${investor.id}, ${path}, 'deck.pdf', 'application/pdf', 1000)`,
      ),
      /row-level security/,
    );
    await as(
      founder,
      (tx) =>
        tx`insert into public.documents (id, org_id, startup_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, kind) values (${documentId}, ${startupOrg}, ${startupId}, ${founder.id}, ${path}, 'deck.pdf', 'application/pdf', 1000, 'deck')`,
    );

    // Storage: nobody outside the org can write to that path; the owner can.
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into storage.objects (bucket_id, name, metadata) values ('documents', ${path}, '{"size": 1000}')`,
      ),
      /row-level security/,
    );
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into storage.objects (bucket_id, name, metadata) values ('documents', ${`${firmOrg}/${crypto.randomUUID()}/orphan.pdf`}, '{"size": 1}')`,
      ),
      /row-level security/,
    ); // no matching documents record
    const anonObjects = await as(
      null,
      (tx) => tx`select name from storage.objects where bucket_id = 'documents'`,
    );
    expect(anonObjects.length).toBe(0);
    // Users cannot mark a document uploaded before the object exists.
    await fails(
      as(founder, (tx) => tx`select public.mark_document_uploaded(${documentId})`),
      /not reached storage/,
    );
    await as(
      founder,
      (tx) =>
        tx`insert into storage.objects (bucket_id, name, owner_id, metadata) values ('documents', ${path}, ${founder.id}, '{"size": 1234}')`,
    );
    const status = await as(
      founder,
      (tx) => tx`select public.mark_document_uploaded(${documentId}) as s`,
    );
    expect(status).toEqual([{ s: "uploaded" }]);
    const size = await as(
      founder,
      (tx) => tx`select size_bytes::int as size from public.documents where id = ${documentId}`,
    );
    expect(size).toEqual([{ size: 1234 }]);

    // Reads and downloads (storage select) are org-only.
    const seen = await as(
      investor,
      (tx) => tx`select id from public.documents where id = ${documentId}`,
    );
    expect(seen.length).toBe(0);
    const obj = await as(
      investor,
      (tx) => tx`select name from storage.objects where name = ${path}`,
    );
    expect(obj.length).toBe(0);
    const objMine = await as(
      founder,
      (tx) => tx`select name from storage.objects where name = ${path}`,
    );
    expect(objMine.length).toBe(1);
    const bucket = await sql`select public from storage.buckets where id = 'documents'`;
    expect(bucket).toEqual([{ public: false }]);

    // Users cannot forge processing status; the worker interface can.
    await fails(
      as(
        founder,
        (tx) =>
          tx`update public.documents set status = 'processed', extraction = '{"x":1}' where id = ${documentId}`,
      ),
      /Only kind and startup_id/,
    );
    await fails(
      as(founder, (tx) => tx`select public.set_document_processing(${documentId}, 'processed')`),
      /permission denied/,
    );
    await as(
      founder,
      (tx) => tx`update public.documents set kind = 'financials' where id = ${documentId}`,
    );
    await sql.begin(async (tx) => {
      await tx.unsafe(`set local role service_role`);
      await tx`select public.set_document_processing(${documentId}, 'processing')`;
      await tx`select public.set_document_processing(${documentId}, 'processed', null, '{"funding_ask": 3000000}')`;
      await tx`insert into public.profile_suggestions (startup_id, document_id, field_key, label, suggested_value, confidence) values (${startupId}, ${documentId}, 'metric:arr', 'ARR', '2400000', 0.8)`;
    });
    const processed = await as(
      founder,
      (tx) => tx`select status, extraction from public.documents where id = ${documentId}`,
    );
    expect(processed).toEqual([{ status: "processed", extraction: { funding_ask: 3000000 } }]);

    // Suggestions are visible only to the founder's org and applied through the RPC.
    const foreign = await as(
      investor,
      (tx) => tx`select id from public.profile_suggestions where startup_id = ${startupId}`,
    );
    expect(foreign.length).toBe(0);
    const suggestionId = (
      await as(
        founder,
        (tx) => tx`select id from public.profile_suggestions where startup_id = ${startupId}`,
      )
    )[0]!["id"] as string;
    await fails(
      as(investor, (tx) => tx`select public.resolve_profile_suggestion(${suggestionId}, true)`),
      /Suggestion not found/,
    );
    await as(founder, (tx) => tx`select public.resolve_profile_suggestion(${suggestionId}, true)`);
    const arr = await as(
      founder,
      (tx) =>
        tx`select value_display from public.company_metrics where startup_id = ${startupId} and metric_key = 'arr'`,
    );
    expect(arr).toEqual([{ value_display: "2400000" }]);

    // Deletion: outsiders can't; owner can, and the storage object goes with it.
    const foreignDelete = await as(
      investor,
      (tx) => tx`delete from public.documents where id = ${documentId} returning id`,
    );
    expect(foreignDelete.length).toBe(0);
    const foreignObjDelete = await as(
      investor,
      (tx) => tx`delete from storage.objects where name = ${path} returning id`,
    );
    expect(foreignObjDelete.length).toBe(0);
    await as(founder, (tx) => tx`delete from public.documents where id = ${documentId}`);
    const gone = await sql`select id from storage.objects where name = ${path}`;
    expect(gone.length).toBe(0);
  });

  test("activity and intro requests respect both organizations", async () => {
    await fails(
      as(
        investor,
        (tx) =>
          tx`insert into public.activity_events (org_id, actor_id, kind, description) values (${startupOrg}, ${investor.id}, 'spoof', 'x')`,
      ),
      /row-level security/,
    );
    await as(
      investor,
      (tx) =>
        tx`insert into public.intro_requests (startup_id, investor_id, requester_id, message) values (${startupId}, ${investorId}, ${investor.id}, 'Hello')`,
    );
    await fails(
      as(
        founder,
        (tx) =>
          tx`insert into public.intro_requests (startup_id, investor_id, requester_id, message) values (${startupId}, ${investorId}, ${founder.id}, 'Forged')`,
      ),
      /row-level security/,
    );
    const founderSees = await as(
      founder,
      (tx) => tx`select message from public.intro_requests where startup_id = ${startupId}`,
    );
    expect(founderSees).toEqual([{ message: "Hello" }]);
    const activityLeak = await as(
      founder,
      (tx) => tx`select id from public.activity_events where org_id = ${firmOrg}`,
    );
    expect(activityLeak.length).toBe(0);
  });

  test("profiles cannot point active_org_id at a foreign organization", async () => {
    await fails(
      as(
        founder,
        (tx) => tx`update public.profiles set active_org_id = ${firmOrg} where id = ${founder.id}`,
      ),
      /row-level security/,
    );
    await as(
      founder,
      (tx) =>
        tx`update public.profiles set full_name = 'Ada Founder', active_org_id = ${startupOrg} where id = ${founder.id}`,
    );
  });

  test("no policy grants blanket access to authenticated users", async () => {
    const rows = await sql`
      select tablename, policyname from pg_policies
      where schemaname = 'public' and 'authenticated' = any(roles)
        and tablename <> 'data_sources' -- read-only reference data, intentionally shared
        and (qual = 'true' or with_check = 'true')`;
    expect(rows).toEqual([]);
  });
});
