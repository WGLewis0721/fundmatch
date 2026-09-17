# Claude tooling research for FundMatch

## What it is

Anthropic's Claude platform supports tool use, MCP connectivity, and subagent-oriented workflows. Current prompting guidance explicitly discusses when subagents are useful and warns against spawning them unnecessarily for simple sequential tasks.

Primary sources:

- https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables
- https://docs.anthropic.com/en/docs/mcp

## Relevant capabilities

### Tool use

Claude can be given narrow tools that retrieve FundMatch data or perform server-side actions. The important design principle is the same regardless of model provider: the tool implementation performs authorization and validation; the model only chooses among explicitly exposed capabilities.

### Subagents

Subagents are useful when tasks can run independently, need isolated context, or can execute in parallel. FundMatch examples include:

- analyzing separate diligence dimensions;
- reviewing different document groups;
- independently checking a match explanation against evidence;
- generating a second-opinion analysis that is compared by a deterministic validator.

Subagents are not appropriate for simple one-file/single-step work or tasks that require one shared context across every step.

### MCP

Claude supports MCP, making the same FundMatch tool server usable from Claude Code or other MCP-compatible hosts. This is useful for internal operations and development even if the customer-facing runtime uses a different model provider.

## Best FundMatch role

**Claude should be a provider option and evaluator, not a second mandatory orchestration stack.**

Good uses:

- a model-backed `diligence` or `evidence` worker behind FundMatch's provider-neutral interface;
- offline evals comparing model outputs;
- code/repository work through Claude Code;
- internal MCP-driven operations;
- selected high-reasoning tasks where model quality justifies the cost.

FundMatch should not require both OpenAI and Anthropic to complete a single normal production request. That creates additional cost, failure modes, vendor coupling, and latency.

## Model-provider boundary

Use a narrow adapter shape:

```text
ModelWorker.run({
  task,
  authorizedEvidence,
  structuredContext,
  outputSchema
}) -> structured result
```

The rest of FundMatch should not know whether OpenAI, Claude, or a deterministic implementation produced the result.

## Validation strategy

A second model can be useful as an evaluator, but model agreement is not proof. The preferred order is:

1. deterministic schema checks;
2. source/evidence checks;
3. business-rule checks;
4. optional model-based semantic evaluation;
5. human review for material profile changes or ambiguous high-impact findings.

## What not to do

- Do not make "two models agree" a substitute for evidence.
- Do not let Claude or any model query cross-organization data directly.
- Do not give model tools unrestricted SQL or service-role credentials.
- Do not spawn subagents by default for every task.
- Do not put provider-specific fields into FundMatch's canonical domain models.
