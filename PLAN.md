# PLAN.md

## Latest update
- 2026-04-23, Agent 1: restored the repo map to the locked synchronous A2A contract, removed stale streaming-oriented planning drift, and aligned Phase 7/8 demo-lock sequencing.

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
- keep the external A2A surface synchronous (`/.well-known/agent-card.json`, `POST /tasks`, `GET /tasks/:taskId`, `GET /tasks`)
- no A2A streaming
- keep the deterministic structured discharge spine foundational
- keep the hidden-risk contradiction as the core product and demo spec
- keep the final demo to 3 prompts

## Current phase
### Phase 7: contract restore and demo lock
Goal:
- restore the repo map to the locked synchronous architecture that already exists in runtime and validation assets
- remove stale streaming-oriented or pre-A2A planning language from shared docs
- lock operator promotion on explicit lane status evidence instead of narrative judgment
- make Phase 8 submission freeze depend on the same contract and status board

Phase 7 deliverables:
- refreshed shared-contract docs (`AGENTS.md`, `README.md`, `PLAN.md`, decisions, demo/operator/submission docs)
- explicit synchronous A2A request/response wording across planning and operator docs
- one green/yellow/red contract across demo, runbook, submission, and verification surfaces
- tightened lane-promotion rule for A2A-main vs direct-MCP fallback

Phase 8 entry criteria:
- current run-folder evidence records lane statuses for A2A-main and direct-MCP fallback
- the primary lane is explicitly selected from that evidence
- submission and recording materials match the live lane decision
- no shared doc reintroduces streaming-oriented or collapsed-architecture wording

## Phase sequence
### Phase 0: vision lock
Output:
- repo narrative points to one locked system
- canonical demo patient and contradiction are fixed

### Phase 1: Clinical Intelligence MCP
Output:
- bounded hidden-risk prompt contract
- cited contradiction findings
- false-positive suppression and parseable JSON output

### Phase 2: two-MCP integrated story
Output:
- preserved Discharge Gatekeeper MCP structured posture
- reconciled hidden-risk findings against the existing structured spine
- clear downgrade/escalation behavior using the decision matrix

### Phase 3: external A2A orchestrator
Output:
- prompt-level coordination across both MCPs
- one fused answer per prompt
- synchronous request/response A2A surface
- no custom UI dependency

### Phase 4: 3-prompt demo collapse
Output:
- reliable 3-prompt operator path
- stable Prompt Opinion integration
- clear judge-visible outputs

### Phase 5: submission lock
Output:
- Marketplace-ready metadata and story
- final demo recording path
- judge-proof packaging

### Phase 6: synthetic scenario pack and rehearsal evidence
Output:
- expanded trap/control/ablation/duplicate/inconclusive/alternative fixtures
- local rehearsal evidence bundles and status boards
- prize-convergence quality gates for both MCP and A2A paths

### Phase 7: contract restore and demo lock
Output:
- planning/docs describe the runtime as synchronous, not streaming-oriented
- lane promotion depends on green/yellow/red evidence instead of ad hoc operator calls
- demo, eval, runbook, and submission docs use the same status language

### Phase 8: submission freeze
Output:
- chosen primary lane and required backup lane are frozen from current evidence
- recording/publish materials match the locked synchronous architecture
- judge-facing copy stays aligned to the same contract and lane rules

## Holy-shit-moment spec
The final demo must prove this sequence:
1. the structured discharge spine says the patient looks discharge-ready
2. the narrative evidence reveals a contradiction the structured view missed
3. the system escalates to `not_ready`
4. the system points to the exact note-backed risk
5. the system converts that finding into an immediate transition plan

If a workstream does not reinforce this sequence, it is not a priority.

## Active workstreams

### 1) Shared contract restore
Owner: Agent 1
Goal:
- keep the repo map aligned to the locked synchronous architecture
- eliminate stale streaming-oriented, pre-A2A, or pre-Phase-7 framing
- lock the operator and submission surfaces to the same lane rules

### 2) A2A-main execution proof
Owner: open
Goal:
- convert the preferred A2A architecture into current, evidence-backed Prompt Opinion execution proof

Phase 7 focus:
- same-day run-folder evidence for A2A workspace execution
- contradiction-first Prompt 2 quality in the real chat lane
- preserve direct-MCP fallback continuity

### 3) Direct-MCP fallback proof
Owner: open
Goal:
- keep the required fallback lane green and rehearsal-ready

Phase 7 focus:
- visible Prompt 1/2/3 workspace persistence
- Prompt 3 `synthesize_transition_narrative` proof
- no operator improvisation to bridge missing artifacts

### 4) Submission freeze and packaging
Owner: open
Goal:
- package the chosen primary lane plus the required backup lane without contract drift

Phase 8 focus:
- judge-facing copy
- recording order and evidence bundle
- Marketplace/publish wording aligned to the synchronous architecture

## Immediate next tasks
1. Keep shared docs aligned to the synchronous `external A2A orchestrator` surface and remove stale streaming-oriented planning language.
2. Treat A2A-main as the preferred architecture, but promote it to the live lane only when the current run folder marks both A2A-main and direct-MCP fallback `green`.
3. If A2A-main is `yellow` or `red` and direct-MCP fallback is `green`, run the fallback lane and keep the architecture explanation accurate.
4. Freeze recording/submission materials only after the lane decision is backed by current evidence.

## Guardrails
- Do not collapse the plan back to a one-surface product story.
- Do not add a third MCP.
- Do not build a custom frontend.
- Do not add A2A streaming.
- Do not describe the A2A layer as event-streaming, live-streaming, or speculative multi-agent choreography.
- Do not let narrative reasoning replace the deterministic structured discharge spine.
- Do not make the demo depend on vague free-form agent behavior.

## Open risks
- Prompt Opinion still has unresolved evidence gaps between local green checks and real workspace execution proof for A2A-main.
- The dual-tool BYO fallback remains vulnerable to Prompt Opinion transcript persistence failures for Prompt 2/3 unless current workspace evidence proves otherwise.
- Submission claims can drift ahead of run-folder evidence unless lane status and promotion rules stay explicit.

## Definition of done for phase 7
Phase 7 is done when:
- the shared repo docs describe the A2A layer as synchronous request/response and explicitly non-streaming
- the green/yellow/red contract is identical across demo, eval, operator, submission, and evidence templates
- A2A-main promotion requires current evidence instead of operator optimism
- Phase 8 entry criteria are explicit and repo-specific
