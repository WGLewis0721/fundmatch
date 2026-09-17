# Agentic RAG foundation acceptance — 2026-09-17

This record captures the repository, CI, live Supabase, and deployment evidence for the FundMatch agentic intelligence foundation.

## Repository acceptance

PR #25 (`Build FundMatch agentic RAG runtime foundation`) passed both repository workflows before merge:

- `Profile intelligence checks` — success
- `Check FundMatch` — success

The PR was squash-merged to `main` as commit `6fde31aaddd0c9d638a65919f604f1bd1991d75b`.

The merged foundation includes:

- TypeScript agent task/worker/result contracts;
- bounded orchestration, retry, one-level delegation, and lifecycle event hooks;
- evidence validation and review escalation;
- server-only OpenAI structured-output worker adapter;
- server-only OpenAI embeddings adapter;
- pgvector/pgmq schema migration;
- private RAG chunks and versioned embeddings;
- server-only semantic retrieval function;
- durable `agent_runs` and `agent_steps` audit records;
- automated runtime tests;
- separate technology research documents plus the assembled architecture;
- README and ROADMAP updates.

## Live FundMatch Supabase acceptance

Project: `dkanoobzseckccbwnpyi`

Migration `agentic_rag_foundation` was applied successfully after the PR merge.

Verified live extensions:

- `pgmq` `1.5.1`
- `vector` `0.8.2`

Verified live public tables:

- `public.agent_runs`
- `public.agent_steps`
- `public.document_chunks`
- `public.chunk_embeddings`

Verified pgmq queue/archive tables:

- `pgmq.q_agent_runs`
- `pgmq.a_agent_runs`
- `pgmq.q_embeddings`
- `pgmq.a_embeddings`

Verified server retrieval function:

- `public.match_document_chunks`

The RAG chunk/vector tables revoke browser privileges and are intended for privileged server retrieval only. The retrieval RPC is `SECURITY INVOKER`, revoked from `PUBLIC`, `anon`, and `authenticated`, and executable by `service_role` only.

## Advisor follow-up

After migration `0006`, Supabase advisors identified two new foundation-specific cleanup items:

1. `public.document_chunks` and `public.chunk_embeddings` had RLS enabled with no policies. This was deny-by-default and browser privileges were already revoked, but the linter reported it as informational.
2. `public.agent_steps.parent_step_id` did not yet have a covering index.

Migration `0007_agentic_rag_advisor_hardening.sql` resolves these without expanding access:

- explicit `USING (false) WITH CHECK (false)` policies for `anon` and `authenticated` on the server-only RAG tables;
- a partial covering index on `agent_steps(parent_step_id)`.

Existing advisor warnings on older `SECURITY DEFINER` helper RPCs, older-table foreign keys, RLS initialization plans, and multiple permissive policies predate the agentic foundation and are not introduced by this work.

## Deployment evidence

FundMatch's authenticated application is currently hosted on Vercel. During this acceptance pass, the latest production deployment was `READY` and `/app/login` returned HTTP 200 with FundMatch application HTML.

This confirms that the earlier Vercel Authentication/SSO interception blocker is no longer present on that deployment.

It does **not** by itself complete Phase 5. Signup/login/logout/password-reset, organization/invitation flows, private document operations, and deployed cross-organization isolation still require the explicit browser acceptance sequence in the roadmap.

## Scope boundary

The foundation is live infrastructure, but these product workflows are still intentionally not claimed complete:

- production queue consumers;
- automatic chunking/embedding for private uploads;
- live multi-step document/readiness agent execution;
- production semantic matching augmentation;
- MCP server exposure;
- OpenAI Agents SDK adapter;
- LangGraph durable graph/checkpoint runtime;
- Make/n8n external integration workflows.

Those build on this foundation in later roadmap work. The important result of this change is that FundMatch now has the durable, authorized, evidence-oriented substrate required to implement those workflows without another architecture rewrite.


## Phase 8 production activation follow-up

- PR #28 merged to `main` as `9dfa90a5093944f18e5022e54c85f0edaf4f57f6`.
- Production Supabase migrations `0000`–`0009` are applied.
- The existing Vercel FundMatch project was connected to the GitHub repository after the merge.
- A post-link Git push is required to trigger the first Git-integrated deployment; live route and provider-backed workflow acceptance remain pending until that deployment is READY.
