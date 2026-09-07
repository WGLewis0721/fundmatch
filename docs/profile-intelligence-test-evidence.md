# Profile intelligence — test evidence

Date: 2026-09-07. Branch: `feature/profile-intelligence`. Base: `eac7bf63739d3e6c8e9e7fb068e92f001aa28e83`.

## Passed locally

- `bun test`: **30 passed, 0 failed, 99 assertions** across three files. Includes the four existing demo regression tests.
- `npm run typecheck`: passed.
- `npm run build`: passed, including TanStack server rendering and the Cloudflare/Nitro production bundle.
- `npm run build:pages`: passed; existing homepage, demo route, film, poster, and captions validation passed.
- Client bundle inspection: no OpenAI endpoint, model authorization header, or model secret configuration names bundled. No live credential was used in tests.
- `git diff --check`: passed.

The PDF.js browser worker is lazy-loaded on upload (~1.27 MB uncompressed worker; ~431 kB parser). Existing main SSR/client bundle-size and Vite configuration warnings remain nonfatal. No homepage or product-video files changed.

## Fixture coverage

Fixtures in `tests/fixtures/decks` are synthetic. Their PDFs are checked in and can be regenerated with `python3 scripts/generate-intelligence-fixtures.py` (ReportLab required only for regeneration). PDF generation was rendered and visually inspected; production parser tests use the same `makePdfTextReader` implementation with PDF.js's Node-compatible loader.

| Fixture / scenario                                                             | Verified result                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Missing facts, PDF + text                                                      | Company/team extracted; revenue/ask remain absent; no invented metrics                                                          |
| Contradictory values, two-page PDF + text                                      | Both revenues retained with pages 1 and 2; selecting a winner requires a reason; confirming both is rejected                    |
| Malicious instructions, PDF + text                                             | Instruction-like revenue excluded; warning retained; projected growth remains ambiguous and cannot satisfy actual-growth filter |
| Nontext PDF                                                                    | Explicit OCR-required error, no success result                                                                                  |
| Wrong file type, invalid header, empty/oversized file, binary text, page limit | Rejected with no confirmed profile mutation                                                                                     |
| Cancelled input                                                                | Does not yield a profile                                                                                                        |
| Fabricated model quote/value/page                                              | Unsupported candidates excluded before persistence                                                                              |
| Missing provider credentials                                                   | Unavailable error; zero provider calls                                                                                          |
| Provider refusal, incomplete output, malformed JSON, rate limit, timeout       | Safe explicit error; no profile update and no raw provider detail exposure                                                      |
| Successful adapter fixture                                                     | Strict structured output request, no tools, untrusted data separated, `store:false`                                             |
| Corrections                                                                    | Original value/quote, reviewer, reason, and new version retained                                                                |
| Stale version, unknown claim, empty selection, missing reviewer                | Confirmation rejected                                                                                                           |
| Unknown evidence and exclusions                                                | Null/coverage-adjusted alignment, explicit mismatches, exclusion veto; round size not equated to check size                     |
| Server authorization denial                                                    | Happens before document/model access                                                                                            |
| Server processing                                                              | Persists only source-validated candidates with authorized canonical document ID                                                 |
| Idempotent retry                                                               | Orchestrator returns prior confirmation without another mutation (database atomicity still Fable's responsibility)              |
| React server rendering                                                         | No browser/parser/model invocation; unavailable state visible; untrusted HTML rendered as text                                  |
| Readiness                                                                      | Suggestions remain Needs review and require a person; no automatic completion                                                   |

## Browser QA — blocked, not passed

The supervised preview reported healthy. The connected browser rejected navigation with `net::ERR_BLOCKED_BY_CLIENT`, both to the requested screen and the exact preview root. Following the bounded recovery procedure, no alternate browser, host, or production deployment was used to bypass that boundary.

Consequently, browser upload interaction, keyboard flow, responsive layout, browser-worker loading, and rendered error states are **not visually verified**. Server-render tests and real PDF parser tests are useful coverage but do not replace browser QA.

Run this acceptance sequence once browser access is available:

1. Open founder demo → Build from deck. Check desktop and 390px mobile, keyboard focus, readable step cards, and no overflow.
2. Upload `missing.pdf`. Confirm unknown revenue/ask, readable page text/hash, disabled confirmation before selection. Select company and team, correct a value without a reason and verify error; add reason, confirm, and verify sourced profile version 1.
3. Upload `contradictory.pdf`. Compare both revenue pages. Confirm without a conflict reason and verify rejection; supply reason, choose one value, and confirm. Check original citation and correction/resolution note.
4. Upload `malicious.pdf`. Verify warning, absent fake revenue, ambiguous growth, no completed tasks, and no external navigation/request triggered by document instructions.
5. Upload `scanned.pdf`, invalid PDF, and oversized file. Verify explicit error and previous confirmed profile unchanged. Check AI availability → unavailable message, not fabricated success.
6. Review a readiness suggestion. Verify session-only acknowledgement and no automatic Complete task.
7. Navigate away/reload: imported private claims cleared; existing demo edits still behave normally. Recheck homepage film and founder/investor navigation.
8. After Fable wiring: repeat with authenticated storage, live configured model, cross-organization denial, stale profile/version recovery, duplicate confirmation retries, and readiness persistence. Do not treat fixture adapter tests as proof of real backend isolation.

## Remaining integration gates

- Fable's authenticated gateway, immutable private storage, scoped repository implementation, atomic version/idempotency/audit persistence, and profile-cache hookup.
- A deployment-compatible server PDF parser/worker, real model configuration, quota controls, and a live extraction smoke test.
- Browser QA above. This PR stays draft; it is not a production-readiness claim.
- OCR and native PPTX extraction are intentionally unavailable; users can provide selectable-text PDF or UTF-8 text.
- Readiness task persistence remains Fable's explicit review action; acknowledgements currently stay in session.
