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
Current focus (2026-04-15, Agent 2):
- harden top-level and runtime identity so first impressions are Discharge Gatekeeper, not starter substrate
- align front-door docs and metadata with discharge-readiness MCP positioning
- de-emphasize inherited starter language on visible repo surfaces without changing MCP behavior

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
Current focus (2026-04-15, Agent 1):
- harden Prompt Opinion integration runtime path for the TypeScript MCP server
- document local run, dev tunnel, Prompt Opinion connection, and end-to-end smoke steps
- reduce integration demo risk with lightweight observability and failure-mode guidance
Current focus (2026-04-15, Agent 1 - taxonomy/contract lane):
- unify discharge blocker taxonomy and response-contract terminology across readiness code, evals, and demo docs
- align `assess_discharge_readiness` v1 outputs with canonical blocker labels while preserving stable top-level response keys
- remove cross-file vocabulary drift to keep judge-path behavior and expectations consistent
Current focus (2026-04-15, Agent 1 - evidence layer lane):
- add a normalized internal evidence bundle that merges structured context and note/document signals for readiness assessment
- make contradiction, ambiguity, and missing-evidence states explicit for downstream readiness logic and traceability
- add smoke checks for evidence normalization behavior without changing frozen public tool contract keys/verdict labels
Current focus (2026-04-15, Agent 2):
- polish `assess_discharge_readiness` output readability (blocker clarity, evidence inspectability, next-step actionability, concise summary wording) without changing frozen v1 keys/categories/verdict labels
- tighten smoke assertions for demo-facing output consistency and evidence linkage quality
Current focus (2026-04-15, Agent 3):
- clean runtime-visible MCP surface so only discharge-readiness-facing tool metadata is exposed in the active TypeScript server path
- remove or quarantine starter/default tool exposure and hello-world runtime leakage without breaking the `assess_discharge_readiness` slice

Current focus (2026-04-15, Agent 2):
- remediate known npm audit vulnerabilities in the TypeScript MCP runtime without changing product behavior
- validate post-fix stability with typecheck, smoke test, and refreshed audit output
Current focus (2026-04-15, Agent 2 - readiness engine deepening):
- refactor `assess_discharge_readiness` to be evidence-driven and less scenario-shape brittle while preserving canonical verdicts/categories and top-level response keys
- add explicit handling for contradictory/insufficient evidence so unresolved ambiguity is visible and actionable
- add multi-scenario and ambiguity smoke coverage to protect verdict separation (`ready`, `ready_with_caveats`, `not_ready`) and output contract stability
Current focus (2026-04-18, Agent 1 - Prompt Opinion ops hardening):
- consolidate to one canonical zero-to-invocation operator runbook for local -> tunnel/public endpoint -> Prompt Opinion
- document explicit environment-variable reference and connection assumptions for reliable team handoff
- harden runtime diagnostics and troubleshooting guidance for tool discoverability, host allowlist issues, patient-context assumptions, and tunnel URL rotation
Current focus (2026-04-18, Agent 1 - workflow suite core lane):
- establish one shared workflow spine that keeps readiness, blocker extraction, and transition planning on the same evidence model
- ship `extract_discharge_blockers` and `generate_transition_plan` on the active MCP runtime surface
- add suite-level smoke checks that lock tool-surface, blocker/evidence linkage, and blocker-to-transition-task traceability
Current focus (2026-04-18, Agent 2 - artifact suite expansion):
- implement `build_clinician_handoff_brief` and `draft_patient_discharge_instructions` as downstream workflow artifacts
- keep assistive/non-autonomous safety framing explicit in both artifact outputs
- extend smoke/release-gate coverage so artifact-tool regressions and expanded demo-path breakage are caught pre-demo
Current focus (2026-04-18, Agent 2 - provenance/trust lane):
- deepen bounded provenance across readiness, blocker extraction, transition planning, and artifact outputs without changing tool membership or frozen top-level response keys
- surface contradiction, ambiguity, and missing-corroboration states explicitly in blocker/evidence/action traceability
- strengthen smoke/eval coverage so blocker -> evidence -> action propagation and trust visibility remain demo-readable

### 5) Evals
Owner: open
Goal: make behavior testable with prompts and expected outputs.
Deliverables:
- acceptance prompts
- fail cases
- output quality rubric
- regression checklist
Current focus (2026-04-15, Agent 3 - scenario regression lane):
- add a second synthetic readiness scenario with distinct expected verdict (`ready_with_caveats`) while preserving the primary v1 demo scenario as default
- add truth fixtures and failure fixtures (missing context, insufficient evidence, contradictory evidence, malformed input) for repeatable regression checks
- add a runnable regression smoke path to guard contract/taxonomy/demo behavior from silent drift
Current focus (2026-04-15, Agent 3):
- add prompt-based smoke evals and expected outputs for the first readiness scenario
- define explicit pass/fail checks for evidence-backed blocker output
Current focus (2026-04-18, Agent 2 - validation net hardening):
- add runtime boot + tool-registration smoke checks so breakage in MCP startup surface is caught before demo/judging
- strengthen regression assertions for frozen contract keys, canonical verdict/category taxonomy, and scenario-truth separation
- add a repeatable 3-prompt demo-path smoke check and wire a pre-demo validation bundle command

### 6) Demo and submission
Owner: open
Goal: protect the judge path from day one.
Deliverables:
- demo script
- Marketplace checklist
- publish smoke test plan
- 3-minute video structure
Current focus (2026-04-15, Agent 3):
- tighten first-slice 3-prompt demo path around `assess_discharge_readiness`
- publish judge-facing runbook text with expected outputs for the synthetic v1 scenario
- align smoke-eval checklist with demo prompts and visible evidence trace

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
