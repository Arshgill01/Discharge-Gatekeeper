# Evals

## Purpose
This file defines the acceptance scaffold for the Phase 0 pivot:
`Care Transitions Command` operating as `2 MCPs + 1 external A2A`.

Frozen architecture assumptions for all evals:
- top-level system identity: `Care Transitions Command`
- deterministic structured MCP: `Discharge Gatekeeper MCP`
- hidden-risk MCP: `Clinical Intelligence MCP`
- orchestration agent: `external A2A orchestrator`
- no custom frontend
- no third MCP
- no A2A streaming
- final demo is 3 prompts
- LLM use is allowed only inside `Clinical Intelligence MCP` and the `external A2A orchestrator`
- the deterministic discharge spine remains the authority for structured blockers, next steps, and baseline verdicts

## Phase gates

### Phase 1: Clinical Intelligence MCP smoke
Purpose:
- prove the hidden-risk detector can add bounded narrative intelligence without taking over the whole workflow

Required inputs:
- deterministic discharge snapshot from `Discharge Gatekeeper MCP` or a fixture with the same shape
- bounded note/document excerpts
- source metadata for every excerpt

Required assertions:
- returns valid JSON matching the hidden-risk contract in [phase0-hidden-risk-prompt-contract.md](phase0-hidden-risk-prompt-contract.md)
- detects at least one real hidden risk in a trap-patient fixture when the narrative source materially changes discharge safety
- suppresses duplicate findings when the risk is already explicit in the deterministic blocker list
- returns `no_hidden_risk` when the narrative review adds nothing material
- returns `inconclusive` when the narrative evidence is too weak, contradictory, or insufficient
- every surfaced risk includes at least one citation
- every citation resolves to an input source
- no final autonomous discharge decision is emitted

Phase 1 expected-output matrix:
- source of truth: [phase1-clinical-intelligence-expected-output-matrix.md](phase1-clinical-intelligence-expected-output-matrix.md)
- enforcement asset: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/expected-output-matrix.ts`
- trap patient gate: must cite/reference the canonical contradiction nursing note and case-management reinforcement note
- no-risk control gate: must stay `no_hidden_risk` with explicit bounded summary and no forced escalation
- insufficient-context gate: must return `status=insufficient_context` with no findings and no citations
- malformed/unparseable model-output gate: must fail closed to structured `status=error` without fabricated hidden-risk findings
- prompt drift gate: runtime checks verify required system-prompt guardrails are still present

Suggested fixture lanes:
- `trap_hidden_home_support_gap`
- `trap_medication_contradiction_in_note`
- `trap_note_only_fall_risk`
- `trap_no_additional_hidden_risk`
- `trap_insufficient_narrative_context`

### Phase 2: Two-MCP integration
Purpose:
- prove the deterministic spine and hidden-risk layer reconcile cleanly before orchestration logic is added

Source-of-truth expected-output matrix:
- [phase2-two-mcp-expected-output-matrix.md](phase2-two-mcp-expected-output-matrix.md)

Required flow:
1. invoke `Discharge Gatekeeper MCP`
2. pass its structured output plus bounded narrative inputs to `Clinical Intelligence MCP`
3. reconcile results using the matrix in [phase0-orchestrator-decision-matrix.md](phase0-orchestrator-decision-matrix.md), even if the orchestrator is still a local harness

Required assertions:
- `Discharge Gatekeeper MCP` remains source of truth for baseline structured verdict/blockers/next steps
- `Clinical Intelligence MCP` never mutates deterministic evidence IDs or blocker IDs in place
- hidden-risk findings can only:
  - introduce a new blocker
  - upgrade `ready` to `ready_with_caveats`
  - upgrade any prior state to `not_ready`
  - trigger `manual_review_required`
- duplicate or weak hidden-risk findings are dropped before reconciliation
- citations survive the handoff between both MCP outputs
- the reconciled output is still parseable without free-text repair
- trap contradiction is measurable and note-dependent (ablation of contradiction notes prevents escalation)
- clean control case remains bounded with explicit `no_hidden_risk`
- Prompt 1/Prompt 2 fallback story is stronger than structured-only output:
  - Prompt 1 exposes baseline structured `ready` posture and final escalated verdict
  - Prompt 2 exposes contradiction categories and citation-backed evidence

Current Phase 2 command mapping:
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`

