# PLAN.md

## Latest update
- 2026-05-03, Phase 8.6 Runtime Consistency: lock shared env setup, provider preflight, and runtime provider diagnostics so Google/Gemini proof cannot be confused with heuristic local regression.
- 2026-04-28, Coordinator: added Phase 8.5 route-lock + demo-safe freeze so worker lanes can harden the green live demo path without reopening architecture.

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
### Phase 8.6: runtime consistency hardening
Goal:
- eliminate env/model/provider drift across Discharge Gatekeeper MCP, Clinical Intelligence MCP, and the external A2A orchestrator
- make new worktrees use the same ignored `.env.local` source without copying secrets into git
- prevent browser-proof or Phase 9 notes from claiming Google/Gemini when Clinical Intelligence ran in heuristic mode

Phase 8.6 deliverables:
- shared-env symlink script for new worktrees
- provider preflight script with red/yellow/green status
- Clinical Intelligence `/readyz` provider/model/key-present/fallback diagnostics without secret values
- A2A task diagnostics that record hidden-risk provider/model/status from Clinical Intelligence readiness
- browser proof provider evidence and Google-proof enforcement switch

### Phase 8.5: route-lock + demo-safe freeze
Goal:
- freeze the live demo route on the lane that is actually green
- keep the Direct-MCP 3-prompt demo as the demo-safe baseline
- prove the A2A one-turn assembled route or conclusively isolate why it is still not primary

Phase 8.5 deliverables:
- green Direct-MCP 3-prompt proof with persistent transcript, screenshots, network evidence, and runtime/MCP hits
- green A2A one-turn assembled proof with browser-selected external A2A, request/task correlation, and downstream MCP hits
- run-folder status board that names the primary lane and backup lane explicitly
- brief, reviewable route-lock notes that keep workers from reopening architecture decisions

Phase 9 entry criteria:
- current run-folder evidence records a frozen primary lane decision
- Direct-MCP lane is green or explicitly platform-blocked with browser/network evidence
- A2A one-turn lane is green or explicitly platform-blocked with browser/network evidence
- submission and recording materials match the frozen lane decision

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

### 1) Direct-MCP evidence hardening
Owner: Worker A
Goal:
- make the 3-prompt direct path visibly complete in Prompt Opinion
- persist the final assistant transcript for each prompt
- capture screenshots, browser network evidence, and runtime/MCP hits in the run folder

Phase 8.5 focus:
- direct transcript persistence
- prompt-by-prompt evidence completeness
- run-folder status board GREEN for the Direct-MCP lane

### 2) A2A one-turn route-lock proof
Owner: Worker B
Goal:
- prove the external A2A route in one Prompt Opinion turn
- verify the exact HTTP+JSON shape that Prompt Opinion sends
- capture request/task correlation plus downstream MCP hits

Phase 8.5 focus:
- external A2A selection in UI
- runtime reachability and response acceptance
- run-folder status board GREEN for the A2A one-turn lane

### 3) Browser proof and route-lock board
Owner: Coordinator
Goal:
- turn browser behavior into repeatable evidence instead of operator guesswork
- keep the lane board aligned with the latest verified route decision
- prevent relabeling a platform routing defect as a prompt-tuning issue

Phase 8.5 focus:
- authenticated browser workflow
- network capture and screenshots
- final route-lock call from the run folder

## Immediate next tasks
1. Run browser-proof capture with registration updates enabled and collect lane evidence in the latest run folder.
2. Harden the Direct-MCP 3-prompt transcript path until the visible assistant result, screenshots, and network evidence are complete.
3. Prove the A2A one-turn runtime hit or isolate the blocker with request/task correlation and downstream runtime logs.
4. Freeze the live demo route only after the lane decision is explicit and evidence-backed.

## Guardrails
- Do not collapse the plan back to a one-surface product story.
- Do not add a third MCP.
- Do not build a custom frontend.
- Do not add A2A streaming.
- Do not describe the A2A layer as event-streaming, live-streaming, or speculative multi-agent choreography.
- Do not let narrative reasoning replace the deterministic structured discharge spine.
- Do not make the demo depend on vague free-form agent behavior.
- Do not relabel a platform routing defect as "one more prompt tweak."
- Do not promote A2A above the direct lane without green evidence.

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
