# FundMatch documentation

The current public demo and authenticated application are the golden baseline.
Read [ROADMAP.md](../ROADMAP.md) for the current implementation and acceptance
state. A merged feature, hosted schema, and signed-in production acceptance are
different milestones. The fictional `/demo` is separate from the private
`/app`; do not describe mock integrations as production capabilities.

| Need | Document |
| --- | --- |
| Product and production gates | [ROADMAP.md](../ROADMAP.md) |
| Minimum controlled pilot | [MVP_ROADMAP.md](../MVP_ROADMAP.md) |
| Build dependencies, not live status | [IMPLEMENTATION_NEXT_STEPS.md](IMPLEMENTATION_NEXT_STEPS.md) |
| Matching and authorization design | [MATCHING_ARCHITECTURE.md](MATCHING_ARCHITECTURE.md) |
| Agentic runtime and document operations | [AGENTIC_RAG_ARCHITECTURE.md](AGENTIC_RAG_ARCHITECTURE.md), [DOCUMENT_PROCESSING.md](DOCUMENT_PROCESSING.md) |
| Backend and current host | [BACKEND.md](BACKEND.md), [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) |
| Product test and phase evidence | [TEST_EVIDENCE.md](TEST_EVIDENCE.md), [PHASE6_MARKETPLACE_EVENTS.md](PHASE6_MARKETPLACE_EVENTS.md) |
| Brand and beta waitlist | [brand/BRAND.md](brand/BRAND.md), [WAITLIST_API.md](WAITLIST_API.md) |

The `ai-prompts/` folder contains reusable role templates **and dated
execution snapshots**. Cloudflare deployment prompts and old Phase 5 task
files are historical. [Its index](ai-prompts/README.md) must defer to the
roadmap and Vercel runbook. Research and dated acceptance reports record what
was known at the time; they do not override the current release gates.
