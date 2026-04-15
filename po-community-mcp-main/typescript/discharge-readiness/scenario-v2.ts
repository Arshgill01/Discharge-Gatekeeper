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
  evidence_catalog: [
    {
      id: "note-followup-missing",
      source_type: "note",
      source_label: "Discharge planning note",
      detail:
        "Follow-up referral recommendation is documented, but scheduling confirmation is still pending.",
    },
    {
      id: "note-teachback-incomplete",
      source_type: "note",
      source_label: "Nursing discharge education note",
      detail:
        "Teach-back remains partial for self-monitoring and escalation instructions.",
    },
    {
      id: "note-oxygen-delivery-pending",
      source_type: "note",
      source_label: "Care coordination logistics note",
      detail:
        "Transportation has been accepted, but no pickup time appears in the discharge packet.",
    },
    {
      id: "note-admin-documentation-gap",
      source_type: "structured",
      source_label: "Discharge workflow checklist",
      detail:
        "Required discharge documentation sign-off steps remain open.",
    },
  ],
};