Current canonical Phase 2 paths (post-integration):
- structured MCP runtime entrypoint: `po-community-mcp-main/typescript/index.ts`
- hidden-risk MCP runtime entrypoint: `po-community-mcp-main/clinical-intelligence-typescript/index.ts`
- trap/control fixture source: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`
- phase-2 two-MCP smoke assertions: `po-community-mcp-main/clinical-intelligence-typescript/smoke/two-mcp-integration-smoke.ts`
- phase-2 operator fallback runbook: `docs/phase2-two-mcp-operator-runbook.md`

### Phase 3: External A2A orchestration
Purpose:
- prove the final judge-path control flow works when Prompt Opinion talks to the `external A2A orchestrator`

Source-of-truth expected-output matrix:
- [phase3-a2a-expected-output-matrix.md](phase3-a2a-expected-output-matrix.md)

Required flow:
1. Prompt Opinion sends one synchronous request to the `external A2A orchestrator`
2. the orchestrator calls `Discharge Gatekeeper MCP`
3. the orchestrator calls `Clinical Intelligence MCP` only when narrative review is available or required
4. the orchestrator applies the decision matrix
5. the orchestrator returns one final structured response with citations and next actions

Required assertions:
- no streaming is required or assumed
- the orchestrator returns within a demo-safe timeout budget
- the final output preserves deterministic blocker/action IDs plus hidden-risk findings and citation IDs
- the final output surfaces whether the hidden-risk layer was used, skipped, unavailable, or inconclusive
- trap-patient Prompt 1 path proves deterministic baseline visibility plus final escalation (`ready` -> `not_ready`) in one reconciled payload
- contradiction-aware Prompt 2 path includes note-backed contradiction summary plus citation anchors
- transition-package Prompt 3 path includes merged deterministic + hidden-risk actionability
- clean control path remains bounded (`no_hidden_risk`, no forced escalation)
- insufficient-context path remains bounded (`inconclusive`/manual review, no fabricated hidden-risk finding)
- agent card discovery surface is valid for planned registration path (identity, no-streaming lifecycle, dependency list, task endpoints)
- fallback to the direct-MCP demo path is documented and testable

Current Phase 3 command mapping:
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:runtime`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:decision-matrix`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

Current canonical Phase 3 paths (post-integration):
- external A2A runtime entrypoint: `po-community-mcp-main/external-a2a-orchestrator-typescript/index.ts`
- external A2A agent card: `po-community-mcp-main/external-a2a-orchestrator-typescript/agent-card.ts`
- external A2A task/request schema: `po-community-mcp-main/external-a2a-orchestrator-typescript/types.ts`
- external A2A runtime+card smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/runtime-boot-and-agent-card-smoke.ts`
- external A2A contradiction/fallback smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/orchestrator-smoke.ts`
- end-to-end A2A shell smoke: `po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`
- Prompt Opinion external-agent registration runbook: `docs/prompt-opinion-integration-runbook.md`
- demo primary/fallback path docs: `docs/demo-script.md`

### Phase 4 realism/control + demo-dominance gate
Purpose:
- prove the assembled system behaves credibly outside a single scripted contradiction clip
- keep Prompt 2 as the strongest contradiction-evidence moment

Source-of-truth expected-output matrix:
- [phase4-end-to-end-expected-output-matrix.md](phase4-end-to-end-expected-output-matrix.md)

Required assertions:
- trap patient path keeps deterministic baseline visibility plus final `not_ready` escalation
- control path stays calm (`no_hidden_risk`, no fabricated escalation)
- inconclusive/insufficient-context path stays bounded and manual-review explicit
- direct-MCP fallback path remains runnable when A2A is unavailable
- Prompt 2 remains contradiction-and-evidence focused and is not diluted by Prompt 3 action-list noise

Canonical current path map (post-merge):
- trap/control hidden-risk fixtures: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`
- trap/control A2A task fixtures: `po-community-mcp-main/external-a2a-orchestrator-typescript/orchestrator/fixtures.ts`
- trap/control/inconclusive/fallback A2A smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/orchestrator-smoke.ts`
- direct-MCP trap/control/inconclusive/fallback smoke: `po-community-mcp-main/clinical-intelligence-typescript/smoke/two-mcp-integration-smoke.ts`
- two-MCP end-to-end smoke wrapper: `po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- A2A end-to-end smoke wrapper: `po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

Required command set:
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

## Hidden-risk detection assertions
These assertions apply in all three phases.

### Must detect
- note-only discharge blockers that are not recoverable from structured FHIR alone
- contradictions between the deterministic spine and narrative evidence
- social, education, medication, or follow-up gaps that materially change discharge safety
- ambiguous documentation that prevents a confident safe-discharge claim

### Must not do
- restate existing deterministic blockers as new hidden-risk findings
- hallucinate a risk without a source citation
- promote a weak concern to `not_ready` without explicit evidence
- collapse contradictory evidence into a confident single story
- produce diagnosis or treatment recommendations outside discharge-transition scope

### Required impact labels
Every hidden-risk finding must carry exactly one:
- `none`
- `caveat`
- `not_ready`
- `uncertain`

## Parseability and citation gate

### Parseability
Every Phase 1, 2, and 3 output must:
- be a single JSON object
- parse with standard `JSON.parse` without repair
- avoid markdown fences
- keep stable top-level keys in the documented order for the contract under test
- use canonical verdict labels only: `ready`, `ready_with_caveats`, `not_ready`
- fail closed when parseability is violated (structured error state, no fabricated hidden-risk findings)

### Citation expectations
Every surfaced blocker or hidden-risk finding must:
- cite one or more source objects by `citation_id`
- include `source_type`
- include `source_label`
- include a bounded locator such as line range, section label, or resource path
- include a short excerpt or paraphrase anchor

Every final reconciled response must:
- preserve citation IDs from both MCPs
- make it obvious which citations came from structured evidence versus note/document evidence
- allow a reviewer to trace each escalated action back to its evidence

## Failure and fallback expectations

### A2A failure
Expected:
- no silent failure
- operator-visible status indicating `external_a2a_unavailable`
- fall back to direct Prompt Opinion calls against the two registered MCPs

### Clinical Intelligence MCP failure
Expected:
- deterministic discharge assessment still returns
- final output marks hidden-risk review as unavailable
- no hidden-risk downgrade is invented from absence of model output

### Discharge Gatekeeper MCP failure
Expected:
- orchestration stops
- final output is a structured failure response
- no hidden-risk-only discharge verdict is shown

### Live FHIR/context failure
Expected:
- system can switch to the trap-patient bundle for demo safety
- output must explicitly disclose that live context was unavailable
- synthetic fallback must still preserve citations and parseability

### Contradictory narrative evidence
Expected:
- `Clinical Intelligence MCP` returns `inconclusive` or a low-confidence `uncertain` finding
- orchestration adds `manual_review_required`
- final output avoids false certainty

## Final demo prompt checks
The final 3-prompt demo should demonstrate:

1. `Is this patient safe to discharge today?`
Pass if:
- final verdict is present
- deterministic blockers are visible
- hidden-risk status is visible

2. `What hidden risks or contradictions change that answer?`
Pass if:
- note-only or contradiction-based findings are shown with citations
- false-positive controls are visible when nothing material is found

3. `What exactly must happen before discharge?`
Pass if:
- next steps are prioritized
- each next step is linked to deterministic blockers and any hidden-risk escalations
- the answer remains assistive and non-autonomous

## Required implementation-facing eval targets
Future implementation should expose at least these repeatable checks:
- `phase1:clinical-intelligence-smoke`
- `phase2:two-mcp-integration`
- `phase3:a2a-orchestration`
- `phase3:direct-mcp-fallback`
- `phaseX:hidden-risk-regression`
- `phaseX:parseability-and-citations`

The exact command wiring is implementation-owned, but these gates are not optional.

Current Clinical Intelligence MCP command mapping:
- `npm run smoke:hidden-risk`
- `npm run smoke:narrative`
- `npm run smoke:release-gate`

Current Discharge Gatekeeper MCP release gate:
- `npm --prefix po-community-mcp-main/typescript run smoke:release-gate`
