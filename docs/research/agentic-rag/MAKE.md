# Make research for FundMatch

## What it is

Make is a visual automation platform with scenarios, app integrations, AI Agents, agent tools, knowledge/RAG, MCP connections, sub-agent delegation, structured outputs, and scheduled/triggered execution.

Primary sources:

- https://help.make.com/create-your-first-ai-agent
- https://www.make.com/en/how-to-guides/build-ai-agents
- https://academy-content.make.com/courses/build-ai-agents-with-make/01-make-ai-agent/

## Relevant capabilities

Make's current AI-agent tooling can:

- run an agent inside a scenario;
- connect OpenAI, Claude, and other model providers;
- expose normal modules or entire scenarios as tools;
- connect MCP servers;
- call one level of sub-agent tools;
- attach knowledge files backed by retrieval;
- request structured responses;
- preserve conversation IDs/history;
- combine agent steps with ordinary workflow automation.

## Where it fits in FundMatch

Like n8n, Make is best used around the core platform rather than inside the canonical matching engine.

Good uses:

- pilot CRM sync;
- intake from forms, spreadsheets, and email;
- notifications and operations;
- founder/investor onboarding automations;
- internal review queues;
- lightweight partner integrations;
- experiments before a workflow earns a native product implementation.

Make becomes especially useful after FundMatch exposes a small MCP/API surface, because Make can call those tools without receiving direct database access.

## Where it should not fit

Do not move FundMatch's core thesis eligibility, scoring, provenance, private document retrieval, or canonical profile writes into Make scenarios. Those are product logic and need code review, typed tests, RLS-aware data access, and version-controlled implementation.

## Decision

**Use Make as an external automation client of FundMatch, not as FundMatch's system of record or primary agent runtime.**

The preferred relationship is:

```text
Make trigger / scenario
   -> FundMatch API or MCP tool
   -> FundMatch server authorization
   -> queue / agentic runtime / Postgres
   -> structured result
   -> Make continues external automation
```

This gives us Make's integration speed without surrendering the reliability boundary.

## Guardrails

- Agents in Make should receive bounded tools, not broad database credentials.
- Make should not automatically publish or send high-impact investor/founder claims without review.
- Long-lived workflows should store FundMatch run IDs so external executions can be reconciled.
- Keep proprietary ranking logic and prompts inside the application/server runtime.
- Treat Make as replaceable integration infrastructure.
