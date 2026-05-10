# Phase 9 ExecPlan — From Baseline Green to Winner-Level Product

## Objective

Win Agents Assemble by making Care Transitions Command a polished, evidence-chained transition control system for unsafe hospital discharge prevention.

Phase 9 begins only after the baseline proof gate passes.

If the baseline proof fails, Phase 9 does not start. The only work is diagnosing and fixing the failing baseline layer.

## Phase 9 Entry Gate

Status on 2026-05-09: entry gate passed.

Accepted baseline artifacts:

- Direct-MCP Test 1: `output/prompt-opinion-e2e/runs/20260509T121900Z-test1-googleflashlite-verbatim-scenario-fix/reports/test1-visible-proof-audit.md`
- Combined Test 2: `output/prompt-opinion-e2e/runs/20260509T122600Z-test2-combined-googleflashlite/reports/test2-combined-proof-audit.md`
- Fresh Test 3: `output/prompt-opinion-e2e/runs/20260509T123400Z-test3-fresh-repro-googleflashlite/reports/test3-fresh-repro-proof-audit.md`
- Completion audit: `output/prompt-opinion-e2e/baseline-goal-completion-audit.md`

The proof standard remained visible Prompt Opinion transcript success plus runtime evidence. FunctionResponse persistence was retained only as diagnostic evidence.

Before Phase 9 implementation begins, the repo must have a current run folder proving:

1. Direct-MCP Prompt Opinion proof passes.
2. Combined baseline proof passes.
3. Fresh reproducibility combined proof passes.
4. The primary live lane and architecture proof lane are clearly named.
5. No stale screenshots, stale services, old branch, wrong provider config, or broken ngrok/path proxy are used as proof.

## Phase 9 North Star

Care Transitions Command catches note-level contradictions that turn a discharge-ready chart into an unsafe transition, then produces an evidence-cited action package for clinician review.

Every Phase 9 change must reinforce this.

## Wave 0 — Baseline Proof Freeze

### Goal

Prove the current system before adding product enhancements.

### Tasks

- Run precheck.
- Run Direct-MCP Prompt Opinion proof.
- Run combined baseline proof.
- Run fresh reproducibility combined proof.
- Write final baseline status summary.

### Outputs

- `output/prompt-opinion-e2e/runs/<timestamp>/reports/status-summary.md`
- screenshots
- transcripts
- network evidence
- runtime logs
- provider evidence
- final lane decision

### Stop Conditions

Stop all Phase 9 work if:

- Direct-MCP proof fails.
- Combined proof fails.
- Fresh reproducibility proof fails.
- Provider/env/tunnel/registration is not clean.
- Clinical output is wrong.
- Evidence anchors are missing.
- Prompt 3 times out.

## Wave 1 — Transition Safety Packet

### Goal

Create the canonical product artifact.

### Why

The project should not feel like a model answer. It should feel like an auditable safety control artifact.

### Tasks

- Add or surface a `TransitionSafetyPacket` contract.
- Ensure the main reconciled readiness output includes:
  - patient identity
  - structured baseline
  - narrative contradiction
  - final transition status
  - cited evidence
  - action router
  - safety invariants
  - MCP/A2A trace when available
- Keep the Prompt Opinion visible rendering concise.

### Acceptance Criteria

For the Maria trap patient:

- structured baseline is `ready`
- final transition status is `not_ready`
- hidden-risk result is `hidden_risk_present`
- required evidence anchors are present:
  - `Nursing Note 2026-04-18 20:40`
  - `Case Management Addendum 2026-04-18 20:55`
- blocker categories include:
  - `clinical_stability`
  - `equipment_and_transport`
  - `home_support_and_services`
- safety invariants pass

## Wave 2 — Evidence-First Prompt 2

### Goal

Make the holy-shit moment impossible to miss.

### Tasks

- Redesign Prompt 2 output rendering around:
  - structured baseline
  - contradiction
  - cited evidence
  - why it changes final status
  - impacted blockers
- Remove action-package noise from Prompt 2.
- Ensure the first screenful contains the contradiction.

### Required Output Shape

```text
HIDDEN CONTRADICTION FOUND

Structured baseline:
READY — stable at rest, meds ready, follow-up scheduled.

Contradicting narrative evidence:
Nursing Note 2026-04-18 20:40:
SpO2 dropped to 82% after 20 feet and 6 stairs.

Case Management Addendum 2026-04-18 20:55:
Oxygen delivery delayed until tomorrow; daughter unavailable overnight.

Why this changes the answer:
The chart was stable at rest, but home discharge tonight requires stair tolerance, oxygen availability, and overnight support. Those conditions are not met.

Final transition status:
NOT_READY
```

### Acceptance Criteria

