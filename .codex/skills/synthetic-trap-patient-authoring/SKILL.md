---
name: synthetic-trap-patient-authoring
description: Author a synthetic trap patient whose narrative evidence exposes hidden discharge risk beyond the deterministic spine.
compatibility: Codex-compatible skill for trap-patient design.
metadata:
  version: "1.0"
  owner: care-transitions-command
---

# Synthetic Trap-Patient Authoring

## Use this skill when
- designing the canonical hidden-risk demo patient
- creating note/document traps for Clinical Intelligence MCP
- making fallback synthetic context believable

## First read
1. `AGENTS.md`
2. `docs/evals.md`
3. `docs/phase0-hidden-risk-prompt-contract.md`
4. `docs/phase0-failure-mode-plan.md`

## Trap-patient requirements
- deterministic spine should reach a plausible baseline verdict before hidden-risk review
- at least one hidden risk must be note-only or contradiction-based
- at least one irrelevant narrative detail should be present to test suppression
- every trap must be citeable

## Do not
- make the hidden risk impossible to spot from the supplied text
- overload the patient with too many unrelated traps
