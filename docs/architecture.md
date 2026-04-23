# Architecture

## Locked system shape
Care Transitions Command uses:
1. **Discharge Gatekeeper MCP**
2. **Clinical Intelligence MCP**
3. **external A2A orchestrator**

Freeze these constraints:
- architecture stays `2 MCPs + 1 external A2A`
- no custom frontend
- no third MCP
- external A2A surface is synchronous request/response
- no A2A streaming
- Prompt Opinion is the user-facing surface

## Why this architecture exists
The system has to prove two things at once:
1. the discharge decision is grounded in a deterministic, inspectable structure
2. the system can still catch a hidden contradiction that only appears in notes or documents

One MCP is not enough for the locked narrative.
The repo now assumes:
- **Discharge Gatekeeper MCP** owns the deterministic discharge spine
- **Clinical Intelligence MCP** owns bounded narrative contradiction intelligence
- the **external A2A orchestrator** fuses both into one answer

## Component responsibilities

### 1) Discharge Gatekeeper MCP
Purpose:
- produce the deterministic structured discharge posture
- keep canonical verdicts, blockers, and next-step scaffolding stable

Inputs:
- structured patient context
- high-value FHIR-like resources
- bounded deterministic rules and mappings

Outputs:
- provisional or final discharge posture from structured evidence
- blocker objects using canonical categories
- evidence anchors to structured sources
- prioritized next-step scaffold

Rules:
- remain inspectable
- do not depend on free-form note reasoning
- remain foundational even after the second MCP exists

### 2) Clinical Intelligence MCP
Purpose:
- inspect narrative notes and documents for contradictions, omissions, or hidden risks that change the discharge decision

Inputs:
- note and document bundle
- structured discharge posture from Discharge Gatekeeper MCP
- focused contradiction questions from the orchestrator

Outputs:
- contradiction findings
- hidden-risk evidence
- impacted blocker categories
- concise explanation of why the structured posture should change or hold

Rules:
- use bounded reasoning
- stay anchored to source evidence
- do not become a generic diagnosis or treatment engine

### 3) external A2A orchestrator
Purpose:
- coordinate both MCPs per user prompt
- decide when the narrative contradiction pass is required
- assemble one user-visible answer in Prompt Opinion

Inputs:
- Prompt Opinion prompt
- patient context
- outputs from both MCPs

Outputs:
- final answer aligned to the active prompt
- consistent verdict and blocker framing across prompts
- transition package responses that preserve evidence lineage

Rules:
- synchronous request/response only
- explicit non-streaming agent-card/task-lifecycle contract
- no custom frontend dependency
- no speculative multi-agent sprawl

## End-to-end request flow

### Prompt 1: discharge question
1. Prompt Opinion sends the prompt and patient context to the external A2A orchestrator.
2. The orchestrator calls Discharge Gatekeeper MCP to compute the deterministic structured posture.
3. If the case fits the trap-patient pattern or if note review is required, the orchestrator calls Clinical Intelligence MCP.
4. The orchestrator fuses both results into the final discharge verdict.

### Prompt 2: contradiction question
1. The orchestrator asks Clinical Intelligence MCP for the specific contradiction that changed the answer.
2. The orchestrator ties that contradiction back to the structured posture from Discharge Gatekeeper MCP.
3. The response shows exactly why the final answer is different from the clean structured view.

### Prompt 3: transition package question
1. The orchestrator requests next-step scaffolding from Discharge Gatekeeper MCP.
2. The orchestrator carries forward the contradiction evidence from Clinical Intelligence MCP.
3. The final response returns the prioritized transition package.

## Deterministic structured discharge spine
This is foundational and must remain visible.

The structured spine should be able to explain:
- what the chart says
- which canonical blockers are present from structured evidence
- what the provisional posture is before note escalation
- what the immediate next steps would be if the structured picture were complete

The system is stronger because this foundation exists.
The second MCP does not replace it.
It challenges it when the notes prove it is incomplete.

## Bounded reasoning rule
The narrative layer is intentionally narrow.
Clinical Intelligence MCP should only do work that the deterministic spine cannot do safely on its own:
- detect contradictions
- surface hidden blockers
- connect narrative evidence to canonical blocker categories
- explain why the posture changed

It should not:
- invent new product scope
- generate open-ended clinical management plans
- become a generic chart-summary engine

## Canonical outputs across the system
The combined system should preserve these outputs:
1. discharge readiness verdict
2. blocker list with severity
3. evidence trace by source
4. prioritized next-step checklist
5. clinician handoff brief
6. patient-friendly discharge instructions

## Canonical terms
Verdicts:
- `ready`
- `ready_with_caveats`
- `not_ready`

Blocker categories:
- `clinical_stability`
- `pending_diagnostics`
- `medication_reconciliation`
- `follow_up_and_referrals`
- `patient_education`
- `home_support_and_services`
- `equipment_and_transport`
- `administrative_and_documentation`

## Current repo note
The current implementation substrate still centers on Discharge Gatekeeper MCP runtime work.
That is acceptable.
The locked architecture in this doc defines the target system shape for all future phase work.
