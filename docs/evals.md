# Evals

## Evaluation goal
Build a regression net that protects demo reliability and catches contract drift across the workflow suite (`assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions`).

## First-slice smoke eval package
Tool under test: `assess_discharge_readiness`
Scenario coverage:
- `first_synthetic_discharge_slice_v1` (primary `not_ready`)
- `second_synthetic_discharge_slice_ready_with_caveats_v1` (distinct `ready_with_caveats`)
- `third_synthetic_discharge_slice_ready_v1` (distinct `ready`)
- explicit ambiguity/uncertainty fixture coverage in smoke checks

## Core suite consistency checks
Tools under test:
- `extract_discharge_blockers`
- `generate_transition_plan`

Expected:
- both tools preserve canonical blocker categories
- blocker/evidence linkage stays one-to-one/back-linked
- blockers expose bounded provenance (`trust_state`, source labels/types, and any contradiction/ambiguity/missing-corroboration marker IDs)
- transition tasks keep owner + priority + `linked_blockers`
- transition tasks carry `linked_evidence`, blocker trust state, and short trace summary
- output keys remain frozen:
  - `extract_discharge_blockers`: `verdict`, `blockers`, `evidence`, `summary`
  - `generate_transition_plan`: `verdict`, `blockers`, `evidence`, `next_steps`, `summary`
- outputs stay consistent with `assess_discharge_readiness` for the same scenario input

## Live-context ingest checks
Expected:
- request-scoped resolution can derive a `ReadinessInput` from realistic FHIR-derived context
- structured evidence and note/document evidence coexist in one evidence bundle
- partial live context surfaces explicit gaps instead of fabricating closure
- absent live context falls back to the synthetic default scenario path

## Scenario matrix (success)

### Case: `first_synthetic_discharge_slice_v1` (primary demo)
Expected:
- verdict: `not_ready`
- required categories: `clinical_stability`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`
- forbidden categories for this scenario: `pending_diagnostics`, `administrative_and_documentation`
- priority mix: 4 `high`, 2 `medium`

### Case: `second_synthetic_discharge_slice_ready_with_caveats_v1` (regression scenario)
Expected:
- verdict: `ready_with_caveats`
- required categories: `follow_up_and_referrals`, `patient_education`, `equipment_and_transport`, `administrative_and_documentation`
- forbidden categories for this scenario: `clinical_stability`, `pending_diagnostics`, `medication_reconciliation`, `home_support_and_services`
- priority mix: 0 `high`, 4 `medium`

### Case: `third_synthetic_discharge_slice_ready_v1` (ready separation scenario)
Expected:
- verdict: `ready`
- required categories: none
- forbidden categories for this scenario: `clinical_stability`, `pending_diagnostics`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`, `administrative_and_documentation`
- priority mix: 0 `high`, 0 `medium`, 0 `low`
- blockers/evidence/next steps: all empty while the summary stays assistive and clinician-anchored

## Failure matrix

### Case: missing patient context
Fixture ID: `failure-missing-patient-context`
Expected:
- explicit error containing `Missing patient context`
- no fabricated verdict

### Case: insufficient evidence
Fixture ID: `failure-insufficient-evidence`
Expected:
- explicit error containing `Insufficient evidence`
- no fabricated verdict

### Case: contradictory evidence across sources
Fixture ID: `failure-contradictory-evidence`
Expected:
- explicit error containing `Contradictory evidence`
- no verdict until conflict is resolved

### Case: malformed/incomplete input surface
Fixture ID: `failure-malformed-input-surface`
Expected:
- explicit error containing `Malformed readiness input`

## Contract and taxonomy checks
All success cases must continue to satisfy:
- response keys exactly: `verdict`, `blockers`, `evidence`, `next_steps`, `summary`
- verdict in: `ready`, `ready_with_caveats`, `not_ready`
- blocker categories constrained to canonical taxonomy:
  - `clinical_stability`
  - `pending_diagnostics`
  - `medication_reconciliation`
  - `follow_up_and_referrals`
  - `patient_education`
  - `home_support_and_services`
  - `equipment_and_transport`
  - `administrative_and_documentation`
- every blocker references existing evidence
- every blocker exposes non-empty provenance summary plus source labels/types
- every evidence trace back-links to known blockers
- every evidence trace links to known next-step IDs
- `next_steps.length === blockers.length`
- every next step preserves blocker-linked evidence IDs and blocker trust state

## Smoke and regression commands
Run from `po-community-mcp-main/typescript`:
- `npm run typecheck`
- `npm run smoke:runtime`
- `npm run smoke:readiness`
- `npm run smoke:live-context`
- `npm run smoke:readiness:regression`
- `npm run smoke:workflow-suite-core`
- `npm run smoke:artifacts`
- `npm run smoke:demo-path`
- `npm run smoke:release-gate`

Pass signal:
- typecheck exits `0`
- runtime smoke prints `SMOKE PASS: runtime boot and tool registration`
- primary smoke prints `SMOKE PASS: assess_discharge_readiness v1`
- live-context smoke prints `SMOKE PASS: live context evidence ingest`
- regression smoke prints `REGRESSION PASS: assess_discharge_readiness matrix`
- core-suite smoke prints `SMOKE PASS: workflow suite core`
- artifact smoke prints `SMOKE PASS: workflow artifacts suite`
- demo-path smoke prints `SMOKE PASS: demo path (expanded workflow)`
- release gate exits `0` only when all smoke checks above pass in sequence

## Judge-test prompt path
### Prompt 1
`Is this patient safe to discharge today?`

Expected for primary demo scenario:
- explicit verdict `not_ready`
- summary says high-priority blockers require resolution before discharge

### Prompt 2
`What exactly is blocking discharge right now?`

Expected for primary demo scenario:
- six blockers with canonical category + priority + actionability + evidence ID(s)
- each blocker shows concise provenance summary and source labels
- no deprecated labels

### Prompt 3
`What must happen before this patient leaves?`

Expected for primary demo scenario:
- six ordered `next_steps`
- each step links to one blocker ID
- each step keeps linked evidence IDs and short trace summary
- owner field is present so execution responsibility is clear

## Negative checks (quick)
### Missing patient context
Expected:
- no fabricated verdict
- clear message about missing context

### Weak evidence inputs
Expected:
- signals insufficient evidence
- requests additional data instead of overconfident claims

### Contradictory notes
Expected:
- conflict is surfaced explicitly
- unresolved blockers remain visible
- conflicted blockers expose contradiction-linked provenance instead of collapsing to a plain blocker description

## Regression checklist
Run when readiness logic changes:
- MCP runtime still boots and `/healthz` reports `assess_discharge_readiness`
- MCP active tool surface remains exactly `assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`, `build_clinician_handoff_brief`, `draft_patient_discharge_instructions` (no starter/example leakage)
- verdict labels unchanged
- blocker category labels unchanged
- every blocker references evidence that exists in `evidence`
- every blocker exposes trust metadata that stays bounded/readable
- `next_steps.length === blockers.length`
- primary scenario still triggers canonical six-category blocker set
- second scenario still separates to `ready_with_caveats`
- third scenario still separates to `ready` with zero active blockers
- contradictory/insufficient evidence remains explicit (no silent optimistic closure)
- summary stays assistive (no autonomous discharge claim)
- artifact outputs stay aligned to blocker/evidence/next-step linkages from readiness
- demo-facing provenance summaries remain concise enough to scan quickly
