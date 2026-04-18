# Evals

## Evaluation goal
Build a regression net that protects demo reliability and catches contract drift in `assess_discharge_readiness`.

## First-slice smoke eval package
Tool under test: `assess_discharge_readiness`
Scenario coverage:
- `first_synthetic_discharge_slice_v1` (primary `not_ready`)
- `second_synthetic_discharge_slice_ready_with_caveats_v1` (distinct `ready_with_caveats`)
- optional ambiguity/uncertainty fixture coverage in smoke checks

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
- every evidence trace back-links to known blockers
- `next_steps.length === blockers.length`

## Smoke and regression commands
Run from `po-community-mcp-main/typescript`:
- `npm run smoke:runtime`
- `npm run smoke:readiness`
- `npm run smoke:readiness:regression`
- `npm run smoke:demo-path`
- `npm run smoke:release-gate`

Pass signal:
- runtime smoke prints `SMOKE PASS: runtime boot and tool registration`
- primary smoke prints `SMOKE PASS: assess_discharge_readiness v1`
- regression smoke prints `REGRESSION PASS: assess_discharge_readiness matrix`
- demo-path smoke prints `SMOKE PASS: demo path (3 prompts)`
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
- no deprecated labels

### Prompt 3
`What must happen before this patient leaves?`

Expected for primary demo scenario:
- six ordered `next_steps`
- each step links to one blocker ID
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

## Regression checklist
Run when readiness logic changes:
- MCP runtime still boots and `/healthz` reports `assess_discharge_readiness`
- only `assess_discharge_readiness` is registered on the active tool surface
- verdict labels unchanged
- blocker category labels unchanged
- every blocker references evidence that exists in `evidence`
- `next_steps.length === blockers.length`
- primary scenario still triggers canonical six-category blocker set
- second scenario still separates to `ready_with_caveats`
- contradictory/insufficient evidence remains explicit (no silent optimistic closure)
- summary stays assistive (no autonomous discharge claim)
