# PLAN.md

## Objective
Win the Agents Assemble hackathon with an MCP-first discharge-readiness agent that works reliably inside Prompt Opinion and demos cleanly in under 3 minutes.

## Current phase
Phase 0 -> repo operating system and reference analysis
Phase 1 -> thin vertical slice
Target output for Phase 1: one callable MCP tool, one synthetic patient, one Launchpad-safe demo path.

## Current repo thesis
Product: **Discharge Gatekeeper**
Core question: **Is this patient safe to discharge today?**
Support questions:
- What is blocking discharge?
- What must happen before discharge?
- What transition artifacts should the care team send?

## Hard constraints
- Stay MCP-first unless an explicit decision changes lane.
- Prefer Prompt Opinion UI reliability over ambitious infrastructure.
- Use patient/FHIR context plus uploaded notes/documents.
- Keep the demo inspectable and easy to evaluate.
- Avoid diagnosis-heavy framing and overclaiming.

## Active workstreams

### 1) Product
Owner: open
Goal: sharpen the wedge and keep the value prop crisp.
Deliverables:
- product brief
- final naming and positioning
- blocker taxonomy
- demo story

### 2) Architecture
Owner: open
Goal: define the MCP-first system shape and tool contracts.
Deliverables:
- tool list
- response schemas
- Prompt Opinion integration assumptions
- public endpoint assumptions

### 3) Data
Owner: open
Goal: prepare a synthetic patient and note corpus that exposes real discharge blockers.
Deliverables:
- patient scenario
- blocker evidence sources
- minimal FHIR resource list
- uploaded note plan

### 4) Implementation
Owner: open
Goal: ship the first runnable MCP slice.
Deliverables:
- project scaffold
- first tool
- context parsing
- starter tests or smoke checks
Current focus (2026-04-15, Agent 3):
- implement first-pass `assess_discharge_readiness` logic with frozen v1 output contract
- return inspectable blockers + evidence + next steps for one synthetic scenario
- add a runnable smoke check for verdict/category/evidence shape

### 5) Evals
Owner: open
Goal: make behavior testable with prompts and expected outputs.
Deliverables:
- acceptance prompts
- fail cases
- output quality rubric
- regression checklist
Current focus (2026-04-15, Agent 3):
- add prompt-based smoke evals and expected outputs for the first readiness scenario
- define explicit pass/fail checks for evidence-backed blocker output

### 6) Demo and submission
Owner: open
Goal: protect the judge path from day one.
Deliverables:
- demo script
- Marketplace checklist
- publish smoke test plan
- 3-minute video structure

## Recommended implementation sequence
1. Analyze `po-community-mcp` and extract reusable patterns.
2. Scaffold repo structure and tool contract docs.
3. Build minimal MCP server.
4. Implement `assess_discharge_readiness`.
5. Create one synthetic patient with 3 to 4 blockers.
6. Add `extract_discharge_blockers`.
7. Add transition-plan output.
8. Rehearse Launchpad flow and tighten demo.

## First thin vertical slice
Build the smallest thing that proves the thesis:
- one patient
- one discharge-readiness verdict
- 3 to 4 blocker categories
- evidence pulled from structured context and note text
- one follow-up artifact

Success criteria:
- the tool returns `not_ready` or `ready_with_caveats` correctly for the demo patient
- blockers are grounded in specific evidence
- the output is understandable to a judge in under 20 seconds
- the MCP path remains simple enough to integrate immediately

## Proposed first MCP tool set
Priority 1:
- `assess_discharge_readiness`
- `extract_discharge_blockers`

Priority 2:
- `generate_transition_plan`
- `draft_patient_discharge_instructions`

Priority 3:
- `build_clinician_handoff_brief`
- `collect_discharge_evidence_trace`

## Canonical blocker categories
- clinical_stability
- pending_diagnostics
- medication_reconciliation
- follow_up_and_referrals
- patient_education
- home_support_and_services
- equipment_and_transport
- administrative_and_documentation

## Immediate next tasks
1. Finish reference analysis of `po-community-mcp`.
2. Lock the first MCP tool contract.
3. Define the first synthetic patient scenario.
4. Decide repo language for the first slice.
5. Create implementation scaffold.

## Open decisions
- Python vs TypeScript for the first MCP slice
- exact shape of tool outputs: free text vs structured JSON-plus-text
- how much evidence to expose in the first response
- whether to wrap MCP tools in a thin internal A2A agent during the demo

## Risks
- building too broad a discharge workflow
- spending too long on infra before the first verdict works
- weak synthetic data making the demo feel toy-like
- unclear output contracts causing tool churn
- poor Prompt Opinion integration assumptions

## Guardrails
- No dashboard work before the first working verdict.
- No external A2A work before MCP value is proven.
- No sprawling tool list before the first two tools feel sharp.
- No contract churn without updating docs and decisions.

## Definition of done for MVP
The MVP is done when:
- a Prompt Opinion-compatible MCP server is reachable
- one patient-context-aware discharge-readiness assessment works
- blockers and evidence are legible
- at least one transition artifact is generated
- the 3-prompt demo flow feels coherent

## Update protocol
Whenever a meaningful task finishes:
- update this file if priority or sequencing changed
- update `docs/decisions.md` if a decision was made
- leave the next best task obvious
