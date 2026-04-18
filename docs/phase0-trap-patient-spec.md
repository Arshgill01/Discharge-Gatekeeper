# Phase 0 Trap Patient Spec

## Purpose
This is the canonical phase-0 demo patient for Care Transitions Command.
It is designed to force the core product sequence:
1. structured evidence alone suggests discharge is acceptable
2. a hidden note contradiction reveals the real risk
3. the final system answer changes to `not_ready`

This is a spec artifact, not a loose scenario sketch.

## Canonical patient identity
- Patient name: `Maria Alvarez`
- Age: `74`
- Sex: `female`
- Language: `English and Spanish`
- Living situation: `lives alone in a third-floor walk-up apartment`
- Support situation: `daughter normally checks in after work but is unavailable overnight today`
- Admission reason: `COPD exacerbation with resolving community-acquired pneumonia`
- Planned disposition before note escalation: `home`

## Why this patient is the trap
The structured discharge picture is intentionally reassuring:
- resting vitals are stable
- oxygen saturation is acceptable at rest
- oral medications are in place
- follow-up appears scheduled
- no obvious pending diagnostic blocker is present

The trap is that the real risk does not appear in the structured snapshot.
It appears in a late nursing note that documents exertional desaturation plus failed home oxygen logistics and no overnight support.

## Expected structured posture before unstructured escalation
Discharge Gatekeeper MCP should be able to reach this provisional posture from structured evidence alone:
- verdict: `ready`
- high-severity blockers: `none`
- rationale: resting stability, discharge medications ready, follow-up in place, no structured pending diagnostic signal

This posture must be visible in the demo.

## Expected final posture after contradiction review
After Clinical Intelligence MCP reviews the note bundle and the external A2A orchestrator fuses the evidence, the final posture should be:
- verdict: `not_ready`
- active blocker categories:
  - `clinical_stability`
  - `equipment_and_transport`
  - `home_support_and_services`

## Core contradiction
The contradiction is:
- structured view: patient is stable on room air at rest and appears ready for discharge home
- note evidence: patient desaturates with actual stair ambulation, does not have home oxygen available tonight, and has no overnight support in a third-floor walk-up

This contradiction matters because discharge home today would rely on a false assumption: that resting stability in the chart is enough to make home discharge safe.

## Structured FHIR-like picture

### Patient
- `id`: `phase0-trap-maria-alvarez`
- `name`: `Maria Alvarez`
- `dob`: `1951-08-14`
- `sex`: `female`
- `preferred_language`: `en`, `es`
- `address_summary`: `third-floor walk-up apartment`

### Encounter
- `id`: `enc-phase0-trap-001`
- `class`: `inpatient`
- `admit_datetime`: `2026-04-15T09:20:00-05:00`
- `expected_discharge_datetime`: `2026-04-18T16:00:00-05:00`
- `service`: `hospital medicine`

### Active conditions
- `COPD exacerbation`, improving
- `community-acquired pneumonia`, resolving
- `hypertension`, stable

### Latest structured observations

| Field | Value |
| --- | --- |
| Temperature | `36.8 C` |
| Heart rate | `84 bpm` |
| Blood pressure | `128/74` |
| Respiratory rate | `18/min` |
| SpO2 at rest | `94% on room air` |
| WBC | `9.1 K/uL`, down from admission |
| Creatinine | `0.9 mg/dL`, at baseline |

Structured interpretation:
- stable enough to look discharge-ready
- no structured field alone should expose the trap

### Medication requests at planned discharge
- prednisone taper
- albuterol inhaler as needed
- tiotropium daily
- finish oral antibiotic course
- resume home lisinopril

Medication picture:
- appears reconciled
- no obvious medication blocker in the structured snapshot

### Follow-up and orders
- PCP follow-up scheduled within 7 days
- pulmonology follow-up scheduled within 5 days
- no structured pending diagnostic hold
- no structured DME fulfillment confirmation captured in the canonical phase-0 snapshot

## Note bundle

