import { randomUUID } from "node:crypto";
import { upsertFhirResource } from "../../typescript/fhir-store";
import { ReconciliationResult } from "../types";

const CTC_TAG_SYSTEM = "https://care-transitions-command.local/tags";

const OWNER_ROLE_KEY_BY_CATEGORY: Record<string, string> = {
  clinical_stability: "bedside_rn",
  pending_diagnostics: "covering_clinician",
  medication_reconciliation: "pharmacist",
  follow_up_and_referrals: "case_manager",
  patient_education: "bedside_rn",
  home_support_and_services: "case_manager",
  equipment_and_transport: "case_manager",
  administrative_and_documentation: "covering_clinician",
};

const PRIORITY_BY_CATEGORY: Record<string, "urgent" | "asap"> = {
  clinical_stability: "urgent",
  pending_diagnostics: "urgent",
  medication_reconciliation: "asap",
  follow_up_and_referrals: "asap",
  patient_education: "asap",
  home_support_and_services: "urgent",
  equipment_and_transport: "urgent",
  administrative_and_documentation: "asap",
};

const compactAction = (value: string): string => {
  return value
    .replace(/^Immediate discharge hold action:\s*/i, "")
    .replace(/^Before final discharge order:\s*/i, "")
    .replace(/\s+Completion signal:.*$/i, "")
    .replace(/\s+Evidence:.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const buildTaskId = (
  encounterId: string | null,
  patientId: string | null,
  category: string,
): string => {
  const scope = encounterId ?? patientId ?? randomUUID();
  return `ctc-${scope}-${category}`.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
};

const uniqueReasonReferences = (
  references: Array<string | undefined>,
): string[] => {
  return [...new Set(references.filter((reference): reference is string => Boolean(reference)))];
};

export const writeDischargeBlockingTasks = async (
  reconciled: ReconciliationResult,
): Promise<ReconciliationResult> => {
  const packet = reconciled.transition_safety_packet;
  const fhirServer = packet.fhir_server;
  const patientReference = reconciled.deterministic.fhir_context?.patient_reference;
  const encounterReference = reconciled.deterministic.fhir_context?.encounter_reference;

  if (!fhirServer || !patientReference || !encounterReference || reconciled.final_verdict === "ready") {
    return reconciled;
  }

  const practitionerRoles = reconciled.deterministic.fhir_context?.practitioner_roles ?? {};
  const categories = packet.reconciled_transition_status.blocker_categories;
  const taskWrites: typeof packet.fhir_resources_written = [];
  let noTaskWithoutFhirSource: "pass" | "fail" = "pass";

  for (const category of categories) {
    const step = reconciled.merged_next_steps.find((candidate) => candidate.category === category);
    if (!step) {
      continue;
    }

    const reasonReferences = uniqueReasonReferences([
      ...packet.controlling_evidence
        .filter((item) => item.supports.includes(category))
        .map((item) => item.reference),
      ...step.citation_anchors.map((anchor) => anchor.fhir_reference),
    ]);

    if (reasonReferences.length === 0) {
      noTaskWithoutFhirSource = "fail";
      continue;
    }

    const taskId = buildTaskId(packet.patient.encounter_id, packet.patient.patient_id, category);
    const ownerReference = practitionerRoles[OWNER_ROLE_KEY_BY_CATEGORY[category] ?? ""];
    const authoredOn = new Date().toISOString();
    const taskResource: Record<string, unknown> = {
      resourceType: "Task",
      id: taskId,
      status: "requested",
      intent: "order",
      priority: PRIORITY_BY_CATEGORY[category] ?? "asap",
      for: {
        reference: patientReference,
      },
      encounter: {
        reference: encounterReference,
      },
      code: {
        text: compactAction(step.action),
      },
      reasonReference: reasonReferences.map((reference) => ({ reference })),
      authoredOn,
      note: [
        {
          text: `${reconciled.final_verdict} gate for ${category}: ${step.rationale}`,
        },
      ],
      meta: {
        tag: [
          {
            system: CTC_TAG_SYSTEM,
            code: "ctc-generated",
          },
          {
            system: CTC_TAG_SYSTEM,
            code: "ctc-discharge-block-task",
          },
          {
            system: CTC_TAG_SYSTEM,
            code: `ctc-category-${category}`,
          },
        ],
      },
    };

    if (ownerReference) {
      taskResource["owner"] = {
        reference: ownerReference,
      };
    }

    await upsertFhirResource(fhirServer, taskResource);
    taskWrites.push({
      reference: `Task/${taskId}`,
      resource_type: "Task",
      resource_id: taskId,
      timestamp: authoredOn,
      summary: compactAction(step.action),
      linked_evidence_references: reasonReferences,
    });
  }

  return {
    ...reconciled,
    transition_safety_packet: {
      ...packet,
      fhir_resources_written: [...packet.fhir_resources_written, ...taskWrites],
      safety_invariants: {
        ...packet.safety_invariants,
        no_task_without_fhir_source: noTaskWithoutFhirSource,
      },
    },
  };
};
