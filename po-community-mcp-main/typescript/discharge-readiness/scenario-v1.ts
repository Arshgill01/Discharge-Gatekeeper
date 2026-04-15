import { ReadinessInput, V1_SCENARIO_ID } from "./contract";

export const FIRST_SYNTHETIC_SCENARIO_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_ID,
  clinical_stability: {
    vitals_stable: true,
    oxygen_lpm: 2,
    baseline_oxygen_lpm: 0,
  },
  pending_diagnostics: {
    critical_results_pending: false,
    pending_items: [],
  },
  medication_reconciliation: {
    reconciliation_complete: false,
    unresolved_issues: [
      "Discharge draft omits home anticoagulation restart timing.",
      "Active inpatient insulin correction order still listed in discharge meds.",
    ],
  },
  follow_up_and_referrals: {
    appointments_scheduled: false,
    missing_referrals: ["Pulmonology follow-up visit not yet booked."],
  },
  patient_education: {
    teach_back_complete: false,
    documented_gaps: [
      "Patient cannot describe red-flag dyspnea symptoms that require escalation.",
    ],
  },
  home_support_and_services: {
    caregiver_confirmed: false,
    services_confirmed: false,
    documented_gaps: [
      "Case manager documented that caregiver availability is still unconfirmed.",
    ],
  },
  equipment_and_transport: {
    transport_confirmed: true,
    equipment_ready: false,
    documented_gaps: [
      "Home oxygen delivery window not confirmed by vendor.",
    ],
  },
  administrative_and_documentation: {
    discharge_documents_complete: true,
    documented_gaps: [],
  },
  note_documents: [
    {
      id: "med-rec-note",
      source_type: "note",
      source_label: "Medication reconciliation note",
      signals: [
        {
          id: "med-rec-blocking-signal",
          category: "medication_reconciliation",
          signal_key: "medication_reconciliation_status",
          state: "blocks_readiness",
          detail:
            "Medication reconciliation note describes unresolved discrepancies between active inpatient orders and the discharge draft.",
          source_evidence_id: "note-med-rec-gap",
        },
      ],
    },
    {
      id: "discharge-planning-note",
      source_type: "note",
      source_label: "Discharge planning note",
      signals: [
        {
          id: "followup-blocking-signal",
          category: "follow_up_and_referrals",
          signal_key: "follow_up_coordination_status",
          state: "blocks_readiness",
          detail:
            "Discharge planning note shows required pulmonology follow-up is not yet scheduled.",
          source_evidence_id: "note-followup-missing",
        },
      ],
    },
    {
      id: "education-note",
      source_type: "note",
      source_label: "Nursing discharge education note",
      signals: [
        {
          id: "teach-back-blocking-signal",
          category: "patient_education",
          signal_key: "teach_back_status",
          state: "blocks_readiness",
          detail:
            "Nursing education note records incomplete teach-back on warning signs and escalation pathways.",
          source_evidence_id: "note-teachback-incomplete",
        },
      ],
    },
    {
      id: "case-management-note",
      source_type: "note",
      source_label: "Case management note",
      signals: [
        {
          id: "home-support-blocking-signal",
          category: "home_support_and_services",
          signal_key: "home_support_status",
          state: "blocks_readiness",
          detail:
            "Case management note documents that caregiver support and home services remain unconfirmed.",
          source_evidence_id: "note-caregiver-unconfirmed",
        },
      ],
    },
    {
      id: "dme-coordination-note",
      source_type: "note",
      source_label: "Durable medical equipment coordination note",
      signals: [
        {
          id: "equipment-blocking-signal",
          category: "equipment_and_transport",
          signal_key: "equipment_and_transport_status",
          state: "blocks_readiness",
          detail:
            "DME coordination note shows home oxygen vendor has not confirmed delivery timing.",
          source_evidence_id: "note-oxygen-delivery-pending",
        },
      ],
    },
  ],
  evidence_catalog: [
    {
      id: "obs-oxygen-2lpm",
      source_type: "structured",
      source_label: "Observation/O2-need",
      detail: "Current oxygen requirement is 2 L/min; baseline documented as room air.",
    },
    {
      id: "note-med-rec-gap",
      source_type: "note",
      source_label: "Medication reconciliation note",
      detail:
        "Medication list mismatch identified between active orders and discharge draft.",
    },
    {
      id: "note-followup-missing",
      source_type: "note",
      source_label: "Discharge planning note",
      detail: "Pulmonology follow-up is recommended but appointment is not scheduled.",
    },
    {
      id: "note-teachback-incomplete",
      source_type: "note",
      source_label: "Nursing discharge education note",
      detail: "Teach-back incomplete for warning signs and escalation plan.",
    },
    {
      id: "note-caregiver-unconfirmed",
      source_type: "note",
      source_label: "Case management note",
      detail: "Caregiver support and home services remain unconfirmed.",
    },
    {
      id: "note-oxygen-delivery-pending",
      source_type: "note",
      source_label: "Durable medical equipment coordination note",
      detail: "Vendor has not confirmed delivery of home oxygen equipment.",
    },
  ],
};
