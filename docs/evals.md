# Evals

## Evaluation goal
Keep the first working slice judgeable and regression-safe. The output must stay:
- explicit about discharge readiness
- structured around blockers
- grounded in evidence
- actionable through ordered next steps

## First-slice smoke eval package
Tool under test: `assess_discharge_readiness`  
Scenario under test: `first_synthetic_discharge_slice_v1`

### Contract checks
Required response keys:
- `verdict`
- `blockers`
- `evidence`
- `next_steps`
- `summary`

Allowed verdicts:
- `ready`
- `ready_with_caveats`
- `not_ready`

Allowed blocker categories:
- `clinical`
- `medications`
- `follow_up`
- `education`
- `home_support`
- `logistics`

### Command smoke check
Run from `po-community-mcp-main/typescript`:
- `npm run smoke:readiness`

Pass signal:
- exits `0`
- prints `SMOKE PASS: assess_discharge_readiness v1`
- prints metrics with `verdict: "not_ready"` and counts for blockers/evidence/next steps

## Judge-test prompt path (matches demo path)

### Prompt 1
`Is this patient safe to discharge today?`

Expected:
- explicit verdict `not_ready`
- summary states high-priority blockers require resolution before discharge

### Prompt 2
`What exactly is blocking discharge right now?`

Expected:
- six blockers are present
- each blocker includes category + priority + actionability + evidence ID(s)
- categories cover all six canonical v1 labels

### Prompt 3
`What must happen before this patient leaves?`

Expected:
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
- verdict labels unchanged
- blocker category labels unchanged
- every blocker references evidence that exists in `evidence`
- `next_steps.length === blockers.length`
- summary stays assistive (no autonomous discharge claim)
