---
name: "ctc-phase9-uplift"
description: "Plan and execute Care Transitions Command Phase 9 product uplift only after all required baseline proofs pass. Use when baseline gates are green and the task is to read Phase 9 docs, create implementation waves, improve Transition Safety Packet output, evidence-first formatting, safety invariants, ablation tables, demo polish, or judge-facing submission quality without architecture sprawl."
---

# CTC Phase 9 Uplift

## Entry Gate

Do not use this skill to start Phase 9 work unless the current completion audit shows:

- Test 1 Direct-MCP Prompt Opinion proof passed
- Test 2 combined baseline proof passed
- Test 3 fresh reproducibility proof passed
- no stale screenshots/transcripts/cache used as proof

If any gate is red, return to baseline proof/fix mode.

## First Read

Read current repo docs before planning:

1. `AGENTS.md`
2. `PLAN.md`
3. `docs/phase9-execplan.md`
4. `docs/phase9-winning-proposal.md`
5. `docs/phase9-agent-operating-protocol.md`
6. `docs/transition-safety-packet-spec.md`
7. `docs/final-demo-script-phase9.md`
8. any newer Phase 9 proposal docs in `docs/`

## Winning Thesis

Every change must reinforce:

Care Transitions Command catches note-level contradictions that turn a discharge-ready chart into an unsafe transition, then produces an evidence-cited transition package for clinician review.

## Allowed Focus

Prioritize:

- Transition Safety Packet as the core output artifact
- evidence-first Prompt 2 formatting
- compact Prompt 3 transition package
- safety invariants
- scenario/control/ablation evidence table
- non-overfit hidden-risk case if time allows
- judge-facing demo/submission polish

Avoid:

- custom frontend
- third MCP
- A2A streaming
- architecture sprawl
- generic care-management features
- autonomous clinical decision-making language

## Implementation Waves

Create a Phase 9 ExecPlan with waves:

1. Output contract and safety invariants
2. Prompt 2 evidence-first contradiction formatting
3. Prompt 3 Transition Safety Packet compactness
4. Scenario/control/ablation evidence table
5. Demo and submission polish
6. Optional non-overfit hidden-risk case

Each wave needs:

- files likely touched
- acceptance checks
- narrow validation commands
- rollback or stop condition

## Completion

Run targeted tests for every behavior change. Before final reporting, map changes back to the winning thesis and the locked architecture.
