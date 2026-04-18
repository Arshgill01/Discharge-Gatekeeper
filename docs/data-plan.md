# Data Plan

## Goal
Create one canonical synthetic patient that makes the Care Transitions Command architecture necessary, credible, and demoable.

The canonical patient for phase 0 is locked in:
- `docs/phase0-trap-patient-spec.md`

## Data-design law
The patient must support this exact sequence:
1. structured data alone suggests discharge is acceptable
2. narrative evidence reveals a contradiction
3. the final system answer changes because of that contradiction

If the data does not force that sequence, it is the wrong patient.

## What the canonical patient must prove
- Discharge Gatekeeper MCP can build a deterministic structured posture
- Clinical Intelligence MCP has real work to do
- the external A2A orchestrator has a meaningful fusion job
- the 3-prompt demo stays legible

## Structured data requirements
The structured layer should be intentionally clean enough to support a provisional `ready` posture.

Minimum structured resources:
- `Patient`
- `Encounter`
- `Condition`
- `Observation`
- `MedicationRequest`
- `Appointment`
- optional `ServiceRequest`

Structured design rules:
- stable resting vitals
- no obvious pending diagnostics blocker
- medications appear discharge-ready
- follow-up appears scheduled
- no structured field should trivially expose the hidden risk

## Note and document requirements
The note bundle is where the trap lives.

Minimum note set:
1. hospitalist or discharge progress note that supports discharge
2. therapy or respiratory note that is incomplete or reassuring in a narrow way
3. one hidden-risk note that clearly contradicts the structured posture
4. optional case-management addendum that reinforces the contradiction

Narrative design rules:
- the contradiction must be explicit
- at least one note must materially change the verdict
- the hidden-risk note must be explainable aloud in one sentence
- the notes should not read like an eval answer key

## Canonical contradiction pattern
Use this pattern for the phase-0 patient:
- resting structured picture says discharge looks acceptable
- hidden note says exertional instability appears in real movement
- hidden note also exposes a home oxygen or home-support failure the structured view does not show

This creates a believable multi-source blocker cluster without making the case melodramatic.

## Expected blocker outcome
The canonical trap patient should end with these active blocker categories:
- `clinical_stability`
- `equipment_and_transport`
- `home_support_and_services`

The structured-only posture before narrative escalation should remain:
- `ready`

The final fused posture after contradiction review should be:
- `not_ready`

## Artifact requirements
The same patient must support:
- a contradiction summary
- a prioritized next-step checklist
- a clinician handoff brief
- patient-facing hold/discharge instructions

## Out of scope for phase 0
- a large scenario zoo
- custom FHIR breadth beyond the high-value resources
- obscure clinical edge cases
- synthetic data that requires long bedside explanation

## Later-phase expansion rule
Additional scenarios can come later for eval breadth.
They must not replace the canonical trap patient as the primary demo anchor.
