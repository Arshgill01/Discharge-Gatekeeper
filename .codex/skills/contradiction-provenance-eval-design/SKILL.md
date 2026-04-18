---
name: contradiction-provenance-eval-design
description: Design contradiction, provenance, citation, and traceability checks across the two MCPs and orchestrator outputs.
compatibility: Codex-compatible skill for evidence-trace validation work.
metadata:
  version: "1.0"
  owner: care-transitions-command
---

# Contradiction Provenance Eval Design

## Use this skill when
- designing tests for conflicting structured and narrative evidence
- locking citation requirements
- validating blocker-to-evidence and action-to-evidence traceability

## First read
1. `AGENTS.md`
2. `docs/evals.md`
3. `docs/phase0-hidden-risk-prompt-contract.md`
4. `docs/phase0-orchestrator-decision-matrix.md`

## Minimum checks
- contradictory inputs do not collapse into unsupported confidence
- every surfaced finding has a traceable citation
- final next steps remain linked to the evidence that justified them
- null hidden-risk outputs are still explicit and parseable
