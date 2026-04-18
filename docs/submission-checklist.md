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
- single-MCP workflow suite
- autonomous discharge decision-maker
- streaming multi-agent system

## What must be visible in the submission
- `Care Transitions Command` as the system name in narration and deck copy
- `Discharge Gatekeeper MCP` as the structured discharge engine
- `Clinical Intelligence MCP` as the hidden-risk and contradiction layer
- `external A2A orchestrator` as the preferred final demo path
- a direct-MCP fallback path that still works without the A2A layer

## Final 3-prompt demo requirements

### Prompt 1
`Is this patient safe to discharge today?`

Must show:
- final reconciled verdict
- structured blockers from `Discharge Gatekeeper MCP`
- whether hidden-risk review ran, was skipped, or was unavailable

### Prompt 2
`What hidden risks or contradictions change that answer?`

Must show:
- note/document-grounded findings from `Clinical Intelligence MCP`
- citations
- null-result behavior when no additional hidden risk exists

### Prompt 3
`What exactly must happen before discharge?`

Must show:
- prioritized next steps
- deterministic blocker linkage
- any hidden-risk escalations that changed urgency or disposition

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
- the A2A orchestrator improves the final story but must not be a single point of demo failure
- if publication deadlines force a cut, keep the marketplace story centered on the two MCPs and describe the A2A path as the preferred orchestration lane

## Reliability checklist
- both MCPs have independent health checks
- both MCPs can be registered and discovered in Prompt Opinion separately
- the A2A path is synchronous and demo-safe
- no workflow step depends on hidden local state
- the direct-MCP fallback path has been rehearsed

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

## Last-minute cut order
Protect these in order:
1. `Discharge Gatekeeper MCP` working in Prompt Opinion
2. `Clinical Intelligence MCP` returning bounded hidden-risk findings with citations
3. direct-MCP fallback story
4. `external A2A orchestrator` polish

## Submission fail conditions
Do not submit the preferred story as complete if any of these are true:
- the final response cannot be parsed reliably
- hidden-risk findings do not carry citations
- the only working path depends on the A2A layer and the A2A layer is unstable
- Marketplace copy still describes a single-MCP final architecture
