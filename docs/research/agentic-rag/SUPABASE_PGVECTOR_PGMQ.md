# Supabase/Postgres + pgvector + pgmq research for FundMatch

## Current FundMatch state

FundMatch already uses Supabase Postgres, Auth, RLS, and private Storage. The live FundMatch project is on Postgres 17. At the start of this work, `vector`, `pgmq`, `pg_net`, and `pg_cron` were not enabled.

Official sources:

- https://supabase.com/docs/guides/ai
- https://supabase.com/docs/guides/ai/semantic-search
- https://supabase.com/docs/guides/ai/vector-indexes
- https://supabase.com/docs/guides/ai/automatic-embeddings
- https://supabase.com/docs/guides/queues
- https://supabase.com/docs/guides/queues/pgmq
- https://supabase.com/docs/guides/queues/quickstart

## pgvector

`pgvector` stores embedding vectors directly in Postgres and supports nearest-neighbor search. This is a strong fit for FundMatch because hard filters, authorization, metadata, and semantic vectors can stay in one transactional system instead of introducing a separate vector database.

### FundMatch use cases

- document-chunk retrieval for grounded RAG;
- semantic comparison of investor thesis text and company narratives;
- retrieval of prior approved claims and supporting evidence;
- similar-company retrieval for research/evaluation;
- hybrid search combining Postgres full-text and semantic similarity.

### Hard rule

Vector similarity must never override explicit eligibility or privacy constraints. Stage, geography, check range, exclusions, discoverability, organization authorization, and previous decisions remain normal SQL predicates.

### Indexing

Supabase recommends HNSW as the default approximate vector index for many production cases because it performs well and remains robust as data changes. For FundMatch's early dataset, exact search is acceptable until measurements justify the index; the schema can still be designed for HNSW.

## pgmq / Supabase Queues

`pgmq` is a Postgres-native durable queue. Messages remain until deleted or archived and are delivered with a visibility timeout. This is well suited to work that should survive client disconnects or transient external failures.

FundMatch queues should initially include:

- `agent_runs` — orchestration jobs;
- `embeddings` — document/profile/thesis embedding work;
- later `notifications` and `integrations` as needed.

Queue consumers must be server-side. Do not expose the raw queue schema to browser clients.

## Automatic embedding pattern

Supabase documents an architecture that combines `pgvector`, `pgmq`, Edge Functions, and optionally `pg_net`/`pg_cron` to keep embeddings synchronized. FundMatch should adopt the principle but keep control simple at first:

```text
content change
 -> enqueue embedding job
 -> privileged worker generates embedding
 -> validate model/version/dimensions
 -> write embedding
 -> archive queue message
```

We do not need database-triggered HTTP and cron on day one if the Vercel/server worker already owns the consumer loop.

## Embedding model choice

The first implementation can target OpenAI `text-embedding-3-small`, whose default output is 1536 dimensions. The model/dimension must be versioned with each embedding. If FundMatch later changes model or dimensions, old and new vectors must not be compared as if they were equivalent.

OpenAI reference:

- https://developers.openai.com/api/docs/models/text-embedding-3-small
- https://developers.openai.com/api/docs/guides/embeddings

## Data model recommendation

```text
document_chunks
  id
  organization_id
  company_id nullable
  investor_id nullable
  document_id nullable
  source_type
  source_locator
  content
  content_sha256
  metadata jsonb
  created_at

chunk_embeddings
  chunk_id
  model
  dimensions
  embedding vector(1536)
  embedded_at

agent_runs / agent_steps
  durable business-level execution and validation audit
```

Keeping chunks separate from embeddings allows re-embedding without rewriting the source record.

## Security

- RLS scopes source chunks to the owning organization and permitted marketplace context.
- Embedding rows inherit access through their source chunk; clients should not receive arbitrary vectors.
- Service-role access remains server-only.
- Retrieval functions must accept explicit organization/company/investor context and apply filters inside SQL, before limiting results.
- Queue payloads contain IDs and bounded metadata, not entire confidential documents.

## Decision

**Use Supabase Postgres as both the canonical database and the first vector store, with pgmq as the durable job queue.**

Do not add Pinecone/Weaviate/Redis/Kafka solely because the system is agentic. Revisit only when measured scale or operational constraints justify it.
