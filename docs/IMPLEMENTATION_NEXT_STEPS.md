# FundMatch Implementation Next Steps

This document turns the roadmap into the next executable build sequence. Do not start with large-scale infrastructure. Prove the private marketplace loop first.

## Priority 0 — Protect the implementation

Before external pilots:

- make the production/core repository private or split public demo/marketing from private product code;
- keep ranking weights, prompts, model features and proprietary data sources out of public docs;
- keep the GitHub Pages demo fictional and free of production credentials;
- retain server-side-only service-role access for privileged operations.

## Priority 1 — Complete authenticated deployment acceptance

This remains the immediate blocker.

Ship the real `/app` against the intended FundMatch Supabase project and verify:

1. signup and email confirmation;
2. login, logout and recovery;
3. startup and investor organization creation;
4. invitations and membership roles;
5. founder profile persistence;
6. investor thesis persistence;
7. Pass / Save / Interested persistence;
8. private document upload/download/delete;
9. cross-organization RLS isolation;
10. no demo/localStorage dependency inside production workflows.

**Exit:** two test organizations can use the app independently and cannot access each other's private data.

## Priority 2 — Build the production discovery pipeline

Keep the deterministic MatchEngine, but move production candidate retrieval and decision persistence behind the real data layer.

Build in this order:

1. hard eligibility query;
2. candidate retrieval from listed/discoverable companies;
3. deterministic scoring on production records;
4. versioned match result/explanation;
5. persistent decision state;
6. append-only discovery events;
7. pagination/precomputed candidate batches if needed.

**Exit:** an investor can log in, see ranked real test companies, take decisions, leave, return and resume without repeated candidates.

## Priority 3 — Add investor interest workflow

Do not build generic chat first.

Add:

- `interests` record/state;
- Interested → founder notification;
- founder Accept / Decline / Ask for more information;
- accepted interest → introduction thread;
- audit history;
- email notification worker.

Suggested statuses:

```text
requested
viewed
accepted
declined
needs_information
withdrawn
```

**Exit:** investor interest creates a safe, permissioned founder response workflow without exposing private contact details automatically.

## Priority 4 — Add durable event history

Record marketplace behavior separately from current state.

Start with:

- candidate impression;
- profile opened;
- pass;
- save;
- interested;
- intro requested/accepted/declined;
- meeting stage;
- diligence stage;
- funded/no-deal outcome.

Use this first for product analytics and audit history. Do not train a ranking model yet.

**Exit:** FundMatch can answer how a company moved from discovery to outcome.

## Priority 5 — Implement queued AI document processing

Use Supabase Queues + a server-only worker/Edge Function.

Pipeline:

```text
uploaded document
→ queue
→ extraction
→ structured validation
→ profile/readiness suggestions
→ provenance
→ founder review
```

Requirements:

- retries;
- idempotency;
- processing state;
- structured error recording;
- no silent profile overwrite;
- service role never in browser code.

**Exit:** a private uploaded deck produces reviewable sourced suggestions in the authenticated app.

## Priority 6 — Add semantic candidate recall

Only after deterministic production matching works.

Use `pgvector` to represent:

- normalized company narrative;
- confirmed investor thesis.

Use semantic similarity to expand/reorder a candidate set. Do not replace hard filters.

Recommended ranking shape:

```text
eligibility
→ deterministic score
→ semantic augmentation
→ business/diversity rules
→ explanation
```

**Exit:** semantic matching demonstrably surfaces useful candidates missed by exact categorical overlap, while explanations remain understandable.

## Priority 7 — Notifications and realtime

Use Supabase Realtime Broadcast for live UI updates and durable `notifications` records for unread/read state.

First realtime events:

- new interest;
- interest response;
- document processing result;
- team pipeline update;
- new suggestion available.

Use queued transactional email for offline users.

**Exit:** users do not need to refresh the page to see important workflow changes.

## Priority 8 — Pilot instrumentation

Before adding more features, measure:

Founder side:

- profile completion rate;
- readiness completion rate;
- packet generation rate;
- time to completed profile;
- response rate to investor interest.

Investor side:

- candidate open rate;
- save rate;
- interested rate;
- intro acceptance rate;
- meeting conversion;
- time from discovery to decision.

Marketplace:

- eligible candidates per thesis;
- repeated/empty-feed rate;
- match explanation usefulness;
- investor/founder response latency;
- false-positive/weak-fit feedback.

## Infrastructure triggers — what not to build yet

### Do not add Redis yet

Add it only if repeated recommendation/profile reads create measurable database pressure or latency that indexed Postgres cannot solve.

### Do not add Elasticsearch/OpenSearch yet

Add a dedicated search engine only if Postgres filtering/full-text/pgvector cannot satisfy candidate retrieval latency or scale.

### Do not add Kafka yet

Use Postgres event tables + Supabase Queues first. Introduce event streaming when multiple independent consumers and event volume justify it.

### Do not add Kubernetes/microservices yet

Keep a modular monolith. Split services only when deployment, team ownership or scaling requirements demand independent lifecycles.

## Recommended implementation order

```text
1. Private authenticated deployment
2. Production candidate retrieval + decisions
3. Interest / founder response workflow
4. Discovery/outcome event history
5. Queued AI document processing
6. Semantic matching augmentation
7. Realtime + offline notifications
8. Pilot analytics
9. Billing
10. Native mobile companion only after validation
```

## Pilot-ready definition

FundMatch is ready for a controlled real-user pilot when:

- private auth and RLS are verified;
- founders can create complete profiles and upload private materials;
- investors can define a thesis and receive ranked real test/pilot companies;
- Pass/Save/Interested persists;
- interest can be accepted/declined by a founder;
- important events are auditable;
- email/realtime notifications work;
- demo claims are separated from production claims;
- no proprietary private-market dataset is used without permission/license;
- basic analytics show where users drop out and which matches progress.

At that point, recruit a small controlled cohort instead of expanding the feature list blindly.
