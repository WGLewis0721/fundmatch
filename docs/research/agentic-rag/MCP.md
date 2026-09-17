# Model Context Protocol (MCP) research for FundMatch

## What it is

The Model Context Protocol is an open standard for exposing tools, resources, and prompts to AI applications through a consistent interface. The official TypeScript SDK supports Node.js, Bun, and Deno.

Primary sources:

- https://modelcontextprotocol.io/
- https://ts.sdk.modelcontextprotocol.io/v2/
- https://docs.anthropic.com/en/docs/mcp

## Why it matters

FundMatch will eventually need the same controlled capabilities to be callable from several environments: the product runtime, internal operations, Claude Code, developer tools, and possibly partner automation systems. Without a protocol boundary, each host tends to get one-off API glue.

MCP can make a narrow set of FundMatch capabilities reusable.

## Good MCP tools for FundMatch

Examples of safe, bounded tools:

- `get_company_profile`
- `get_investor_thesis`
- `search_authorized_evidence`
- `get_match_evidence`
- `create_profile_suggestion`
- `request_match_recompute`
- `get_agent_run_status`

Each tool must accept authenticated context from the server/host. A model must never be allowed to choose an arbitrary `organization_id` and thereby escape authorization.

## Resources vs tools

Resources are useful for read-only, addressable context such as an approved company packet or an investor thesis snapshot. Tools are appropriate for bounded actions such as requesting a recomputation or writing a reviewable suggestion.

FundMatch should prefer read-only tools/resources at first. Write-capable tools should be explicit and auditable.

## Where MCP belongs

```text
AI host / Claude Code / internal agent
             |
             v
        FundMatch MCP server
             |
      authenticated service layer
             |
         Postgres/RLS
```

The MCP server should call the same domain/service functions used by the web application. It should not become a second business-logic implementation.

## Security requirements

- No service-role key is ever returned to an MCP client.
- Tool descriptions must be precise enough that models do not confuse read and write operations.
- Every write tool gets idempotency/audit metadata.
- Read tools return only the minimum authorized fields.
- No unrestricted SQL tool.
- No generic "call any URL" tool in production.
- Any sensitive external action should require human approval or a deterministic policy gate.

## Decision

**Use MCP as the interoperability layer, not the internal orchestration engine.**

The core FundMatch runtime should use normal TypeScript service interfaces. An MCP server can expose a selected subset of those interfaces to compatible hosts. This keeps MCP optional for the customer-facing app while making internal agent workflows and future integrations substantially easier.

## Adoption order

1. Finalize stable service interfaces.
2. Expose read-only retrieval/status tools.
3. Add request/enqueue tools that create auditable FundMatch jobs.
4. Add narrowly scoped write tools only after authorization, idempotency, and review flows are proven.
