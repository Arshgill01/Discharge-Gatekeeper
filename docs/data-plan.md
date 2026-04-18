# Data Plan

## Goal
Create one synthetic patient scenario that makes the discharge-readiness story obvious, realistic, and demo-friendly.

## Design principles
- One patient is enough for the first demo.
- Use 3 to 4 meaningful blockers.
- Make at least one blocker visible only in notes, not just structured data.
- Keep the case easy to explain in a sentence.

## Recommended first patient
A medically improving patient who looks close to discharge, but still has hidden transition blockers.

### Suggested shape
- adult patient
- recent hospitalization for a condition that plausibly requires follow-up and medication changes
- one unresolved clinical/logistical issue
- one medication or education issue
- one follow-up/referral issue
- one home support or equipment issue

## Example blocker mix
- home oxygen need not fully coordinated
- medication reconciliation mismatch between active meds and note plan
- follow-up referral not yet scheduled
- patient education or home support gap documented in case-management note

## Minimum structured data
Start with a minimal but credible set:
- Patient
- Encounter
- Condition
- Observation
- MedicationRequest or MedicationStatement
- AllergyIntolerance if useful
- ServiceRequest or Appointment if available

Do not try to model the entire hospitalization.

## Minimum note set
At minimum:
1. progress note
2. case-management or discharge-planning note
3. medication or discharge instruction note

Optional:
- consult note
- nursing note
- referral note

## Evidence strategy
Each blocker should be discoverable from one or more sources:
- structured FHIR signal
- note/document evidence

This is important because the demo should clearly show that the agent is synthesizing across data types.

## Artifact strategy
Prepare at least:
- one clinician-facing handoff summary
- one patient-facing discharge instruction draft

Both should be grounded in the same patient scenario.

## Data realism rules
- keep language believable
- avoid overdramatic pathology
- avoid obscure conditions that require too much explanation
- avoid unrealistic all-in-one notes that make the task too easy

## First-slice target
The first data pack is done when a tool can confidently produce:
- one verdict
- three to four blockers
- one next-step plan
- one patient-facing artifact

## Regression expansion (v2/v3)
Keep the primary demo scenario as the default.
Add a small canonical scenario pack that covers all verdict states without turning into a large fixture zoo:
- `second_synthetic_discharge_slice_ready_with_caveats_v1`: `ready_with_caveats`; proves caveat handling without high-priority blockers; expected triggered categories are `follow_up_and_referrals`, `patient_education`, `equipment_and_transport`, `administrative_and_documentation`
- `third_synthetic_discharge_slice_ready_v1`: `ready`; proves the workflow can clear all blockers in a believable discharge-ready case; expected triggered categories are none

Evidence-mix rule for the expanded pack:
- across the three canonical scenarios, structured data, notes, and documents should all matter
- at least one non-primary scenario should use document evidence, not only note text
- ambiguity, contradiction, and insufficient-evidence fixtures stay in the robustness lane and do not replace the three success scenarios
