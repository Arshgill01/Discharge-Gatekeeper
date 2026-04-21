# Care Transitions Command Test Upload Bundle

## Purpose
This is a synthetic narrative evidence packet for Prompt Opinion testing with seeded patient:
- Name: `Lane844 Carroll471`
- Sex: `male`
- Age: `18`
- DOB: `2007-07-19`

Design target:
1. Structured baseline appears discharge-ready.
2. Narrative contradiction introduces hidden risk.
3. Final posture should escalate to `not_ready`.

Expected impacted blocker categories:
- `clinical_stability`
- `equipment_and_transport`
- `home_support_and_services`

## Structured-baseline context (for contradiction framing)
- Admission reason: `acute asthma exacerbation, improving`
- Planned disposition before narrative escalation: `home`
- Resting status near discharge: afebrile, speaking full sentences, resting `SpO2 95%` on room air
- Discharge meds appear prepared in chart
- Outpatient follow-up appears scheduled

## Narrative Evidence Bundle

### Source 1
- `source_id`: `note-hm-001`
- `source_type`: `hospitalist_note`
- `source_label`: `Hospitalist Progress Note 2026-04-20 08:15`
- `locator`: `assessment-and-plan`
- `timestamp`: `2026-04-20T08:15:00-05:00`
- `excerpt`:
`Breathing significantly improved overnight. Resting oxygen saturation remains 95-96% on room air. If stable this afternoon, patient may discharge home with inhaler plan and close follow-up.`

### Source 2
- `source_id`: `note-rt-001`
- `source_type`: `respiratory_therapy_note`
- `source_label`: `Respiratory Therapy Note 2026-04-20 10:05`
- `locator`: `resting-assessment`
- `timestamp`: `2026-04-20T10:05:00-05:00`
- `excerpt`:
`At-rest reassessment completed. SpO2 96% on room air, no active wheeze at rest. No oxygen requirement identified from resting check alone.`

### Source 3
- `source_id`: `note-pt-001`
- `source_type`: `physical_therapy_note`
- `source_label`: `Physical Therapy Note 2026-04-20 11:35`
- `locator`: `mobility-summary`
- `timestamp`: `2026-04-20T11:35:00-05:00`
- `excerpt`:
`Short hallway ambulation tolerated with brief rest. Extended stair challenge deferred at this session due to scheduling overlap.`

### Source 4 (canonical contradiction note)
- `source_id`: `note-rn-contradiction-001`
- `source_type`: `nursing_note`
- `source_label`: `Nursing Note 2026-04-20 20:40`
- `locator`: `full-note`
- `timestamp`: `2026-04-20T20:40:00-05:00`
- `excerpt`:
`Pre-discharge walk and stair trial repeated at patient request. SpO2 95% on room air at rest, dropped to 84% on room air after approximately 30 feet and one flight of stairs. Patient became visibly dyspneic and needed seated recovery. Patient stated, "I do not have oxygen equipment at home tonight and no one can stay with me overnight." Case management contacted during note: oxygen vendor unable to deliver concentrator until tomorrow morning. Patient reports home setup requires climbing stairs to bedroom. Covering resident notified; discharge hold recommended pending reassessment and confirmed safe home setup.`

### Source 5 (reinforcement)
- `source_id`: `note-cm-001`
- `source_type`: `case_management_note`
- `source_label`: `Case Management Addendum 2026-04-20 20:55`
- `locator`: `summary`
- `timestamp`: `2026-04-20T20:55:00-05:00`
- `excerpt`:
`Confirmed home oxygen delivery cannot be completed tonight; earliest delivery window is tomorrow morning. Family overnight support unavailable. No alternate caregiver confirmed for first night after discharge.`

### Source 6 (irrelevant detail for suppression check)
- `source_id`: `note-noncritical-001`
- `source_type`: `nursing_note`
- `source_label`: `Nursing Noncritical Addendum 2026-04-20 21:05`
- `locator`: `patient-request`
- `timestamp`: `2026-04-20T21:05:00-05:00`
- `excerpt`:
`Patient requested school excuse letter and asked when gym activity can resume. Snack preference updated in chart.`

