---
name: external-a2a-orchestrator
description: Build or refine the synchronous external A2A orchestrator that calls both MCPs and applies the decision matrix.
compatibility: Codex-compatible skill for orchestration work.
metadata:
  version: "1.0"
  owner: care-transitions-command
---

# External A2A Orchestrator

## Use this skill when
- implementing or revising the A2A orchestration layer
- wiring both MCPs together
- shaping fallback behavior when one dependency fails

## First read
1. `AGENTS.md`
2. `docs/phase0-orchestrator-decision-matrix.md`
3. `docs/phase0-failure-mode-plan.md`
4. `docs/prompt-opinion-integration-runbook.md`

## Core law
The orchestrator:
- is synchronous
- is non-streaming
- calls only the two MCPs for Phase 0
- owns final reconciliation and fallback signaling

## Do not
- add a third MCP
- let the orchestrator hide component failure states
- override the matrix with ad hoc prose rules
