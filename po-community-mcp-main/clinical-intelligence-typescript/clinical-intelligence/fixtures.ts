import { HiddenRiskInput } from "./contract";

export const PHASE0_TRAP_PATIENT_INPUT: HiddenRiskInput = {
  deterministic_snapshot: {
    patient_id: "phase0-trap-maria-alvarez",
    encounter_id: "enc-phase0-trap-001",
    baseline_verdict: "ready",
    deterministic_blockers: [],
    deterministic_evidence: [
      {
        evidence_id: "det_001",
        source_label: "Structured resting vitals",
        detail: "SpO2 94% on room air at rest, vitals stable.",
      },
    ],
    deterministic_next_steps: [
      "Proceed with home discharge checklist if no new blockers emerge.",
    ],
    deterministic_summary:
      "Structured discharge snapshot is reassuring at rest with medications and follow-up arranged.",
  },
  narrative_evidence_bundle: [
    {
      source_id: "note-hm-001",
      source_type: "hospitalist_note",
      source_label: "Hospitalist Progress Note 2026-04-18 08:10",
      locator: "summary",
      timestamp: "2026-04-18T08:10:00-05:00",
      excerpt:
        "Breathing improved. Afebrile. Tolerating oral meds. Likely discharge home later today if remains stable on room air.",
    },
    {
      source_id: "note-rn-contradiction-001",
      source_type: "nursing_note",
      source_label: "Nursing Note 2026-04-18 20:40",
      locator: "full note",
      timestamp: "2026-04-18T20:40:00-05:00",
      excerpt:
        "O2 sat dropped to 82% on room air after approximately 20 feet and 6 stairs. Patient became visibly dyspneic. Patient stated, \"I do not have oxygen at home tonight and my daughter cannot stay.\" Oxygen vendor cannot deliver concentrator until tomorrow morning. Patient lives alone on third-floor walk-up with 18 stairs.",
    },
    {
      source_id: "note-cm-001",
      source_type: "case_management_note",
      source_label: "Case Management Addendum 2026-04-18 20:55",
      locator: "summary",
      timestamp: "2026-04-18T20:55:00-05:00",
      excerpt:
        "Confirmed home oxygen delivery delayed until tomorrow morning. Daughter unavailable overnight and no alternate caregiver for first night home.",
    },
  ],
  optional_context_metadata: {
    care_setting: "inpatient",
    discharge_destination: "home",
    explicit_task_goal: "Detect hidden narrative contradiction affecting discharge safety.",
  },
};

export const NO_RISK_CONTROL_INPUT: HiddenRiskInput = {
  deterministic_snapshot: {
    patient_id: "phase0-control-001",
    encounter_id: "enc-phase0-control-001",
    baseline_verdict: "ready",
    deterministic_blockers: [],
    deterministic_evidence: [
      {
        evidence_id: "det_control_001",
        source_label: "Structured vitals and oxygen trend",
        detail: "Stable at rest and with ambulation.",
      },
    ],
    deterministic_next_steps: ["Finalize discharge paperwork and routine follow-up."],
    deterministic_summary:
      "Structured context supports discharge readiness with routine follow-up in place.",
  },
  narrative_evidence_bundle: [
    {
      source_id: "note-rn-control-001",
      source_type: "nursing_note",
      source_label: "Nursing Note 2026-04-18 19:00",
      locator: "summary",
      excerpt:
        "Patient ambulated hallway and stairs without desaturation. Oxygen saturation remained above 93% and no dyspnea observed.",
    },
    {
      source_id: "note-cm-control-001",
      source_type: "case_management_note",
      source_label: "Case Management Note 2026-04-18 19:15",
      locator: "summary",
      excerpt:
        "Home services and equipment confirmed; daughter available overnight and transport arranged.",
    },
  ],
  optional_context_metadata: {
    care_setting: "inpatient",
    discharge_destination: "home",
    explicit_task_goal: "Confirm there is no narrative-only hidden risk.",
  },
};
