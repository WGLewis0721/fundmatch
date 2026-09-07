# Profile intelligence — integration contract v1

Owner split: this branch owns extraction, provenance, human review, evidence-based matching, and readiness suggestions. Fable owns authentication, organization isolation, persistence, private document storage, and deployment. **No database migrations or authentication changes are included.**

## What runs now

Open the founder demo and choose **Build from deck** (`/demo?persona=founder&view=intelligence&company=dippi`; GitHub Pages adds `/fundmatch`). PDF/text processing, sourced review, corrections, session profile confirmation, deterministic thesis comparison, and readiness acknowledgements work without a model or server. Imported text and confirmed claims live only in component memory; leaving this screen clears them. Existing demo browser storage is unchanged. Imported claims do not silently overwrite fictional demo data.

Local extraction recognizes explicit, single-line field labels: Company, Description, Team, Business model, Sector, Stage, Geography, Revenue, Growth, Funding ask, Use of funds. It does not summarize arbitrary slide layouts. Export PowerPoint to PDF; scanned images need OCR, which is explicitly unavailable.

The server AI adapter and authorized orchestration service are implemented, but **no unauthenticated endpoint is exposed**. Fable must wire the ports below. Without that wiring, the UI reports AI/private storage unavailable. No real provider calls were made during development.

## Data interfaces

`src/lib/intelligence/contracts.ts` is authoritative; document, candidate, and confirmation inputs use strict Zod validators.

| Type                               | Meaning                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| SourceDocument                     | Immutable document ID/name, SHA-256, consecutive one-based pages with extracted text                                             |
| Candidate / Claim                  | Field, literal value, page, exact supporting quote, uncertainty; persisted proposals include source identity and conflict marker |
| Extraction                         | Immutable run ID, document, proposed claims, missing fields, warnings, method and timestamp                                      |
| Confirmation                       | Extraction ID, expected profile version, idempotency key, per-claim accept/correct/reject decisions                              |
| ConfirmedClaim / ConfirmedProfile  | Reviewed value plus original value, document/page/quote/digest, reviewer/time/reason, uncertainty; versioned profile             |
| InvestorPreferences / SourcedMatch | Explicit categories and constraints, alignment score or null, evidence coverage, cited criteria, mismatches, questions           |
| ReadinessSuggestion                | Evidence references and a proposed **Needs review** state; always requires human confirmation                                    |

Unknown fields are absent, never zero. Forecasts stay ambiguous, including after review. Conflicting values remain in the immutable extraction; selecting a winner requires a reason. Corrections retain the original quote and value and must never be described as literal document facts. A new profile version does not erase the old extraction/audit record.

## Fable's backend ports

Implement `IntelligenceRepository` in `service.server.ts`:

- Derive `WorkspaceContext {userId, organizationId, companyId}` from verified server authentication and authorized company membership. Never accept these as proof of authority from request JSON.
- Every repository operation scopes to that context. Require editor permission before reading private documents, proposals, or profiles, and before mutation. Cross-organization document/extraction IDs must return a generic not-found/denied result.
- `readDocument` resolves an immutable private object ID, not an arbitrary URL/path. It returns filename, actual byte size/type, and bytes. Server processing independently validates size, magic bytes, UTF-8, page and text limits and computes SHA-256. Do not trust browser-extracted text or claimed digests.
- `saveExtraction` stores the immutable canonical proposal and its full provenance. `readExtraction` must read this server copy. The confirmation API accepts decisions only, not replacement claims or actor identities.
- `readProfile` returns the canonical profile in the authorized company.
- `findConfirmation` and `commitConfirmation` implement scoped idempotency. Same key + identical request returns the original result; same key + different request is rejected.
- `commitConfirmation` must atomically check expected version, update only accepted fields, increment once, and write audit/idempotency records. A stale version returns `VERSION_CONFLICT`; the frontend must reload the latest canonical profile before another review. Revalidate access inside the transaction.
- Ensure document deletion/retention removes or restricts derived text and quotes consistently. Quotes are confidential document data too. Do not log upload content, provider request bodies, keys, or raw provider errors.

Suggested authenticated routes (names are proposals, **not installed routes**):

