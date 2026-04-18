---
name: eval-and-trace-designer
description: Design phase-gated evals, parseability checks, citation assertions, and judge-path regression coverage for Care Transitions Command.
compatibility: Codex-compatible skill for evaluation and QA work.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# Eval and Trace Designer

## Use this skill when
- adding or revising eval prompts
- defining failure and fallback assertions
- checking parseability or citation rules
- protecting hidden-risk and reconciliation behavior from drift

## First read
1. `AGENTS.md`
2. `PLAN.md`
3. `docs/evals.md`
4. `docs/phase0-hidden-risk-prompt-contract.md`
5. `docs/phase0-orchestrator-decision-matrix.md`

## Goal
Keep the two-MCP plus external-A2A system inspectable and testable.

## Required eval lenses
1. Phase 1: `Clinical Intelligence MCP` smoke
2. Phase 2: two-MCP integration
3. Phase 3: external A2A orchestration
4. parseability and citation gates
5. failure and fallback behavior

## Always check
- output is valid JSON without repair
- citations map to real inputs
- duplicate hidden-risk findings are suppressed
- contradictory evidence does not become confident prose
- fallback direct-MCP behavior is documented when the A2A path fails

## Do not
- write evals that assume hidden state
- reward verbosity over inspectability
- ignore null-result behavior for hidden-risk review
