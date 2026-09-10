# FundMatch Matching & Marketplace Architecture

This document defines the intended technical architecture for FundMatch as a two-sided capital discovery product. It is deliberately inspired by the useful architectural patterns behind dating/discovery products such as Tinder and Hinge, without copying their product rules or prematurely adopting their scale infrastructure.

FundMatch is not a dating app. The useful analogy is the interaction model: build structured profiles, retrieve eligible candidates, rank them, show one coherent opportunity at a time, collect decisions, create a mutual workflow when interest exists, and learn from outcomes.

## Executive decision

The current FundMatch stack is a good MVP foundation and should **not** be replaced.

Use:

- **Web client:** React 19 + TanStack Start/Router + TypeScript.
- **Public demo:** static GitHub Pages build with fictional browser-only data.
- **Production app host:** Cloudflare Workers/Nitro for the authenticated web application.
- **System of record:** Supabase Postgres.
- **Identity and authorization:** Supabase Auth + Row-Level Security.
- **Private files:** Supabase Storage.
- **Realtime state:** Supabase Realtime Broadcast for notifications and workflow updates.
- **Background work:** Supabase Queues (`pgmq`) + server-side workers/functions.
- **Privileged workflows:** Supabase Edge Functions first; Cloudflare Workers may also call the same server-side interfaces where appropriate.
- **Semantic retrieval:** Postgres + `pgvector`; keep hard eligibility filters in normal relational columns/indexes.
- **Transactional email:** provider behind a server-only interface; Resend is the preferred first implementation unless requirements change.
- **Billing:** Stripe when commercialization begins.
- **Observability:** structured logs, error reporting, latency/error metrics and product event analytics before pilot expansion.

Do not introduce Redis, Kafka, Elasticsearch, Kubernetes or a microservice fleet because a dating app uses them at massive scale. Add them only when measured production load creates a problem the current stack cannot solve economically.

## What discovery apps teach us

Small Tinder-style clone projects commonly use one application plus a managed backend such as Firebase for authentication, profiles, storage, matching decisions and realtime chat. That is the correct complexity level for an early FundMatch product.

At large scale, Tinder describes recommendation/search infrastructure using geographically partitioned Elasticsearch and a large microservice/API-gateway environment. Hinge publicly describes a recommendation platform with candidate retrieval and ranking, low-latency serving, event-driven systems, Kafka/search infrastructure, cloud services and Kubernetes. These are useful **boundaries**, not a starting deployment target for FundMatch.

The architecture principle FundMatch should borrow is:

```text
profile data
  ↓
eligibility / candidate retrieval
  ↓
ranking
  ↓
explanation + presentation
  ↓
user decision
  ↓
workflow / notification
  ↓
outcome event
  ↺ feeds future ranking
```

## FundMatch discovery pipeline

### 1. Profile normalization

Founders create or import one canonical company profile. Investors create one canonical firm/thesis profile.

Important founder fields include:

- sector / category
- stage
- geography
- business model
- funding ask
- traction / revenue / growth
- team and market information
- readiness and available materials
- source provenance

Important investor fields include:

- preferred sectors
- stages
- geography
- check range
- business-model preferences
- exclusions
- required traction / ownership / mandate constraints
- optional semantic thesis text

Company-reported facts, imported facts and AI-suggested facts must remain distinguishable.

### 2. Eligibility filter

Before any AI ranking, remove impossible candidates using deterministic database filters.

Examples:

- stage outside thesis
- ask outside usable check range
- geography excluded
- sector explicitly excluded
- company hidden/private/not discoverable
- investor already passed the company
- block or administrative exclusion

These rules belong in Postgres/query logic and are not an LLM task.

### 3. Candidate retrieval

For the MVP, candidate retrieval should combine:

1. relational/SQL filters for hard constraints;
2. normalized categorical scoring for sector, stage, geography, check range and business model;
3. optional `pgvector` semantic similarity between normalized company narrative and confirmed investor thesis.

