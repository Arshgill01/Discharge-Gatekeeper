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

- Date: 2026-04-15
- Decision: Freeze `assess_discharge_readiness` v1 response contract to `verdict`, `blockers`, `evidence`, `next_steps`, `summary` with first-pass blocker categories `clinical`, `medications`, `follow_up`, `education`, `home_support`, `logistics`.
- Why: The first vertical slice needs a compact, inspectable contract for deterministic smoke checks and judge-facing clarity.
- Affected files or lanes: architecture, implementation, evals
- Follow-up: If taxonomy expansion is needed, add an explicit mapping plan before changing labels.

- Date: 2026-04-15
- Decision: Standardize integration runtime config on explicit `ALLOWED_HOSTS` plus `/healthz` for local/tunnel readiness checks.
- Why: Prompt Opinion testing via dev tunnels fails if host allowlisting is implicit; an explicit env knob and health endpoint reduce integration guesswork and demo risk.
- Affected files or lanes: implementation, architecture, demo/submission
- Follow-up: If deployment moves from dev tunnel to hosted endpoint, keep `ALLOWED_HOSTS` and health checks in the runbook.

- Date: 2026-04-15
- Decision: Lock the first-slice judge demo to a 3-prompt path ending in "What must happen before this patient leaves?" instead of a broader transition-package prompt.
- Why: The v1 tool contract already returns deterministic `next_steps`; centering this keeps the demo short, reliable, and aligned with current implementation.
- Affected files or lanes: demo/submission, evals
- Follow-up: Reintroduce transition-package prompt only after a dedicated artifact generator is shipped and smoke-tested.

- Date: 2026-04-15
- Decision: Restrict the active TypeScript MCP runtime tool surface to `assess_discharge_readiness` and remove starter endpoint exposure (`/hello-world`).
- Why: The judge path should present a discharge-specific product surface, not generic starter tooling.
- Affected files or lanes: implementation, Prompt Opinion integration, demo/submission
- Follow-up: Keep starter utility/tool code quarantined unless explicitly reintroduced with discharge-specific value.
