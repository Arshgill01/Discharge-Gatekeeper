# AGENTS.md

## Mission
Build a judge-winning Prompt Opinion submission for Agents Assemble.
The system identity is **Care Transitions Command**.

Care Transitions Command is composed of:
- **Discharge Gatekeeper MCP**
- **Clinical Intelligence MCP**
- **external A2A orchestrator**

Everything in this repo should improve the odds of a clean 3-prompt demo, a reliable Prompt Opinion path, and a credible Marketplace submission.

## North star
The product is not a generic discharge copilot.
It is a care-transitions control system that catches a hidden discharge risk when the contradiction lives in narrative evidence, not in the clean structured snapshot.

The core demo moment is:
1. the patient looks discharge-ready on the deterministic structured spine
2. a note-level contradiction surfaces a hidden risk
3. the system escalates to `not_ready`, cites the evidence, and tells the team what must happen next

If a change weakens that moment, question it.

## Locked system identity
Freeze these unless an explicit decision changes them:
- top-level system identity: `Care Transitions Command`
- existing MCP identity: `Discharge Gatekeeper MCP`
- new MCP identity: `Clinical Intelligence MCP`
- new agent identity: `external A2A orchestrator`

## Locked architecture
Freeze these unless an explicit decision changes them:
- `2 MCPs + 1 external A2A`
- no custom frontend
- no third MCP
- no A2A streaming
- Prompt Opinion is the demo surface
- deterministic structured discharge spine remains foundational
- hidden-risk contradiction is the core spec

## Component responsibilities
### Discharge Gatekeeper MCP
Owns the deterministic discharge spine:
- structured patient-context normalization
- discharge-readiness posture from bounded structured evidence
- canonical blocker taxonomy
- next-step spine and transition scaffolding

### Clinical Intelligence MCP
Owns bounded narrative intelligence:
- note and document contradiction detection
- hidden-risk discovery
- evidence-backed escalation or de-escalation against the structured posture
- concise contradiction summaries for judge-visible outputs

### external A2A orchestrator
Owns prompt-level coordination:
- receives the Prompt Opinion prompt
- calls the right MCPs in the right order
- fuses deterministic and narrative evidence into one answer
- keeps the user-visible response aligned to the 3-prompt demo

## Phase sequence
1. Phase 0: vision lock, trap-patient lock, repo scaffold reset
2. Phase 1: Clinical Intelligence MCP hidden-risk contract and contradiction detection
3. Phase 2: two-MCP integrated story on top of the existing Discharge Gatekeeper MCP structured spine
4. Phase 3: external A2A orchestrator integration
5. Phase 4: 3-prompt demo collapse and Prompt Opinion operator hardening
6. Phase 5: Marketplace and judging packaging

## Canonical demo shape
The final demo is 3 prompts:
1. `Is this patient safe to discharge today?`
2. `What hidden risk changed that answer? Show me the contradiction and the evidence.`
3. `What exactly must happen before discharge, and prepare the transition package.`

## Canonical verdict states
Use these exact states unless a logged decision changes them:
- `ready`
- `ready_with_caveats`
- `not_ready`

## Canonical blocker categories
Use these exact top-level categories unless a logged decision changes them:
- `clinical_stability`
- `pending_diagnostics`
- `medication_reconciliation`
- `follow_up_and_referrals`
- `patient_education`
- `home_support_and_services`
- `equipment_and_transport`
- `administrative_and_documentation`

## Canonical outputs
The repo should converge on these visible outputs:
1. discharge readiness verdict
2. blocker list with severity
3. evidence trace by source
4. prioritized next-step checklist
5. clinician handoff brief
6. patient-friendly discharge instructions

## System of record
Treat this file as the map, not the encyclopedia.
Read these first:
1. `PLAN.md`
2. `docs/phase0-vision-lock.md`
3. `docs/product-brief.md`
4. `docs/architecture.md`
5. `docs/demo-script.md`
6. `docs/phase0-trap-patient-spec.md`

Read these next when relevant:
- `docs/data-plan.md`
- `docs/evals.md`
- `docs/submission-checklist.md`
- `docs/prompt-opinion-integration-runbook.md`
- `docs/parallel-workplay.md`
- `docs/decisions.md`

## Working norms
When making changes:
1. Preserve the locked system identity.
2. Preserve the `2 MCPs + 1 external A2A` architecture.
3. Prefer the narrowest change that sharpens the core 3-prompt demo.
4. Update `PLAN.md` when priorities or phases change.
5. Record cross-workstream decisions in `docs/decisions.md`.
6. Do not touch runtime code unless your task explicitly owns implementation work.

## File routing
Use this routing:
- system and repo front door -> `README.md`
- agent operating rules -> `AGENTS.md`
- live priorities and sequencing -> `PLAN.md`
- product framing -> `docs/product-brief.md`
- architecture and component boundaries -> `docs/architecture.md`
- demo flow -> `docs/demo-script.md`
- canonical synthetic patient -> `docs/phase0-trap-patient-spec.md`
- data strategy -> `docs/data-plan.md`
- parallel work coordination -> `docs/parallel-workplay.md`
- logged decisions -> `docs/decisions.md`

## Tool and prompt guidance
Prefer sharp boundaries over broad tools.
Each MCP should do a specific job.
The orchestrator should compose, not impersonate both MCPs with one vague prompt.

Prompts and outputs should:
- state the job clearly
- stay evidence-backed
- avoid autonomous medical language
- keep reasoning bounded and inspectable

## Demo-first rule
A change is valuable if it improves at least one of:
- correctness of the final discharge verdict
- clarity of the contradiction moment
- quality of blocker evidence
- actionability of the transition package
- reliability of the Prompt Opinion path

If it improves none of these, question it.

## Non-goals
Do not drift into:
- a custom frontend
- a third MCP
- streaming A2A orchestration
- diagnosis generation
- generic hospital operations dashboards
- open-ended care-management scope
- flashy UX work that bypasses Prompt Opinion

## Safety and quality bar
This is a healthcare workflow project.
Be conservative in claims.
Do not imply autonomous discharge authority or guaranteed safety.
The system assists human review by surfacing readiness posture, contradictions, blockers, evidence, and next actions.

## Final reminder
This repo is trying to win a hackathon with a system that is specific, credible, inspectable, and demoable.
Keep the system definition locked.
Keep the hidden-risk contradiction sharp.
Keep the 3-prompt demo sacred.
