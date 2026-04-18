import { ReadinessInput, V1_SCENARIO_2_ID } from "./contract";

export const SECOND_SYNTHETIC_SCENARIO_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_2_ID,
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
      "Cardiology follow-up was recommended but the appointment time is still pending confirmation.",
    ],
  },
  patient_education: {
    teach_back_complete: false,
    documented_gaps: [
      "Patient can repeat medication names but cannot yet explain diuretic hold parameters and escalation thresholds.",
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
    documented_gaps: [
      "Ride pickup time is not yet documented in the discharge packet despite transport acceptance.",
    ],
  },
  administrative_and_documentation: {
    discharge_documents_complete: false,
    documented_gaps: [
      "Discharge summary attestation and after-visit instruction sign-off are still pending.",
    ],
  },
  note_documents: [
    {
      id: "pharmacy-transition-note",
      source_type: "note",
      source_label: "Pharmacy transition note",
      signals: [
        {
          id: "med-rec-supporting-signal",
          category: "medication_reconciliation",
          signal_key: "medication_reconciliation_status",
          state: "supports_readiness",
          detail:
            "Pharmacy transition note documents a finalized medication list with inpatient-only orders removed.",
          source_evidence_id: "note-med-rec-complete",
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
            "Cardiology follow-up is recommended, but the clinic has not yet returned the final appointment time.",
          source_evidence_id: "note-followup-missing",
        },
      ],
    },
    {
      id: "nursing-education-note",
      source_type: "note",
      source_label: "Nursing discharge education note",
      signals: [
        {
          id: "teach-back-blocking-signal",
          category: "patient_education",
          signal_key: "teach_back_status",
          state: "blocks_readiness",
          detail:
            "Patient can repeat medication names but cannot yet explain diuretic hold parameters and escalation thresholds.",
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
          id: "home-support-supporting-signal",
          category: "home_support_and_services",
          signal_key: "home_support_status",
          state: "supports_readiness",
          detail:
            "Daughter confirmed same-day pickup and can stay with the patient through the first night home.",
          source_evidence_id: "note-home-support-confirmed",
        },
      ],
    },
    {
      id: "care-coordination-logistics-note",
      source_type: "note",
      source_label: "Care coordination logistics note",
      signals: [
        {
          id: "transport-blocking-signal",
          category: "equipment_and_transport",
          signal_key: "equipment_and_transport_status",
          state: "blocks_readiness",
          detail:
            "Transportation is accepted, but the discharge packet still lacks a documented pickup window.",
          source_evidence_id: "note-transport-window-pending",
        },
      ],
    },
    {
      id: "avs-signoff-checklist",
      source_type: "document",
      source_label: "After-visit summary sign-off checklist",
      signals: [
        {
          id: "documentation-blocking-signal",
          category: "administrative_and_documentation",
          signal_key: "documentation_status",
          state: "blocks_readiness",
          detail:
            "After-visit summary instructions are drafted, but attending attestation and packet sign-off remain open.",
          source_evidence_id: "document-discharge-signoff-pending",
        },
      ],
    },
  ],
  evidence_catalog: [
    {
      id: "obs-clinical-stable-room-air",
      source_type: "structured",
      source_label: "Observation/clinical-stability",
      detail: "Vitals remain stable on room air and the patient is walking the hallway without desaturation.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
    {
      id: "note-med-rec-complete",
      source_type: "note",
      source_label: "Pharmacy transition note",
      detail:
        "Medication reconciliation is complete and the discharge medication list matches the reconciled plan.",
      category: "medication_reconciliation",
      assertion: "supports_readiness",
    },
    {
      id: "note-followup-missing",
      source_type: "note",
      source_label: "Discharge planning note",
      detail:
        "Cardiology follow-up is recommended, but scheduling confirmation is still pending.",
      category: "follow_up_and_referrals",
      assertion: "supports_blocker",
    },
    {
      id: "note-teachback-incomplete",
      source_type: "note",
      source_label: "Nursing discharge education note",
      detail:
        "Teach-back remains partial for self-monitoring, diuretic hold parameters, and escalation instructions.",
      category: "patient_education",
      assertion: "supports_blocker",
    },
    {
      id: "note-home-support-confirmed",
      source_type: "note",
      source_label: "Case management note",
      detail:
        "Family support and first-night supervision are confirmed in the discharge planning note.",
      category: "home_support_and_services",
      assertion: "supports_readiness",
    },
    {
      id: "note-transport-window-pending",
      source_type: "note",
      source_label: "Care coordination logistics note",
      detail:
        "Transportation has been accepted, but no pickup time appears in the discharge packet.",
      category: "equipment_and_transport",
      assertion: "supports_blocker",
    },
    {
      id: "document-discharge-signoff-pending",
      source_type: "document",
      source_label: "After-visit summary sign-off checklist",
      detail:
        "Required discharge documentation sign-off steps remain open.",
      category: "administrative_and_documentation",
      assertion: "supports_blocker",
    },
  ],
};