## Expected contradiction summary (phase-4 target)
Structured picture suggests readiness based on resting stability, but narrative evidence shows exertional desaturation with stairs plus no overnight oxygen delivery and no overnight support, making discharge home tonight unsafe.

## Optional JSON payload (direct use in A2A `patient_context`)
```json
{
  "scenario_id": "third_synthetic_discharge_slice_ready_v1",
  "patient_id": "lane844-carroll471",
  "encounter_id": "enc-lane844-carroll471-001",
  "narrative_evidence_bundle": [
    {
      "source_id": "note-hm-001",
      "source_type": "hospitalist_note",
      "source_label": "Hospitalist Progress Note 2026-04-20 08:15",
      "locator": "assessment-and-plan",
      "timestamp": "2026-04-20T08:15:00-05:00",
      "excerpt": "Breathing significantly improved overnight. Resting oxygen saturation remains 95-96% on room air. If stable this afternoon, patient may discharge home with inhaler plan and close follow-up."
    },
    {
      "source_id": "note-rt-001",
      "source_type": "respiratory_therapy_note",
      "source_label": "Respiratory Therapy Note 2026-04-20 10:05",
      "locator": "resting-assessment",
      "timestamp": "2026-04-20T10:05:00-05:00",
      "excerpt": "At-rest reassessment completed. SpO2 96% on room air, no active wheeze at rest. No oxygen requirement identified from resting check alone."
    },
    {
      "source_id": "note-pt-001",
      "source_type": "physical_therapy_note",
      "source_label": "Physical Therapy Note 2026-04-20 11:35",
      "locator": "mobility-summary",
      "timestamp": "2026-04-20T11:35:00-05:00",
      "excerpt": "Short hallway ambulation tolerated with brief rest. Extended stair challenge deferred at this session due to scheduling overlap."
    },
    {
      "source_id": "note-rn-contradiction-001",
      "source_type": "nursing_note",
      "source_label": "Nursing Note 2026-04-20 20:40",
      "locator": "full-note",
      "timestamp": "2026-04-20T20:40:00-05:00",
      "excerpt": "Pre-discharge walk and stair trial repeated at patient request. SpO2 95% on room air at rest, dropped to 84% on room air after approximately 30 feet and one flight of stairs. Patient became visibly dyspneic and needed seated recovery. Patient stated, \"I do not have oxygen equipment at home tonight and no one can stay with me overnight.\" Case management contacted during note: oxygen vendor unable to deliver concentrator until tomorrow morning. Patient reports home setup requires climbing stairs to bedroom. Covering resident notified; discharge hold recommended pending reassessment and confirmed safe home setup."
    },
    {
      "source_id": "note-cm-001",
      "source_type": "case_management_note",
      "source_label": "Case Management Addendum 2026-04-20 20:55",
      "locator": "summary",
      "timestamp": "2026-04-20T20:55:00-05:00",
      "excerpt": "Confirmed home oxygen delivery cannot be completed tonight; earliest delivery window is tomorrow morning. Family overnight support unavailable. No alternate caregiver confirmed for first night after discharge."
    },
    {
      "source_id": "note-noncritical-001",
      "source_type": "nursing_note",
      "source_label": "Nursing Noncritical Addendum 2026-04-20 21:05",
      "locator": "patient-request",
      "timestamp": "2026-04-20T21:05:00-05:00",
      "excerpt": "Patient requested school excuse letter and asked when gym activity can resume. Snack preference updated in chart."
    }
  ],
  "optional_context_metadata": {
    "care_setting": "inpatient",
    "discharge_destination": "home",
    "explicit_task_goal": "Detect hidden narrative contradiction affecting discharge safety and preserve citeable evidence."
  }
}
```
