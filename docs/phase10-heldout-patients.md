# Phase 10 Held-Out Patient Strategy

## Purpose

Maria Alvarez alone is not enough.

The final system must prove it can run on multiple FHIR-shaped patients and not just a handcrafted canonical trap.

## Strategy

Use Maria as a regression patient.

Use Daniel Brooks as the final held-out demo patient.

Use Eleanor Singh as a functional/cognitive hidden-risk case.

Use Olivia Chen as a clean control.

## Why Daniel Should Be the Final Demo Patient

Maria is powerful but too central to the project history. A judge could assume Maria was overfit.

Daniel Brooks should be introduced as:

> “This is a separate FHIR-seeded patient used for first-pass demo validation. Maria remains the regression case.”

Daniel demonstrates different risks:

- medication access
- heart failure symptom change
- home monitoring
- caregiver logistics

This avoids the oxygen/stairs/COPD overfit smell.

## Daniel Brooks — Detailed Scenario

### Patient

```text
Name: Daniel Brooks
Age: 67
Admission: acute decompensated heart failure
Planned discharge: home
```

### Structured Baseline

The structured EHR snapshot appears discharge-ready:

```text
- vitals stable enough for discharge
- creatinine improved / acceptable
- oral diuretic plan entered
- cardiology follow-up scheduled
- discharge medication list complete
- low-sodium and daily-weight instructions marked complete
- baseline structured verdict: ready
```

### Hidden Narrative Evidence

Pharmacy note:

```text
18:15 — Patient cannot afford sacubitril/valsartan refill; prior authorization pending until Monday. Patient reports only two days of old medication at home.
```

Nursing note:

```text
18:40 — Patient gained 1.8 kg from morning weight and reports orthopnea when lying flat after hallway walk. Patient says home scale is broken.
```

Case management note:

```text
19:05 — Daughter can drive patient home but cannot pick up medications tonight. Local pharmacy closes in 30 minutes.
```

### Expected Initial Output

```text
structured_baseline: ready
hidden_risk_result: hidden_risk_present
final_status: not_ready or ready_with_caveats
blocking categories:
- medication_access
- clinical_stability
- home_monitoring
- patient_education / follow_up
```

### Expected FHIR Tasks

```text
Task 1 — Medication access
Owner: pharmacist / case manager
ReasonReference: MedicationRequest/daniel-sacubitril-valsartan or DocumentReference/daniel-pharmacy-note-1815
Need: bridge supply, substitution, prior auth resolution, or meds delivered to bedside

Task 2 — Clinical reassessment
Owner: covering clinician / bedside RN
ReasonReference: Observation/daniel-weight-evening or DocumentReference/daniel-nursing-note-1840
Need: reassess weight gain and orthopnea before discharge

Task 3 — Home monitoring
Owner: care team / case manager
ReasonReference: DocumentReference/daniel-nursing-note-1840
Need: working scale or alternative daily weight monitoring plan

Task 4 — Teach-back / instructions
Owner: bedside RN / care team
ReasonReference: CarePlan/daniel-discharge-plan
Need: updated heart-failure return precautions and teach-back
```

### Resolution Update

Pharmacy update:

```text
20:10 — Seven-day medication bridge approved and delivered to bedside.
```

RN reassessment:

```text
20:25 — Repeat weight stable from 18:40. Patient denies dyspnea sitting upright but still reports orthopnea when flat.
```

Case management update:

```text
20:40 — Daughter purchased a scale and confirms she can check daily weights for first three days.
```

### Expected Re-Arbitration

```text
Medication access gate: resolved
Home monitoring gate: resolved
Clinical stability gate: still needs clinician sign-off because orthopnea persists
Updated status: ready_with_caveats or not_ready under conservative policy
```

Important:

The system should not magically clear all gates just because some tasks resolved.

## Eleanor Singh — Detailed Scenario

### Patient

```text
Name: Eleanor Singh
Age: 81
Admission: fall with minor head injury
Planned discharge: home with walker
```

### Structured Baseline

```text
- CT head negative
- vitals stable
- PT clearance checkbox marked complete
- walker ordered
- follow-up scheduled
- baseline verdict: ready
```

### Hidden Narrative Evidence

PT addendum:

```text
16:50 — Patient required two-person assist on stairs after fatigue and forgot walker precautions twice during session.
```

Nursing note:

```text
17:20 — Patient attempted to get out of bed unassisted twice and could not accurately repeat fall-prevention instructions.
```

Case management note:

```text
17:45 — Son listed as overnight support is out of town until tomorrow evening.
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
```

### Expected FHIR Tasks

```text
- repeat mobility/stair assessment
- confirm walker/DME and safe transfer plan
- repeat fall-prevention teach-back
- confirm overnight support or alternate disposition
```

## Olivia Chen — Detailed Scenario

### Patient

```text
Name: Olivia Chen
Age: 59
Admission: uncomplicated cellulitis
Planned discharge: home
```

### Structured Baseline

```text
- afebrile
- WBC improving
- oral antibiotics tolerated
- follow-up scheduled
- home support available
- baseline verdict: ready
```

### Reassuring Notes

```text
- nursing note confirms independent ambulation
- pharmacy confirms antibiotics delivered to bedside
- patient teach-back successful
- return precautions understood
- spouse available overnight
```

### Expected Output

```text
structured_baseline: ready
hidden_risk_result: no_hidden_risk
final_status: ready
blocking Tasks written: none
```

## Maria Alvarez — Upgrade Notes

Maria should be upgraded to support FHIR write-back and re-arbitration.

Initial hidden risks:

```text
- exertional SpO2 82%
- oxygen delivery delayed
- daughter unavailable overnight
```

Initial Tasks:

```text
- repeat exertional oxygen assessment
- confirm oxygen delivery
- confirm overnight support / alternate disposition
```

Resolution sequence:

```text
1. oxygen delivery confirmed
   → equipment gate resolved
   → status still not_ready

2. exertional reassessment stable with prescribed oxygen
   → clinical gate conditionally resolved
   → status still not_ready if support missing

3. daughter confirms overnight support
   → support gate resolved
   → status ready_with_caveats pending clinician sign-off
```

## Demo Recommendation

Final video should use:

```text
Daniel Brooks as the primary “first-pass” FHIR patient.
Maria Alvarez as proof/regression.
Olivia Chen as clean control.
```

If time is short, do not demo all patients live. Show Daniel live, then show scenario matrix for Maria/Eleanor/Olivia.