- Prompt 2 does not look like generic summarization.
- Required evidence anchors are visible.
- Baseline-vs-contradiction-vs-final status is obvious.
- No long transition plan appears in Prompt 2.

## Wave 3 — Compact Prompt 3 Transition Package

### Goal

Make Prompt 3 useful, stable, and not timeout-prone.

### Tasks

- Cap output length.
- Limit to top 3–5 actions.
- Ensure each action has:
  - owner
  - action
  - timing
  - release condition or evidence link
- Preserve `not_ready` until blockers are resolved.

### Required Output Shape

```text
TRANSITION PACKAGE — DISCHARGE HOLD ACTIVE

Release condition:
Do not discharge until exertional stability, oxygen logistics, and overnight support are confirmed.

Actions:
1. Bedside RN — repeat exertional room-air assessment before discharge.
2. Covering clinician — reassess discharge readiness after exertional result.
3. Case manager — confirm oxygen concentrator delivery or alternate disposition.
4. Family/support — confirm overnight support for first night home.
5. Care team — document updated handoff and patient-facing instructions.

Evidence:
- Nursing Note 2026-04-18 20:40
- Case Management Addendum 2026-04-18 20:55
```

### Acceptance Criteria

- Prompt 3 completes reliably.
- No timeout/cancelled banner.
- Output is concise.
- Actions are operational, not generic.
- Final posture remains `not_ready`.

## Wave 4 — Scenario Evidence Table

### Goal

Prove the system is not hardcoded to one patient.

### Tasks

- Package existing fixture lanes into a judge-readable table.
- Include at least:
  - trap patient
  - ablation
  - clean control
  - duplicate signal
  - missing narrative/inconclusive
  - alternative hidden risk
- Add one non-COPD/non-oxygen case if time allows.

### Recommended New Case

Medication access contradiction:

Structured baseline:
- vitals stable
- meds reconciled
- follow-up scheduled

Late narrative evidence:
- patient cannot afford DOAC
- prior authorization pending
- pharmacy cannot dispense before discharge
- caregiver cannot pick up medication

Expected:
- final status `not_ready` or `ready_with_caveats`
- blocker categories:
  - `medication_reconciliation`
  - `follow_up_and_referrals`
  - `patient_education`

### Acceptance Criteria

Create:

- `docs/scenario-evidence-table.md`
- `output/eval/latest/scenario-pack-results.json`

The table should show:

| Scenario | Structured baseline | Narrative result | Final status | What it proves |
| --- | --- | --- | --- | --- |

## Wave 5 — Safety Invariants

### Goal

Make healthcare feasibility explicit.

### Tasks

Add visible safety invariants:

1. `no_uncited_escalation`
2. `no_ready_with_active_hidden_blocker`
3. `manual_review_on_uncertainty`
4. `duplicate_signal_suppression`
5. `structured_baseline_preserved`

### Acceptance Criteria

For every main packet:

- invariant statuses are visible
- failures force conservative output
- missing narrative does not fabricate escalation
- Clinical Intelligence errors require manual review
- duplicate hidden risks are not double-counted

## Wave 6 — Release Gate Reliability

### Goal

Make validation commands trustworthy.

### Tasks

- Fix any smoke process lifecycle hang.
- Ensure runtime boot smoke exits cleanly.
- Ensure no orphaned processes remain.
- Add cleanup traps/timeouts if needed.
- Re-run targeted and full package tests.

### Acceptance Criteria

- Discharge Gatekeeper package test completes or has documented fallback commands.
- Clinical Intelligence tests pass.
- A2A orchestrator tests pass.
- Full system validation report is clean.
- No background processes are left after test completion.

## Wave 7 — Judge-Facing Submission Package

### Goal

Make the project feel inevitable.

### Tasks

Create/update:

- `docs/judge-brief.md`
- `docs/final-demo-script-phase9.md`
- `docs/safety-model.md`
- `docs/submission-story.md`
- README final pitch section

### Required Story

- Not a classifier.
- Not autonomous discharge.
- Evidence-chained transition control.
- Structured baseline plus narrative contradiction.
- Prompt Opinion-native.
- MCP/A2A architecture.
- Safety bounded.
- Actionable for clinician review.

### Acceptance Criteria

A judge can explain the product in one sentence:

> It catches the hidden note contradiction that turns a discharge-ready chart into an unsafe transition.

## Final Definition of Done

Phase 9 is done when:

1. Baseline proof is green and reproducible.
2. Transition Safety Packet is implemented/surfaced.
3. Prompt 2 is the strongest demo moment.
4. Prompt 3 is compact and stable.
5. Controls/ablation are packaged.
6. Safety invariants are visible.
7. Submission copy is honest about primary live lane and A2A proof.
8. Final demo can be recorded in under 3 minutes.
9. No overclaiming, sprawl, or custom frontend exists.
