import { A2ATaskInput } from "../types";

const PROMPT_1 = "Is this patient safe to discharge today?";

export const TRAP_PATIENT_TASK_INPUT: A2ATaskInput = {
  prompt: PROMPT_1,
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

export const ABLATION_TASK_INPUT: A2ATaskInput = {
  prompt: PROMPT_1,
  patient_context: {
    scenario_id: "third_synthetic_discharge_slice_ready_v1",
    patient_id: "phase0-trap-maria-alvarez-ablation",
    encounter_id: "enc-phase0-trap-ablation-001",
    narrative_evidence_bundle: [
      {
        source_id: "note-hm-ablation-001",
        source_type: "hospitalist_note",
        source_label: "Hospitalist Progress Note 2026-04-18 08:10 (Ablated)",
        locator: "summary",
        timestamp: "2026-04-18T08:10:00-05:00",
        excerpt:
          "Breathing improved. Afebrile. Tolerating oral meds. Likely discharge home later today if remains stable on room air.",
      },
      {
        source_id: "note-rn-ablation-001",
        source_type: "nursing_note",
        source_label: "Nursing Reassessment Note 2026-04-18 18:20 (Ablated)",
        locator: "summary",
        timestamp: "2026-04-18T18:20:00-05:00",
        excerpt:
          "Patient ambulated short hallway with saturation remained above 93% and without dyspnea. No immediate overnight barriers were documented.",
      },
    ],
    optional_context_metadata: {
      care_setting: "inpatient",
      discharge_destination: "home",
      explicit_task_goal: "Ablation control: verify escalation depends on contradiction notes.",
    },
  },
};

export const CONTROL_TASK_INPUT: A2ATaskInput = {
  prompt: PROMPT_1,
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

export const DUPLICATE_SIGNAL_TASK_INPUT: A2ATaskInput = {
  prompt: PROMPT_1,
  patient_context: {
    scenario_id: "first_synthetic_discharge_slice_v1",
    patient_id: "phase0-duplicate-signal-control-001",
    encounter_id: "enc-phase0-duplicate-signal-control-001",
    narrative_evidence_bundle: [
      {
        source_id: "note-sw-duplicate-001",
        source_type: "social_work_note",
        source_label: "Social Work Follow-up Note 2026-04-18 17:40",
        locator: "summary",
        excerpt:
          "Family update confirms daughter remains unavailable overnight and there is no alternate caregiver identified for first night home.",
      },
    ],
    optional_context_metadata: {
      care_setting: "inpatient",
      discharge_destination: "home",
      explicit_task_goal:
        "Duplicate-signal control: do not add hidden-risk blockers that duplicate deterministic blockers.",
    },
  },
};

export const INCONCLUSIVE_TASK_INPUT: A2ATaskInput = {
  prompt: "What hidden risks or contradictions change that answer?",
  patient_context: {
    scenario_id: "third_synthetic_discharge_slice_ready_v1",
    patient_id: "phase0-inconclusive-context-001",
    encounter_id: "enc-phase0-inconclusive-context-001",
    narrative_evidence_bundle: [],
    optional_context_metadata: {
      care_setting: "inpatient",
      discharge_destination: "home",
      explicit_task_goal: "Inconclusive lane: hidden-risk review cannot run without narrative evidence.",
    },
  },
};

export const ALTERNATIVE_HIDDEN_RISK_TASK_INPUT: A2ATaskInput = {
  prompt: PROMPT_1,
  patient_context: {
    scenario_id: "third_synthetic_discharge_slice_ready_v1",
    patient_id: "phase0-alt-hidden-risk-001",
    encounter_id: "enc-phase0-alt-hidden-risk-001",
    narrative_evidence_bundle: [
      {
        source_id: "note-cm-alt-001",
        source_type: "case_management_note",
        source_label: "Case Management Escalation Note 2026-04-18 21:05",
        locator: "summary",
        excerpt:
          "Evening update: daughter cannot stay overnight and no alternate caregiver is available. Patient lives alone for first night after discharge.",
      },
    ],
    optional_context_metadata: {
      care_setting: "inpatient",
      discharge_destination: "home",
      explicit_task_goal: "Alternative hidden-risk lane: isolated home-support contradiction.",
    },
  },
};
