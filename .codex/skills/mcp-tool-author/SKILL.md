---
name: mcp-tool-author
description: Author or refine Prompt Opinion-compatible MCP tools for this repo. Use when implementing tool handlers, response contracts, context parsing, or discharge-specific MCP behavior.
compatibility: Codex-compatible skill for repo-local MCP implementation work.
metadata:
  version: "1.0"
  owner: discharge-gatekeeper
---

# MCP Tool Author

## Use this skill when
- adding a new MCP tool
- changing a tool contract
- wiring Prompt Opinion patient/FHIR context into a tool
- refining error handling or output structure for MCP responses

## First read
1. `AGENTS.md`
2. `PLAN.md`
3. `docs/architecture.md`
4. `docs/mcp-reference-analysis.md`
5. `docs/evals.md`

## Primary objective
Ship small, sharp, Prompt Opinion-compatible MCP tools that directly support the discharge-readiness wedge.

## Workflow
1. Restate the exact tool job in one sentence.
2. Confirm the tool belongs in one of these buckets:
   - context retrieval or normalization
   - readiness assessment
   - blocker extraction
   - transition artifact generation
3. Prefer adding one narrow tool over expanding one vague tool.
4. Preserve canonical verdict labels and blocker categories.
5. Return structured output plus concise narrative when possible.
6. Make failures explicit and useful.

## Tool design rules
- One tool, one clear purpose.
- Inputs should be minimal and easy to reason about.
- Outputs should be stable enough for demo and eval work.
- Do not bury the verdict inside long prose.
- Evidence should be visible, even if lightweight.

## Prompt Opinion rules
- Assume patient context may come from Prompt Opinion headers or token claims.
- Keep tools stateless where possible.
- Preserve MCP compatibility over framework cleverness.

## Do not
- create giant “do everything” tools
- widen scope into diagnosis or treatment planning
- change contracts without updating docs
- optimize for elegance before the first working slice exists

## Final checks
Before finishing:
1. Does this tool improve the main 3-prompt demo?
2. Is the output contract obvious?
3. Are failure messages useful?
4. Did you update `docs/architecture.md` or `docs/decisions.md` if the contract changed?
