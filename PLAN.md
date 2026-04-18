# PLAN.md

## Latest update
- 2026-04-18, Agent 1: front-door scaffold reset in progress to lock the repo on `Care Transitions Command`, the `2 MCPs + 1 external A2A` architecture, and the canonical trap-patient contradiction demo.

## Objective
Win the Agents Assemble hackathon with **Care Transitions Command**: a Prompt Opinion system that uses **Discharge Gatekeeper MCP**, **Clinical Intelligence MCP**, and an **external A2A orchestrator** to catch a hidden discharge risk, explain the contradiction, and return the next transition actions in 3 prompts.

## One-sentence system definition
Care Transitions Command uses a deterministic discharge spine plus bounded note contradiction intelligence to stop an unsafe discharge that looked acceptable in structured data alone.

## Locked constraints
- top-level system identity stays `Care Transitions Command`
- keep `Discharge Gatekeeper MCP` as the existing MCP identity
- add `Clinical Intelligence MCP` as the second MCP identity
- use one `external A2A orchestrator`
- keep the architecture at `2 MCPs + 1 external A2A`
- no custom frontend
- no third MCP
- no A2A streaming
- keep the deterministic structured discharge spine foundational
- keep the hidden-risk contradiction as the core product and demo spec
- keep the final demo to 3 prompts

## Current phase
### Phase 0: vision lock
Goal:
- reset the repo front door around the pivoted system
- lock the system identity, component boundaries, and trap patient
- remove ambiguity about the north star before more implementation work

Phase 0 deliverables:
- rewritten `AGENTS.md`, `PLAN.md`, `README.md`
- aligned product, architecture, demo, data, and parallel-work docs
- `docs/phase0-vision-lock.md`
- `docs/phase0-trap-patient-spec.md`
- explicit pivot entry in `docs/decisions.md`

## Phase sequence
### Phase 0: vision lock
Output:
- repo narrative points to one locked system
- canonical demo patient and contradiction are fixed

### Phase 1: Discharge Gatekeeper MCP structured spine
Output:
- deterministic structured discharge posture
- canonical blocker taxonomy and next-step spine
- inspectable structured evidence

### Phase 2: Clinical Intelligence MCP
Output:
- bounded note and document reading
- contradiction detection against the structured posture
- hidden-risk evidence payloads with impacted blocker categories

### Phase 3: external A2A orchestrator
Output:
- prompt-level coordination across both MCPs
- one fused answer per prompt
- no streaming and no custom UI dependency

### Phase 4: Prompt Opinion hardening
Output:
- reliable 3-prompt operator path
- stable Prompt Opinion integration
- clear judge-visible outputs

### Phase 5: submission lock
Output:
- Marketplace-ready metadata and story
- final demo recording path
- judge-proof packaging

## Holy-shit-moment spec
The final demo must prove this sequence:
1. the structured discharge spine says the patient looks discharge-ready
2. the narrative evidence reveals a contradiction the structured view missed
3. the system escalates to `not_ready`
4. the system points to the exact note-backed risk
5. the system converts that finding into an immediate transition plan

If a workstream does not reinforce this sequence, it is not a priority.

## Active workstreams

### 1) Vision and scaffold
Owner: Agent 1
Goal:
- lock the repo front door on the pivoted system
- eliminate stale single-MCP framing in the owned docs
- align phase sequence and team guidance

### 2) Discharge Gatekeeper MCP
Owner: open
Goal:
- implement the deterministic structured discharge spine
- own canonical discharge posture, blockers, and transition scaffolding

Phase 1 focus:
- structured patient-context normalization
- deterministic readiness posture
- inspectable blocker and next-step outputs

### 3) Clinical Intelligence MCP
Owner: open
Goal:
- implement bounded narrative contradiction intelligence
- detect hidden risk in note and document evidence

Phase 2 focus:
- contradiction detection
- note-backed blocker escalation
- concise contradiction summaries

### 4) external A2A orchestrator
Owner: open
Goal:
- coordinate the two MCPs per prompt
- decide when to escalate from structured posture to narrative contradiction review

Phase 3 focus:
- simple non-streaming orchestration
- final answer assembly for the 3-prompt demo

### 5) Evals
Owner: open
Goal:
- protect the trap-patient demo path
- validate structured-posture, contradiction, and final-output behavior

Focus:
- one canonical trap-patient eval path
- contradiction visibility checks
- 3-prompt acceptance coverage

### 6) Demo and submission
Owner: open
Goal:
- turn the architecture into a judge-readable story
- protect the Prompt Opinion path without inventing custom UI work

Focus:
- 3-prompt script
- Prompt Opinion operator reliability
- submission clarity

## Immediate next tasks
1. Finish the phase-0 document reset.
2. Keep implementation work aligned to the locked component boundaries.
3. Encode the trap patient into eval and implementation assets without changing the spec.
4. Build the Discharge Gatekeeper MCP structured spine first.
5. Add Clinical Intelligence MCP only for bounded contradiction work.
6. Add the external A2A orchestrator after both MCP responsibilities are clear.

## Guardrails
- Do not collapse the plan back to a single-MCP product story.
- Do not add a third MCP.
- Do not build a custom frontend.
- Do not add A2A streaming.
- Do not let narrative reasoning replace the deterministic structured discharge spine.
- Do not make the demo depend on vague free-form agent behavior.

## Open risks
- protected docs outside this ownership lane still describe the current single-MCP runtime and may need later alignment
- exact implementation boundary between orchestrator prompt logic and MCP prompt logic still needs runtime-level discipline
- Prompt Opinion integration materials currently reflect the existing runtime surface, not the full phase-3 target architecture

## Definition of done for phase 0
Phase 0 is done when:
- the repo front door clearly defines `Care Transitions Command`
- the locked architecture is stated the same way across owned docs
- the 3-prompt demo story is stable
- the trap patient is specified as a reusable artifact
- a new teammate can understand the system vision without old chat context