This produces a reasonably small candidate set before ranking.

Do **not** publish proprietary production weights, feature engineering, prompts, model parameters or ranking heuristics in the public repository once they become a competitive advantage.

### 4. Ranking

Keep the existing deterministic MatchEngine as the baseline.

A production ranker should eventually combine signals such as:

```text
hard eligibility
+ deterministic thesis fit
+ semantic thesis/company similarity
+ readiness / data completeness confidence
+ freshness
+ investor behavior signals
+ diversity / repetition controls
+ learned outcome signals
```

The ranker must return more than a number. It should retain enough information to explain why the company was surfaced.

The first production version should remain deterministic + semantic augmentation. Do not train a recommendation model until FundMatch has real outcome data.

### 5. Presentation and decision

The current Pass / Save / Interested interaction is appropriate.

Persist every meaningful interaction as an event, not just the latest state.

Recommended event vocabulary:

- `candidate_impression`
- `profile_opened`
- `passed`
- `saved`
- `interested`
- `intro_requested`
- `intro_accepted`
- `intro_declined`
- `meeting_scheduled`
- `diligence_started`
- `passed_after_review`
- `funded`
- `no_deal`
- `readiness_changed`

The current state tables can remain for fast reads; an append-only event stream gives FundMatch the history needed for analytics, auditability and future learning.

### 6. Interest is not a dating-style automatic match

FundMatch should not literally copy Tinder's mutual-like rule.

Recommended capital workflow:

```text
Investor marks Interested
        ↓
Interest record + founder notification
        ↓
Founder reviews investor/firm + request context
        ↓
Accept / Decline / Ask for more information
        ↓
Accepted interest becomes introduction thread
        ↓
Conversation / meeting / diligence workflow
```

A founder may separately express target-investor interest, but a mutual positive signal should increase priority rather than automatically expose private contact details.

### 7. Realtime and notifications

Use Supabase Realtime Broadcast for user-visible state that benefits from immediacy:

- new investor interest
- intro accepted/declined
- team pipeline changes
- new team note indicator
- document processing completed/failed
- readiness suggestion available

Persistent state must still live in Postgres. Realtime is delivery, not the source of truth.

Email notifications should be queued and sent by a server-side worker/function. Never send directly from browser code.

### 8. Background jobs

Use Supabase Queues (`pgmq`) for work that should survive retries or client disconnects:

- document extraction
- embeddings
- thesis normalization
- match recomputation
- email delivery
- integration imports
- packet generation if server-generated output is added
- analytics aggregation

Typical flow:

```text
Postgres change / server request
        ↓
queue message
        ↓
Edge Function / worker
        ↓
external API or AI provider
        ↓
validated result
        ↓
Postgres write
        ↓
Realtime notification if needed
```

Every job should be idempotent or carry an idempotency key.

## AI boundary

AI is an augmentation layer, not the database and not the authority for important claims.

Good uses:

- document extraction and normalization
- thesis inference for investor confirmation
- semantic embeddings
- fit explanation
- strengths / risks / open questions
- profile/readiness suggestions
- later, ranking augmentation

Bad uses:

- silently changing company facts
- inventing traction
- inventing investor preferences
- treating an LLM score as funding probability
- bypassing deterministic eligibility constraints

The existing human-confirmation and provenance model should remain mandatory.

## Data model additions recommended before pilot

The current schema already contains much of the foundation. Add or formalize these concepts as the production marketplace matures:

- `discovery_events` — append-only user/company discovery events.
- `interests` — investor-to-company interest request and status.
- `introduction_threads` — accepted workflow container.
- `notifications` — durable notification state/read status.
- `job_runs` or queue metadata — observability for important async work.
- `company_embeddings` — normalized semantic company representation.
- `thesis_embeddings` — confirmed investor thesis representation.
- `match_versions` — score/version/model metadata so rankings remain auditable.

Do not add all of these in one migration unless the implementation phase needs them.

## Search and cache strategy

### Now

