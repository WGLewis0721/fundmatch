# Queued document processing — operations

How the Phase 8 document pipeline runs, what it needs, and what to check when a
founder says "my deck was never analyzed".

## The shape of it

```text
browser: insert documents row -> upload bytes -> mark_document_uploaded(id)
         -> requestDocumentAnalysis(documentId)        [server function]
server:  start_document_run(documentId)                [durable run + pgmq]
         -> worker: canonical re-read, authorized download, chunk, embed,
                    document agent, validation, readiness rules
         -> record_document_suggestions(...)           [pending proposals]
founder: accept / correct / reject
         -> resolve_profile_suggestion(...)            [canonical write]
```

`public.agent_runs` is the durable ledger. pgmq is delivery only. Every stage is
keyed so redelivery converges rather than duplicating:

| Stage | What makes it idempotent |
| --- | --- |
| run creation | advisory lock per document + "an active run already exists" check |
| run claiming | conditional `queued -> running` update; the loser skips |
| chunks | unique `(org_id, source_type, source_locator, content_sha256)` |
| embeddings | only chunks with no vector are queued |
| suggestions | partial unique index on pending `(startup, field, document, value)` |
| promotion | a resolved suggestion cannot be resolved twice |

## Required configuration

| Variable | Effect if missing |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | the worker cannot run at all |
| `SUPABASE_PUBLISHABLE_KEY` | the authenticated trigger cannot verify the caller |
| `OPENAI_API_KEY` | pipeline still runs: deterministic labelled-line extraction, no embeddings, no document agent |
| `FUNDMATCH_AGENT_MODEL` | defaults to `gpt-4.1-mini` |
| `FUNDMATCH_EMBEDDING_MODEL` | defaults to `text-embedding-3-small` (1536 dimensions, enforced) |
| `FUNDMATCH_CRON_SECRET` | the scheduled drain refuses every request |

Migrations `0006`, `0007` and `0008` must be applied to the project. `0006`/`0007`
need the `vector` and `pgmq` extensions, which is why plain-PostgreSQL CI applies
`0008` but not those two.

## Running the drain

Two entry points, both in `src/lib/agentic/processing.functions.ts`:

- `requestDocumentAnalysis({ documentId })` — called by the workspace right after
  an upload. Verifies the caller is a member of the document's organization,
  starts the run, then drains a small amount of work inline. The browser may
  disconnect immediately; the run survives.
- `runAgenticWorker()` — operational drain, authenticated with the cron bearer
  secret. Schedule this (any scheduler that can send an authenticated POST) so
  that work nobody triggered still gets done.

**Nothing schedules `runAgenticWorker` yet.** Until something does, documents are
processed by the upload-time trigger and by whatever calls the drain. The sweeper
inside each drain picks up documents still sitting at `uploaded`, so a missed
callback is recovered on the next run rather than lost.

## Supported input

Analyzed: **PDF with selectable text**, **UTF-8 `.txt`** (10 MB, 60 pages,
120k characters — the existing intelligence limits).

Stored but not analyzed: scanned/image-only PDFs, PPTX, DOCX, XLSX, CSV, PNG,
JPEG. These fail with `UNSUPPORTED_TYPE` or `OCR_REQUIRED` and the founder sees
the reason on the document. There is no OCR and no Office conversion.

## Triage

Look at the document's status first, then the run.

```sql
-- what happened to one document
select d.status, d.processing_error, d.extraction,
       r.id as run_id, r.status as run_status, r.error_code, r.metadata
from public.documents d
left join public.agent_runs r
  on r.subject_type = 'document' and r.subject_id = d.id::text
where d.id = '<document id>'
order by r.created_at desc;

-- the steps of a run
select sequence, agent_type, status, validation_status, error_code, output_summary
from public.agent_steps where run_id = '<run id>' order by sequence, attempt;

-- work that is queued but not moving
select id, subject_id, status, created_at from public.agent_runs
where status = 'queued' order by created_at;
```

| Symptom | Likely cause |
| --- | --- |
| document stuck at `uploaded`, no run | nothing has drained; trigger a drain |
| run `queued`, never `running` | no drain is scheduled, or pgmq is not installed and the sweeper has not run |
| `UNSUPPORTED_TYPE` | not a PDF/TXT — expected, not a bug |
| `OCR_REQUIRED` | scanned deck with no text layer |
| `NO_COMPANY` | the document was uploaded without a company link |
| `RETRIES_EXHAUSTED` | three deliveries failed transiently; inspect `agent_steps` |
| run `needs_review` | the document contradicted itself; both values are waiting for the founder |

## Boundaries that must not be relaxed

- Queue messages carry identifiers, never document content.
- The worker re-reads organization and company from `public.documents`; it never
  trusts identifiers in a queue payload.
- `document_chunks` and `chunk_embeddings` are revoked from `anon`/`authenticated`
  and carry deny-all policies. Private source text and vectors never reach a
  browser.
- Semantic similarity is not authorization. Retrieval is always scoped by
  organization before ranking.
- A model proposal is not a fact. `resolve_profile_suggestion` is the only path
  from a proposal to a company or readiness value, and it requires a human.
- Conflicting evidence stays conflicting until a person resolves it.
