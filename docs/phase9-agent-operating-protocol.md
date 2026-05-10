# Phase 9 Agent Operating Protocol

## Purpose

This protocol prevents agents from wasting time, corrupting the codebase, or claiming success after failed proofs.

The current priority is:

1. prove the baseline
2. fix the baseline if it fails
3. only then build Phase 9 product enhancements

Status on 2026-05-09:

- Baseline proof is complete under the visible Prompt Opinion standard.
- Phase 9 is unblocked by proof gates.
- Keep this protocol active for future reruns: if a later proof regresses, stop Phase 9 work and fix the baseline layer first.

## Non-Negotiable Rules

- Do not claim green unless run-folder evidence is green.
- Do not continue to later tests after an earlier required proof fails.
- Do not overclaim A2A browser status.
- Do not make speculative code changes without a failure hypothesis.
- Do not add a third MCP.
- Do not build a custom frontend.
- Do not add A2A streaming.
- Do not convert the project into broad hospital dashboarding.
- Do not make autonomous discharge claims.
- Do not make Prompt 3 verbose.

## Required Precheck

Before test execution:

1. Confirm branch and commit.
2. Confirm latest fixes are present.
3. Confirm local ports/services.
4. Confirm no stale runtime processes.
5. Confirm provider config and key presence.
6. Confirm public tunnel/path proxy when needed.
7. Confirm Prompt Opinion registration points to current URLs.
8. Write precheck report.

Precheck failure means no proof tests start.

## Test Sequence

### Test 1 — Direct-MCP Prompt Opinion proof

Required result:

- Prompt 1 final verdict `not_ready`
- structured baseline `ready`
- hidden-risk result `hidden_risk_present`
- Prompt 2 contradiction and evidence visible
- Prompt 3 compact transition package visible
- no timeout/cancelled banner
- required evidence anchors present
- runtime/MCP evidence captured

Failure means stop and fix Test 1 only.

### Test 2 — Combined baseline proof

Only after Test 1 passes.

Required result:

- Direct-MCP lane remains green
- A2A runtime/protocol proof completes
- both MCPs hit
- final clinical result correct
- lane status summary clear

Failure means stop and fix combined proof only.

### Test 3 — Fresh reproducibility combined proof

Only after Tests 1 and 2 pass.

Required result:

- clean fresh run folder
- restarted/verified services
- no stale artifacts
- combined proof passes again
- reproducible green status

Failure means stop and fix reproducibility only.

## Failure Protocol

For any failure:

1. Stop later tests.
2. Identify exact failure phase.
3. Collect logs and screenshots.
4. Compare expected vs actual behavior.
5. Write ExecPlan.
6. Make smallest evidence-backed fix.
7. Run focused validation.
8. Update status summary.

Failure categories:

- wrong branch/commit
- stale process
- wrong port
- ngrok/path proxy down
- Prompt Opinion registration stale
- provider/key mismatch
- Gemini/provider runtime error
- MCP hit missing
- A2A runtime hit missing
- response shape/content-type issue
- browser transcript not persisted
- timeout/cancelled after valid response
- clinical output incorrect
- evidence anchors missing
- output too verbose

## Phase 9 Entry

Only enter Phase 9 if:

- Test 1 passed
- Test 2 passed
- Test 3 passed
- final run folder proves reproducible green baseline

## Phase 9 Build Priorities

Build only in this order:

1. Transition Safety Packet
2. Evidence-first Prompt 2
3. Compact Prompt 3
4. Scenario evidence table
5. Safety invariants
6. Release-gate reliability
7. Judge-facing docs/submission polish

## Phase 9 Output Quality Bar

Outputs must be:

- evidence-cited
- concise
- structured
- clinically bounded
- owner/action/timing oriented
- visually readable in Prompt Opinion
- honest about uncertainty
- honest about lane status

## Core Product Language

Use:

> Care Transitions Command catches note-level contradictions that turn a discharge-ready chart into an unsafe transition, then produces an evidence-cited action package for clinician review.

Avoid:

> The AI predicts discharge.

Avoid:

> The AI decides discharge.

Avoid:

> The system autonomously clears the patient.

## Final Report Format

Every agent run must end with:

```text
Branch:
Commit:
Mode:
Precheck status:
Test 1 status:
Test 2 status:
Test 3 status:
Phase 9 entered:
Files changed:
Commands run:
Run folder:
Artifacts:
Failures:
Fixes:
Open risks:
Next recommended action:
```