Use Postgres indexes, query planning, full-text search where useful and `pgvector` for semantic retrieval. This keeps one source of truth and minimizes infrastructure.

### Later, only with evidence

Add a dedicated search engine when Postgres cannot meet candidate-retrieval latency or filtering throughput. Add Redis when measured hot-read/recommendation caching materially reduces database load. Add Kafka/event streaming when durable event volume or independent consumers exceed the queue/event-table model.

Do not adopt these because Tinder has them; Tinder's scale is not FundMatch's scale.

## Security and anti-scraping

Because FundMatch handles private company and investor information:

- keep the production repository private;
- keep proprietary matching logic server-side;
- keep service-role credentials server-only;
- enforce RLS for all browser-accessible tables;
- use private storage for confidential materials;
- rate-limit sensitive endpoints;
- log authorization failures and abusive request patterns;
- do not expose bulk investor/company exports by default;
- add Terms of Use restrictions around scraping and unauthorized automated extraction;
- separate public marketing/demo data from production data;
- expose only the minimum profile fields required for the current workflow.

## Scaling stages

### Stage A — pilot / hundreds to low thousands of organizations

One Supabase project, Postgres/RLS, Storage, Realtime, Queues, Edge Functions and one Cloudflare-hosted web application are sufficient if queries are indexed and jobs are asynchronous.

### Stage B — growing marketplace

Add read replicas or stronger database sizing, dedicated analytics pipeline, precomputed recommendation sets, stricter rate limiting, observability/SLOs and queue-worker concurrency controls.

### Stage C — large marketplace

Only then evaluate dedicated search, Redis recommendation cache, separated recommendation service, event streaming, independent model serving and service decomposition.

Microservices are an outcome of scale and organizational boundaries, not a milestone by themselves.

## Mobile strategy

Dating clones often start with React Native/Flutter because dating is primarily mobile. FundMatch's first users are doing research, diligence, document preparation and pipeline work, so responsive web should remain primary.

After product-market validation, a React Native/Expo companion can reuse API contracts for:

- discovery/swiping
- interest notifications
- quick founder/investor responses
- messaging
- pipeline alerts

Do not delay the web pilot to build native apps.

## Architecture references

These sources informed the architecture comparison; they are references, not dependencies:

- Tinder Tech — geosharded recommendation/search architecture: https://medium.com/tinder/geosharded-recommendations-part-2-architecture-3396a8a7efb
- Tinder Tech — API gateway and large microservice environment: https://medium.com/tinder/how-we-built-the-tinder-api-gateway-831c6ca5ceca
- AWS — Tinder Redis/ElastiCache scaling case study: https://aws.amazon.com/blogs/database/building-resiliency-at-scale-at-tinder-with-amazon-elasticache/
- Hinge — recommendation engineering role describing candidate retrieval/ranking and low-latency serving: https://hinge.co/careers/jobs/senior-backend-engineering-manager-recommendations
- Hinge — backend engineering role describing Go, Kubernetes, Kafka and event-driven systems: https://hinge.co/careers/jobs/senior-backend-engineer
- Example React Native/Firebase Tinder clone: https://github.com/MartsTech/tinder-clone
- Example modular Kotlin/Firebase Tinder clone: https://github.com/alejandro-piguave/TinderCloneCompose
- Supabase architecture: https://supabase.com/docs/guides/getting-started/architecture
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase Queues: https://supabase.com/docs/guides/queues
- Supabase automatic embeddings / pgvector workflow: https://supabase.com/docs/guides/ai/automatic-embeddings

## Decision summary

FundMatch should borrow the **pipeline structure** of mature recommendation products while keeping the **deployment simplicity** of a managed-backend clone.

The next architectural work is not a rewrite. It is to turn the current persistence model into a real marketplace loop:

```text
real account
→ normalized profile
→ candidate retrieval
→ ranked discovery
→ persistent decision events
→ interest request
→ founder response
→ tracked outcome
→ better future ranking
```
