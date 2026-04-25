# PLAN.md

## Latest update
- 2026-04-25, Agent 1: inserted a focused Phase 8 execution-breakthrough pass to fix Prompt Opinion A2A chat execution and dual-tool BYO Prompt 2/3 before any submission freeze.

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
### Phase 8: workspace execution breakthrough
Goal:
- convert local/runtime proof into real Prompt Opinion workspace execution proof
- fix Prompt Opinion A2A chat execution against the external runtime
- fix dual-tool BYO Prompt 2 and Prompt 3 transcript completion in the real workspace
- use browser-driven proof and network evidence to distinguish repo-fixable defects from Prompt Opinion platform blockers

Phase 8 deliverables:
- spec-correct or Prompt Opinion-compatible external A2A transport execution path
- browser-captured proof of whether Prompt Opinion chat actually reaches the external runtime
- dual-tool BYO Prompt 2/3 hardening aimed at transcript persistence and canonical Prompt 3 completion
- updated run-folder evidence with authenticated workspace screenshots, network clues, request/task correlation, and exact lane status
- explicit go/no-go criteria for whether remaining failures are repo-side or platform-side

Phase 9 entry criteria:
- current run-folder evidence records lane statuses for A2A-main and direct-MCP fallback after the execution-breakthrough pass
- A2A-main is either proven green or explicitly downgraded with browser/network evidence that isolates a platform-side blocker
- direct-MCP fallback is either proven green or explicitly downgraded with browser/network evidence that isolates a platform-side blocker
- submission and recording materials match the live lane decision

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

### Phase 8: workspace execution breakthrough
Output:
- Prompt Opinion A2A chat execution is either green or conclusively shown platform-blocked after spec-correct transport work
- dual-tool BYO Prompt 2/3 is either green or conclusively shown platform-blocked after tool-surface hardening
- browser-driven evidence, request/task correlation, and local runtime diagnostics tell the same story

### Phase 9: submission freeze
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

### 1) A2A execution breakthrough
Owner: Agent 1
Goal:
- make Prompt Opinion chat actually hit the external runtime instead of stopping at registration-only proof
- align the advertised A2A binding with what the runtime really serves
- preserve the locked synchronous architecture while fixing transport compatibility

Phase 8 focus:
- binding parity
- request/response/task semantics
- browser-observed runtime hits

### 2) Dual-tool BYO breakthrough
Owner: Agent 2
Goal:
- make Prompt 2 and Prompt 3 complete and persist in the real dual-tool BYO workspace path

Phase 8 focus:
- tool metadata clarity
- payload size and shape discipline
- canonical Prompt 3 completion
- transcript persistence in the real workspace

### 3) Browser proof and blocker isolation
Owner: Agent 3
Goal:
- turn Prompt Opinion browser behavior into repeatable evidence instead of operator guesswork

Phase 8 focus:
- authenticated browser workflow
- network capture and screenshots
- run-folder evidence quality
- final go/no-go call on repo-side vs platform-side blockers

## Immediate next tasks
1. Fix the external A2A runtime so its advertised binding, request shape, and execution path match what Prompt Opinion actually calls.
2. Harden the dual-tool BYO path for Prompt 2 and Prompt 3 using Prompt Opinion-compatible tool metadata and slimmer transcript-safe outputs.
3. Use authenticated browser automation and network evidence to prove runtime hits, transcript persistence, or the exact absence of both.
4. Enter submission freeze only after this execution-breakthrough pass produces a real lane decision.

## Guardrails
- Do not collapse the plan back to a one-surface product story.
- Do not add a third MCP.
- Do not build a custom frontend.
- Do not add A2A streaming.
- Do not describe the A2A layer as event-streaming, live-streaming, or speculative multi-agent choreography.
- Do not let narrative reasoning replace the deterministic structured discharge spine.
- Do not make the demo depend on vague free-form agent behavior.

## Open risks
- Prompt Opinion may still have platform-level defects that survive all repo-side fixes.
- The external A2A runtime may need a larger binding correction than a narrow agent-card patch.
- The dual-tool BYO path may still fail if Prompt Opinion cannot persist assistant completions after multi-MCP execution even with smaller, clearer tool outputs.

## Definition of done for phase 8
Phase 8 is done when:
- Prompt Opinion A2A chat execution is `green`, or the repo has browser/network evidence that the remaining blocker is platform-side after spec-correct transport work
- dual-tool BYO Prompt 2 and Prompt 3 are `green`, or the repo has browser/network evidence that the remaining blocker is platform-side after tool-surface hardening
- the current run folder captures screenshots, experiment matrix, request/task correlation, and final lane calls for both lanes
- Phase 9 entry criteria are explicit and evidence-backed
