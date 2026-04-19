# Submission Checklist

## Goal
Package `Care Transitions Command` so judges can understand the architecture, trust the outputs, and recover gracefully if the ambitious orchestration layer is unavailable.

Frozen submission assumptions:
- top-level system identity: `Care Transitions Command`
- MCP identities: `Discharge Gatekeeper MCP`, `Clinical Intelligence MCP`
- orchestration identity: `external A2A orchestrator`
- final architecture: `2 MCPs + 1 external A2A`
- no custom frontend
- final demo is 3 prompts

## Judge-facing message
Use language that matches the pivot:
- `Care Transitions Command coordinates a deterministic discharge spine with a hidden-risk intelligence pass so unsafe transitions are caught before the patient leaves.`

Do not say:
- one-MCP final product
- autonomous discharge decision-maker
- streaming multi-agent system

## What must be visible in the submission
- `Care Transitions Command` as the system name in narration and deck copy
- `Discharge Gatekeeper MCP` as the structured discharge engine
- `Clinical Intelligence MCP` as the hidden-risk and contradiction layer
- `external A2A orchestrator` as the primary assembled-agent path for the final demo
- a direct-MCP fallback path that still works without the A2A layer
- explicit proof that the direct two-MCP path already demonstrates stronger AI value than structured-only discharge logic

## Final 3-prompt demo requirements

### Prompt 1
`Is this patient safe to discharge today?`

Must show:
- final reconciled verdict
- baseline deterministic posture visibility (for trap patient this should still be `ready`)
- structured blockers from `Discharge Gatekeeper MCP`
- whether hidden-risk review ran, was skipped, or was unavailable

### Prompt 2
`What hidden risks or contradictions change that answer?`

Must show:
- note/document-grounded findings from `Clinical Intelligence MCP`
- citations
- null-result behavior when no additional hidden risk exists
- contradiction-focused response (do not dilute Prompt 2 with transition-package action-list formatting)

### Prompt 3
`What exactly must happen before discharge?`

Must show:
- prioritized next steps
- deterministic blocker linkage
- any hidden-risk escalations that changed urgency or disposition

### Phase 4 end-to-end matrix lock
- keep [phase4-end-to-end-expected-output-matrix.md](phase4-end-to-end-expected-output-matrix.md) aligned to runtime smoke behavior
- this matrix must remain synchronized with:
  - `docs/demo-script.md`
  - `docs/prompt-opinion-integration-runbook.md`
  - `docs/evals.md`

## Marketplace and publish checklist

### Discharge Gatekeeper MCP
- has a clear MCP listing name: `Discharge Gatekeeper MCP`
- description makes the deterministic discharge role obvious
- tool metadata is inspectable and non-hypey
- does not imply LLM-heavy narrative reasoning

### Clinical Intelligence MCP
- has a clear MCP listing name: `Clinical Intelligence MCP`
- description makes the hidden-risk role obvious
- explicitly positions itself as evidence-bound and citation-required
- does not imply it can discharge a patient independently

### External A2A orchestrator
- treat as a separate integration surface, not a hidden implementation detail
- if Prompt Opinion or Marketplace only supports MCP publication for the event, keep the A2A layer documented and demoed but do not block submission on marketplace publication of the orchestrator
- if an A2A listing path exists in time, preserve the identity `external A2A orchestrator` and document its two MCP dependencies explicitly

## Publish implications
- the safest publish baseline is the two MCPs
- the A2A orchestrator is the preferred assembled-agent story but must not be a single point of demo failure
- if publication deadlines force a cut, keep the marketplace story centered on the two MCPs and describe the A2A path as the preferred orchestration lane

## Reliability checklist
- both MCPs have independent health checks
- both MCPs can be registered and discovered in Prompt Opinion separately
- the A2A path is synchronous and demo-safe
- no workflow step depends on hidden local state
- the direct-MCP fallback path has been rehearsed
- the trap contradiction is measurable and note-dependent in the two-MCP fallback path
- clean control behavior stays bounded (`no_hidden_risk`, no forced escalation)
- inconclusive hidden-risk behavior remains bounded and honest (`manual_review_required`, no fabricated findings)
- Prompt 2 remains the strongest contradiction-evidence moment in the 3-prompt story

## Trust checklist
- outputs remain assistive, not autonomous
- every hidden-risk finding is cited
- null hidden-risk results are explicit
- contradictions trigger review, not overconfidence
- deterministic and narrative evidence are distinguishable on screen

## Recording checklist
- rehearse the preferred A2A path once from a clean session
- rehearse the fallback direct-MCP path once from a clean session
- decide before recording which path is primary and which path is backup
- keep the narration focused on verdict, hidden risk, and next actions
- do not spend recording time on registration mechanics

Judge-facing cue order for recordings:
1. show Prompt 1 baseline-vs-final posture change
2. anchor Prompt 2 with contradiction citations (strongest moment)
3. show Prompt 3 actionable transition package

## Phase 3 readiness before final recording/publish
Must be true before final recording/publish lock:
- `docs/phase3-a2a-expected-output-matrix.md` is aligned with live smoke behavior
- phase-3 A2A checks pass via:
  - `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:runtime`
  - `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:decision-matrix`
  - `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
  - `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
  - `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`
- phase-4 realism/control checks pass via:
  - `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
  - `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- Prompt Opinion external-agent registration path is rehearsed using the live agent card discovery endpoint
- direct two-MCP fallback remains green and rehearsal-ready:
  - `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
  - `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`

## Phase 2 readiness before A2A phase
Must be true before moving to A2A implementation as the primary quality lane:
- `docs/phase2-two-mcp-expected-output-matrix.md` is aligned with runtime smoke behavior
- phase-2 trap and control checks pass via:
  - `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
  - `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- Prompt 1/2/3 fallback story is documented in `docs/demo-script.md` and `docs/prompt-opinion-integration-runbook.md`
- citation and parseability failure behavior remains catchable by smoke gates

## Last-minute cut order
Protect these in order:
1. `Discharge Gatekeeper MCP` working in Prompt Opinion
2. `Clinical Intelligence MCP` returning bounded hidden-risk findings with citations
3. direct-MCP fallback story with measurable trap/control proof
4. `external A2A orchestrator` polish

## Submission fail conditions
Do not submit the preferred story as complete if any of these are true:
- the final response cannot be parsed reliably
- hidden-risk findings do not carry citations
- the only working path depends on the A2A layer and the A2A layer is unstable
- Marketplace copy still describes a collapsed one-MCP final architecture