### Note 1: hospitalist progress note
- `note_id`: `note-hm-001`
- `timestamp`: `2026-04-18T08:10:00-05:00`
- role in scenario: supports planned discharge

Summary:
`Breathing improved. Afebrile. Tolerating oral meds. Likely discharge home later today if remains stable on room air. Follow-up arranged.`

### Note 2: respiratory therapy note
- `note_id`: `note-rt-001`
- `timestamp`: `2026-04-18T10:00:00-05:00`
- role in scenario: reassuring but incomplete

Summary:
`Maintains SpO2 94% on room air at rest. No home oxygen requirement documented from resting assessment alone.`

Why it matters:
- this note is technically true
- it reinforces the structured posture
- it does not test the actual home challenge

### Note 3: physical therapy note
- `note_id`: `note-pt-001`
- `timestamp`: `2026-04-18T11:30:00-05:00`
- role in scenario: mildly reassuring, still incomplete

Summary:
`Ambulated short hallway distance with standby assist. Stair tolerance not fully assessed during earlier session.`

Why it matters:
- this note does not contradict discharge
- it leaves a gap that the hidden-risk note later closes

### Note 4: hidden-risk nursing note
- `note_id`: `note-rn-contradiction-001`
- `timestamp`: `2026-04-18T20:40:00-05:00`
- role in scenario: canonical contradiction source

Exact note content:

```text
Pre-discharge hallway walk and stair trial repeated at patient request. O2 sat 94% on room air at rest, dropped to 82% on room air after approximately 20 feet and 6 stairs. Patient became visibly dyspneic and had to sit down. Patient stated, "I do not have oxygen at home tonight and my daughter cannot stay." Case management called during note: oxygen vendor cannot deliver concentrator until tomorrow morning. Patient lives alone on third-floor walk-up with 18 stairs. Covering resident notified; recommend discharge hold pending reassessment.
```

Why this is the exact hidden-risk note:
- it directly contradicts the structured resting picture
- it creates a clinical stability blocker
- it creates an equipment-and-transport blocker
- it creates a home-support blocker
- it is explainable aloud in one sentence

### Optional reinforcing note 5: case-management addendum
- `note_id`: `note-cm-001`
- `timestamp`: `2026-04-18T20:55:00-05:00`
- role in scenario: reinforcement, not required for the contradiction to exist

Summary:
`Confirmed home oxygen delivery delayed until tomorrow morning. Daughter unavailable overnight. Patient does not have alternate caregiver for first night home.`

## Why the contradiction matters
Without the hidden-risk note, the system would treat discharge as acceptable.
With the hidden-risk note, discharge home tonight becomes unsafe because:
- the patient is not functionally stable for the home environment
- the required oxygen support is not available
- the patient lacks overnight support for a third-floor walk-up return

This is exactly the kind of failure mode Care Transitions Command is meant to catch.

## Expected system behavior by component

### Discharge Gatekeeper MCP
Expected output posture before note escalation:
- `ready`

Expected structured explanation:
- patient stable at rest
- discharge meds in place
- follow-up in place
- no structured pending diagnostic blocker

### Clinical Intelligence MCP
Expected finding:
- narrative contradiction between resting stability and stair ambulation reality
- hidden-risk escalation based on note-backed evidence

Expected impacted blockers:
- `clinical_stability`
- `equipment_and_transport`
- `home_support_and_services`

### external A2A orchestrator
Expected fusion behavior:
- preserve the visible structured posture
- show why the final answer changed
- return final `not_ready`
- carry the contradiction into the transition package

## Expected transition posture
The final next-step package should include actions like:
- hold discharge tonight
- reassess oxygen requirement with exertion-aware review
- confirm home oxygen delivery or alternate safe disposition
- confirm overnight support before discharge home

These are examples of the action shape, not a runtime contract.

## Out-of-scope details
Do not overload this patient with:
- extra dramatic pathology
- unrelated specialty complexity
- too many parallel blockers
- note text that reads like a synthetic benchmark label

The point is one clean contradiction that changes the discharge decision.