| Route                             | Body/result                                                               |
| --------------------------------- | ------------------------------------------------------------------------- |
| POST company documents            | Multipart upload → `{documentId}` after authorized private storage        |
| POST company intelligence/process | `{documentId}` → `Extraction` via `intelligenceService.process`           |
| POST company intelligence/confirm | `Confirmation` → `ConfirmedProfile` via `intelligenceService.confirm`     |
| GET company profile               | Current `ConfirmedProfile` for initial load and version-conflict recovery |

Map domain errors to safe error codes/messages; do not return server stacks. Use 401/403 for access denial, 409 for stale version/idempotency reuse, 413 for limits, 422 for malformed/OCR-required inputs, and 503 for unavailable services. Apply CSRF protection as appropriate, quotas, request rate limits, and bounded concurrent parsing/model calls before enabling the endpoint.

## PDF and model setup

The shared `readDocument` accepts `PdfTextReader`. Browser PDF.js is lazy-loaded on upload and runs a same-origin worker. `makePdfTextReader` permits a server-compatible PDF.js loader (fixture tests use its legacy Node build). Fable must choose a parser/runtime compatible with its deployment; do not assume the Cloudflare runtime supports Node's PDF.js dependencies. Keep byte/page/text limits, time limits, and cancellation in any worker/job implementation. Limits are 10 MB, 60 pages, 120,000 text characters, and 150 proposals.

Construct `openAIExtractor({apiKey, model})` with **server secret values**. Suggested secret names: `OPENAI_API_KEY`, `FUNDMatch_EXTRACTION_MODEL`; no `VITE_` prefix, no browser settings form, no key in localStorage. The model is explicitly configured rather than silently chosen. It must support Responses structured outputs. API details follow the [official structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs).

The adapter uses a fixed provider endpoint, strict JSON output, `store:false`, a 45-second timeout, and no tools or browsing. `store:false` is not a claim of zero provider retention. Treat document text as untrusted data, including filenames and instructions impersonating system messages. Independently check every returned quote against the cited page and every value against its quote. The instruction detector is only a warning/filter, not a complete injection defense. Human confirmation is mandatory. Refusals, rate limits, timeouts, malformed responses, and incomplete generation fail explicitly; they do not update profiles.

## Mounting the UI

Mount `ProfileIntelligence` with an authorized `IntelligenceGateway` (`upload`, `process`, `confirm`), canonical `initialProfile`, company `profileId`, confirmed investor preferences, and `onConfirmed` to refresh Fable's workspace profile/cache. Key by company ID. After external profile changes or 409 recovery, reload/remount with the latest canonical profile; never retry against a guessed version. The component reuses the idempotency key for an unchanged failed confirmation.

Without a gateway it is explicitly a session workflow. The component never persists private text to demo browser storage. Investor matching must consume the same confirmed version returned by the backend, not the old seeded demo match engine.

## Matching and readiness semantics

The score is a transparent preference-alignment index, **not a funding probability**. Exact categorical filters and confirmed YoY growth are deterministic; mismatches/exclusions are exposed. Missing or ambiguous evidence earns no points and produces a question. No evidence means a null score. Coverage is shown separately. Total round ask is not individual check size, so the check-range comparison remains a question. Model assistance currently proposes sourced profile facts; it does not override filter results or generate uncited investment conclusions.

`readinessSuggestions(profile)` is pure and does not mutate tasks. The UI's acknowledgement currently stays in-session, even with a gateway. Fable can connect a separate explicit review action carrying `{suggestionId, profileVersion, idempotencyKey}`. Recompute evidence from that authorized canonical profile, reject stale versions, audit the reviewer, and create/update a task to **Needs review**, never Complete. Do not mark incorporation, ownership, legal validity, or investment readiness proven because a deck mentions them.

## Merge handoff

Only the founder navigation/render location in `src/routes/demo.tsx` overlaps Fable's likely UI work. All intelligence code lives under `src/lib/intelligence` and `src/components/intelligence`. Preserve both branch changes when integrating. Keep the homepage, film assets, existing demo, and migrations intact. See `profile-intelligence-test-evidence.md` for verified behavior and outstanding gates.
