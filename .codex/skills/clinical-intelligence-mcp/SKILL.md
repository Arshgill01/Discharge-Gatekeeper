---
name: clinical-intelligence-mcp
description: Build or refine the Clinical Intelligence MCP hidden-risk layer, including prompt contract, citation logic, and false-positive controls.
compatibility: Codex-compatible skill for hidden-risk MCP work.
metadata:
  version: "1.0"
  owner: care-transitions-command
---

# Clinical Intelligence MCP

## Use this skill when
- implementing hidden-risk prompts
- shaping contradiction detection
- refining citation and confidence behavior
- deciding whether a narrative finding should change discharge disposition

## First read
1. `AGENTS.md`
2. `docs/phase0-hidden-risk-prompt-contract.md`
3. `docs/evals.md`
4. `docs/phase0-failure-mode-plan.md`

## Core law
`Clinical Intelligence MCP` may:
- use an LLM
- inspect bounded narrative evidence
- return cited hidden-risk findings and disposition impact

`Clinical Intelligence MCP` may not:
- replace the deterministic spine
- emit uncited findings
- own final reconciliation
