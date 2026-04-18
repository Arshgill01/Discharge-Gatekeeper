---
name: discharge-structured-spine
description: Build or refine the deterministic discharge-readiness spine for Discharge Gatekeeper MCP.
compatibility: Codex-compatible skill for deterministic discharge workflow work.
metadata:
  version: "1.0"
  owner: care-transitions-command
---

# Discharge Structured Spine

## Use this skill when
- defining deterministic blocker logic
- shaping structured discharge outputs
- working on next-step generation without hidden-risk prompting

## First read
1. `AGENTS.md`
2. `docs/evals.md`
3. `docs/phase0-orchestrator-decision-matrix.md`
4. `docs/mcp-reference-analysis.md`

## Core law
`Discharge Gatekeeper MCP` owns:
- baseline verdict
- canonical blocker list
- deterministic evidence structure
- next-step checklist

## Do not
- add LLM-only hidden-risk reasoning here
- make this MCP depend on the orchestrator to be useful
