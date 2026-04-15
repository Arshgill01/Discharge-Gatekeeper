import { ReadinessInput, V1_SCENARIO_ID } from "./contract";

export const FIRST_SYNTHETIC_SCENARIO_V1: ReadinessInput = {
  scenario_id: V1_SCENARIO_ID,
  clinical: {
    vitals_stable: true,
    oxygen_lpm: 2,
    baseline_oxygen_lpm: 0,
    pending_critical_labs: false,
  },
  medications: {
    reconciliation_complete: false,
    unresolved_issues: [
      "Discharge draft omits home anticoagulation restart timing.",
      "Active inpatient insulin correction order still listed in discharge meds.",
    ],
  },
  follow_up: {
    appointments_scheduled: false,
    missing_referrals: ["Pulmonology follow-up visit not yet booked."],
  },
  education: {
    teach_back_complete: false,
    documented_gaps: [
      "Patient cannot describe red-flag dyspnea symptoms that require escalation.",
    ],
  },
  home_support: {
    caregiver_confirmed: false,
    services_confirmed: false,
    documented_gaps: [
      "Case manager documented that caregiver availability is still unconfirmed.",
    ],
  },
  logistics: {
    transport_confirmed: true,
    equipment_ready: false,
    documented_gaps: [
      "Home oxygen delivery window not confirmed by vendor.",
    ],
  },
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
