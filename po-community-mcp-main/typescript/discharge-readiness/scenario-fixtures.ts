import {
  ReadinessInput,
  V1_SCENARIO_ID_EVIDENCE_AMBIGUITY,
  V1_SCENARIO_ID_READY_WITH_CAVEATS,
} from "./contract";

export const SECOND_SYNTHETIC_SCENARIO_READY_WITH_CAVEATS_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_ID_READY_WITH_CAVEATS,
  clinical_stability: {
    vitals_stable: true,
    oxygen_lpm: 0,
    baseline_oxygen_lpm: 0,
  },
  pending_diagnostics: {
    critical_results_pending: false,
    pending_items: [],
  },
  medication_reconciliation: {
    reconciliation_complete: true,
    unresolved_issues: [],
  },
  follow_up_and_referrals: {
    appointments_scheduled: false,
    missing_referrals: [
      "Primary care follow-up appointment remains unscheduled for this week.",
    ],
  },
  patient_education: {
    teach_back_complete: false,
    documented_gaps: [
      "Patient can repeat medication timing but cannot repeat escalation warning signs.",
    ],
  },
  home_support_and_services: {
    caregiver_confirmed: true,
    services_confirmed: true,
    documented_gaps: [],
  },
  equipment_and_transport: {
    transport_confirmed: true,
    equipment_ready: true,
    documented_gaps: [],
  },
  administrative_and_documentation: {
    discharge_documents_complete: true,
    documented_gaps: [],
  },
  evidence_catalog: [
    {
      id: "obs-clinical-stable-room-air",
      source_type: "structured",
      source_label: "Observation/clinical-stability",
      detail: "Vitals are stable and patient is on baseline room air.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
    {
      id: "note-followup-scheduling-gap",
      source_type: "note",
      source_label: "Case management discharge note",
      detail: "Follow-up order present but scheduling call is still pending.",
      category: "follow_up_and_referrals",
      assertion: "supports_blocker",
    },
    {
      id: "note-teachback-gap-warning-signs",
      source_type: "note",
      source_label: "Nursing discharge education note",
      detail: "Teach-back incomplete for warning signs requiring urgent callback.",
      category: "patient_education",
      assertion: "supports_blocker",
    },
  ],
};

export const THIRD_SYNTHETIC_SCENARIO_AMBIGUITY_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_ID_EVIDENCE_AMBIGUITY,
  clinical_stability: {
    vitals_stable: true,
    oxygen_lpm: 1,
    baseline_oxygen_lpm: 1,
  },
  pending_diagnostics: {
    critical_results_pending: false,
    pending_items: [],
  },
  medication_reconciliation: {
    reconciliation_complete: false,
    unresolved_issues: [
      "Medication reconciliation checklist remains unsigned in chart.",
    ],
  },
  follow_up_and_referrals: {
    appointments_scheduled: true,
    missing_referrals: [],
  },
  patient_education: {
    teach_back_complete: true,
    documented_gaps: [],
  },
  home_support_and_services: {
    caregiver_confirmed: true,
    services_confirmed: true,
    documented_gaps: [],
  },
  equipment_and_transport: {
    transport_confirmed: true,
    equipment_ready: true,
    documented_gaps: [],
  },
  administrative_and_documentation: {
    discharge_documents_complete: true,
    documented_gaps: [],
  },
  evidence_catalog: [
    {
      id: "note-clinical-concern-overnight-desat",
      source_type: "note",
      source_label: "Night shift progress note",
      detail: "Narrative describes overnight desaturation and unresolved exertional dyspnea.",
      category: "clinical_stability",
      assertion: "supports_blocker",
    },
    {
      id: "note-clinical-clearance-morning-rounds",
      source_type: "note",
      source_label: "Morning rounds note",
      detail: "Morning team documents clinical stability and plans likely discharge.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
    {
      id: "note-med-rec-evidence-incomplete",
      source_type: "note",
      source_label: "Pharmacy transition note",
      detail:
        "Final reconciliation signature and consolidated medication list are not yet available.",
      category: "medication_reconciliation",
      assertion: "uncertain",
    },
  ],
};
