import { ReadinessInput, V1_SCENARIO_3_ID } from "./contract";

export const THIRD_SYNTHETIC_SCENARIO_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_3_ID,
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
  note_documents: [
    {
      id: "hospitalist-rounding-note",
      source_type: "note",
      source_label: "Hospitalist morning progress note",
      signals: [
        {
          id: "clinical-supporting-signal",
          category: "clinical_stability",
          signal_key: "oxygen_requirement",
          state: "supports_readiness",
          detail:
            "Morning reassessment documents room-air saturation 95% with stable vitals and no exertional dyspnea on hallway walk.",
          source_evidence_id: "note-clinical-ready-rounds",
        },
      ],
    },
    {
      id: "pharmacy-discharge-note",
      source_type: "note",
      source_label: "Pharmacy discharge medication note",
      signals: [
        {
          id: "med-rec-supporting-signal",
          category: "medication_reconciliation",
          signal_key: "medication_reconciliation_status",
          state: "supports_readiness",
          detail:
            "Final medication list was reviewed line-by-line with the patient and matches the signed discharge plan.",
          source_evidence_id: "note-med-rec-finalized",
        },
      ],
    },
    {
      id: "case-management-readiness-note",
      source_type: "note",
      source_label: "Case management discharge readiness note",
      signals: [
        {
          id: "followup-supporting-signal",
          category: "follow_up_and_referrals",
          signal_key: "follow_up_coordination_status",
          state: "supports_readiness",
          detail:
            "Primary care follow-up is booked for April 22 and outpatient physical therapy referral is accepted.",
          source_evidence_id: "note-followup-booked",
        },
        {
          id: "home-support-supporting-signal",
          category: "home_support_and_services",
          signal_key: "home_support_status",
          state: "supports_readiness",
          detail:
            "Spouse confirmed same-day pickup and home support, and home health start-of-care is scheduled for tomorrow morning.",
          source_evidence_id: "note-home-support-booked",
        },
      ],
    },
    {
      id: "nursing-discharge-education-note",
      source_type: "note",
      source_label: "Nursing discharge education note",
      signals: [
        {
          id: "education-supporting-signal",
          category: "patient_education",
          signal_key: "teach_back_status",
          state: "supports_readiness",
          detail:
            "Patient correctly repeated medication timing, mobility precautions, warning signs, and clinic callback instructions.",
          source_evidence_id: "note-teachback-complete",
        },
      ],
    },
    {
      id: "transport-coordination-note",
      source_type: "note",
      source_label: "Transport coordination note",
      signals: [
        {
          id: "transport-supporting-signal",
          category: "equipment_and_transport",
          signal_key: "equipment_and_transport_status",
          state: "supports_readiness",
          detail:
            "Family pickup is confirmed for 14:30 and no discharge equipment remains outstanding.",
          source_evidence_id: "note-transport-confirmed",
        },
      ],
    },
    {
      id: "signed-discharge-packet",
      source_type: "document",
      source_label: "Signed discharge packet",
      signals: [
        {
          id: "documentation-supporting-signal",
          category: "administrative_and_documentation",
          signal_key: "documentation_status",
          state: "supports_readiness",
          detail:
            "Discharge summary, after-visit instructions, and clinician sign-off are complete in the packet.",
          source_evidence_id: "document-discharge-packet-complete",
        },
      ],
    },
  ],
  evidence_catalog: [
    {
      id: "obs-clinical-ready-room-air",
      source_type: "structured",
      source_label: "Observation/clinical-stability",
      detail:
        "Latest bedside observation shows stable vitals, room-air oxygenation, and documented ambulation tolerance.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
    {
      id: "note-clinical-ready-rounds",
      source_type: "note",
      source_label: "Hospitalist morning progress note",
      detail:
        "Team documents stable respiratory status, oral medication tolerance, and no remaining inpatient clinical barriers.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
    {
      id: "note-med-rec-finalized",
      source_type: "note",
      source_label: "Pharmacy discharge medication note",
      detail:
        "Pharmacy reconciliation is finalized and aligned with the signed discharge medication list.",
      category: "medication_reconciliation",
      assertion: "supports_readiness",
    },
    {
      id: "note-followup-booked",
      source_type: "note",
      source_label: "Case management discharge readiness note",
      detail:
        "Primary care follow-up and outpatient therapy referral are booked before discharge.",
      category: "follow_up_and_referrals",
      assertion: "supports_readiness",
    },
    {
      id: "note-home-support-booked",
      source_type: "note",
      source_label: "Case management discharge readiness note",
      detail:
        "Family support and home-health follow-up are confirmed with names and timing documented.",
      category: "home_support_and_services",
      assertion: "supports_readiness",
    },
    {
      id: "note-teachback-complete",
      source_type: "note",
      source_label: "Nursing discharge education note",
      detail:
        "Teach-back is documented as complete for medications, mobility precautions, and warning signs.",
      category: "patient_education",
      assertion: "supports_readiness",
    },
    {
      id: "note-transport-confirmed",
      source_type: "note",
      source_label: "Transport coordination note",
      detail:
        "Transportation time is confirmed and no discharge equipment gaps remain.",
      category: "equipment_and_transport",
      assertion: "supports_readiness",
    },
    {
      id: "document-discharge-packet-complete",
      source_type: "document",
      source_label: "Signed discharge packet",
      detail:
        "Final discharge paperwork and sign-offs are complete in the packet prepared for the patient.",
      category: "administrative_and_documentation",
      assertion: "supports_readiness",
    },
  ],
};
