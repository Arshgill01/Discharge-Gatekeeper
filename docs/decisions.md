# Decisions

Use this file for short, dated decisions that affect more than one workstream.

## Entry format
- Date:
- Decision:
- Why:
- Affected files or lanes:
- Follow-up:

## Seed decisions
- Date: 2026-04-15
- Decision: Start with an MCP-first architecture for the hackathon build.
- Why: The differentiator is tool-driven discharge-readiness assessment with Prompt Opinion interoperability, not a custom external runtime.
- Affected files or lanes: architecture, implementation, demo/submission
- Follow-up: Revisit only if MCP proves too restrictive for the core workflow.

- Date: 2026-04-15
- Decision: The initial wedge is discharge readiness plus safe transition coordination.
- Why: It provides strong AI factor, visible workflow value, and realistic feasibility while fitting the hackathon judging path.
- Affected files or lanes: product, data, implementation, demo/submission
- Follow-up: Keep the wedge narrow and avoid drifting into generic care navigation.

- Date: 2026-04-15
- Decision: Use canonical verdict labels `ready`, `ready_with_caveats`, and `not_ready`.
- Why: Stable labels reduce drift across prompts, tools, docs, and demo script.
- Affected files or lanes: product, architecture, evals, implementation
- Follow-up: Only change with explicit cross-file updates.
