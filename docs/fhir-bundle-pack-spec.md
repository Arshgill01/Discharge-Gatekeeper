# FHIR Bundle Pack Spec

## Purpose

The FHIR Bundle Pack turns Care Transitions Command from a synthetic prompt fixture system into a FHIR-grounded discharge intelligence system.

The bundle pack must prove:

1. the system can ingest FHIR-shaped data,
2. the system is not hardcoded to Maria,
3. hidden risks can appear across multiple transition domains,
4. clean controls do not falsely escalate,
5. FHIR resource IDs are preserved into the evidence ledger.

## General Bundle Requirements

Each patient should be represented as a FHIR R4 transaction Bundle or loadable resource set.

Recommended structure:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:...",
      "resource": {},
      "request": {
        "method": "PUT",
        "url": "Patient/<stable-id>"
      }
    }
  ]
}
```

Use deterministic IDs where possible. Examples:

```text
Patient/maria-alvarez
Encounter/maria-discharge-2026-0418
Observation/maria-spo2-rest
DocumentReference/maria-nursing-note-2040
Task/maria-discharge-block-clinical
```

## Required Resource Types

Use a coherent subset of:

- `Patient`
- `Encounter`
- `Condition`
- `Observation`
- `MedicationRequest`
- `ServiceRequest`
- `CarePlan`
- `DocumentReference`
- `PractitionerRole`
- `Task`
- `Provenance`
- `AuditEvent`

## Narrative Evidence Representation

For hidden-risk notes, prefer `DocumentReference` with:

- stable ID
- subject reference
- encounter/context reference if supported
- date
- type/category text
- note text either in:
  - `description`
  - `content.attachment.title`
  - `content.attachment.data` base64 text
  - project-supported extension/field if already used

The ingestion code must be able to extract narrative text deterministically from the chosen representation.

## Patient 1 — Maria Alvarez

### Purpose

Canonical regression patient.

### Clinical Theme

COPD/oxygen/stair/home-support discharge failure.

### Structured Baseline

Should appear discharge-ready:

- resting SpO2 stable enough at rest
- medications reconciled
- follow-up scheduled
- discharge plan prepared
- no structured pending diagnostic hold

### Hidden Contradiction

Late evidence reveals:

- exertional desaturation
- stairs/home environment risk
- oxygen delivery delayed
- daughter/overnight support unavailable

### Suggested Resources

```text
Patient/maria-alvarez
Encounter/maria-discharge-2026-0418
Condition/maria-copd
Observation/maria-spo2-rest
Observation/maria-spo2-exertion
MedicationRequest/maria-inhaler
ServiceRequest/maria-home-oxygen
CarePlan/maria-discharge-plan-morning
DocumentReference/maria-nursing-note-2040
DocumentReference/maria-case-mgmt-2055
PractitionerRole/bedside-rn
PractitionerRole/case-manager
PractitionerRole/covering-clinician
```

### Expected Initial Output

```text
structured_baseline: ready
hidden_risk_result: hidden_risk_present
final_status: not_ready
blocking categories:
- clinical_stability
- equipment_and_transport
- home_support_and_services
Tasks written:
- clinical reassessment / exertional oxygen assessment
- oxygen delivery / DME confirmation
- overnight support / alternate disposition
```

### Expected Re-Arbitration

Partial task completion should not clear discharge.

Only when required clinical, equipment, and support gates are resolved should the status move to `ready_with_caveats` or the configured conservative status.

## Patient 2 — Daniel Brooks

### Purpose

Held-out demo patient.

Daniel should be the preferred final video patient because he is not the canonical Maria trap.

### Clinical Theme

Heart failure transition risk involving medication access, late symptom change, and home monitoring.

### Structured Baseline

Appears discharge-ready:

- vitals stable enough
- oral diuretic plan entered
- cardiology follow-up scheduled
- medication list complete
- low-sodium / daily weight instructions marked complete

### Hidden Contradiction

Late narrative evidence reveals:

- key heart failure medication cannot be obtained tonight
- prior authorization or bridge supply unresolved
- new orthopnea or weight gain after hallway walk
- home scale unavailable or broken
- caregiver cannot pick up meds tonight

### Suggested Resources

```text
Patient/daniel-brooks
Encounter/daniel-discharge-2026-0419
Condition/daniel-heart-failure
Observation/daniel-weight-morning
Observation/daniel-weight-evening
Observation/daniel-blood-pressure
MedicationRequest/daniel-sacubitril-valsartan
MedicationRequest/daniel-furosemide
CarePlan/daniel-discharge-plan
DocumentReference/daniel-pharmacy-note-1815
DocumentReference/daniel-nursing-note-1840
DocumentReference/daniel-case-mgmt-note-1905
PractitionerRole/pharmacist
PractitionerRole/bedside-rn
PractitionerRole/case-manager
PractitionerRole/covering-clinician
```

### Expected Initial Output

```text
structured_baseline: ready
hidden_risk_result: hidden_risk_present
final_status: not_ready or ready_with_caveats under conservative policy
blocking categories:
- medication_access
- clinical_stability
- home_monitoring
- patient_education or follow_up
Tasks written:
- medication bridge / pharmacy access
- clinician reassessment for orthopnea/weight change
- home scale/monitoring plan
- patient/caregiver teach-back
```

### Expected Re-Arbitration

If medication bridge and home scale are resolved but orthopnea remains:

```text
updated_status: not_ready or ready_with_caveats
unresolved: clinical sign-off / symptom reassessment
```

This nuance is valuable. Do not magically clear all gates.

## Patient 3 — Eleanor Singh

### Purpose

Functional/cognitive/home-support hidden risk.

### Clinical Theme

Fall risk and mobility contradiction hidden in PT/nursing notes.

### Structured Baseline

Appears ready:

- CT head negative or no acute findings
- vitals stable
- PT clearance checkbox marked complete
- walker ordered
- follow-up scheduled
- discharge home planned

### Hidden Contradiction

Late notes reveal:

- required two-person assist on stairs after fatigue
- forgot walker precautions
- attempted unassisted bed exit
- could not repeat fall-prevention instructions
- planned overnight support unavailable

### Suggested Resources

```text
Patient/eleanor-singh
Encounter/eleanor-discharge-2026-0420
Condition/eleanor-fall
Observation/eleanor-vitals-stable
ServiceRequest/eleanor-walker-order
CarePlan/eleanor-discharge-plan
DocumentReference/eleanor-pt-addendum-1650
DocumentReference/eleanor-nursing-note-1720
DocumentReference/eleanor-case-mgmt-note-1745
PractitionerRole/physical-therapist
PractitionerRole/bedside-rn
PractitionerRole/case-manager
```

### Expected Output

```text
structured_baseline: ready
hidden_risk_result: hidden_risk_present
final_status: not_ready
blocking categories:
- mobility_safety
- patient_education
- home_support_and_services
Tasks written:
- repeat mobility/stair assessment
- fall-prevention teach-back
- overnight support/alternate disposition
```

## Patient 4 — Olivia Chen

### Purpose

Clean held-out control.

This patient is strategically important because it proves the system does not always escalate.

### Clinical Theme

Uncomplicated cellulitis discharge.

### Structured Baseline

Ready:

- afebrile
- WBC improving
- oral antibiotics tolerated
- follow-up scheduled
- home support available

### Narrative Notes

Reassuring:

- ambulating independently
- antibiotics delivered to bedside
- teach-back successful
- return precautions understood
- support available

### Suggested Resources

```text
Patient/olivia-chen
Encounter/olivia-discharge-2026-0421
Condition/olivia-cellulitis
Observation/olivia-temperature
Observation/olivia-wbc
MedicationRequest/olivia-oral-antibiotic
CarePlan/olivia-discharge-plan
DocumentReference/olivia-nursing-note
DocumentReference/olivia-pharmacy-note
DocumentReference/olivia-teachback-note
```

### Expected Output

```text
structured_baseline: ready
hidden_risk_result: no_hidden_risk
final_status: ready
blocking Tasks written: none
Provenance/AuditEvent: assessment may be logged, but no discharge-blocking Tasks
```

## Anti-Hardcoding Requirements

The implementation must not:

- branch on patient names,
- branch on exact resource IDs except inside tests,
- require Maria-specific oxygen/stair strings,
- assume every hidden risk is oxygen-related,
- treat every narrative note as a hidden risk,
- create Tasks without FHIR evidence references.

Tests should include:

- Maria hidden risk,
- Daniel hidden risk,
- Eleanor hidden risk,
- Olivia clean control,
- missing/inconclusive narrative,
- duplicate signal suppression.

## Eval Matrix Columns

Generated scenario/eval output should include:

| Patient | FHIR Bundle | Structured Baseline | Narrative Result | Final Status | Tasks Written | Provenance Written | AuditEvents Written | What It Proves |
|---|---|---:|---:|---:|---:|---:|---:|---|
