import { A2ATaskInput } from "../types";

export const TRAP_PATIENT_TASK_INPUT: A2ATaskInput = {
  prompt: "Is this patient safe to discharge today?",
  patient_context: {
    scenario_id: "third_synthetic_discharge_slice_ready_v1",
    patient_id: "phase0-trap-maria-alvarez",
    encounter_id: "enc-phase0-trap-001",
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
  },
};

export const CONTROL_TASK_INPUT: A2ATaskInput = {
  prompt: "Is this patient safe to discharge today?",
  patient_context: {
    scenario_id: "third_synthetic_discharge_slice_ready_v1",
    patient_id: "phase0-control-001",
    encounter_id: "enc-phase0-control-001",
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
  },
};
