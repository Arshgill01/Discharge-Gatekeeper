import { randomUUID } from "node:crypto";
import {
  createFhirResource,
  isLocalFhirBaseUrl,
  upsertFhirResource,
} from "../../typescript/fhir-store";
import { ReconciliationResult } from "../types";
import {
  createResourcesViaPromptOpinionBrowserAuth,
  isPromptOpinionBrowserAuthEnabled,
} from "./po-cookie-auth";

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

const buildTaskCodeText = (
  category: string,
  action: string,
  rationale: string,
  packet: ReconciliationResult["transition_safety_packet"],
): string => {
  const supportingText = [
    rationale,
    ...packet.controlling_evidence
      .filter((item) => item.supports.includes(category as typeof item.supports[number]))
      .map((item) => item.summary),
  ].join(" ");
  const lowered = supportingText.toLowerCase();

  if (category === "patient_education" && /(home scale|monitoring|daily weight)/i.test(lowered)) {
    return "Confirm a working home monitoring plan and daily weight equipment before discharge.";
  }
  if (category === "clinical_stability" && /(orthopnea|weight gain|symptom change)/i.test(lowered)) {
    return "Reassess late symptom change and document whether discharge remains safe today.";
  }
  if (category === "medication_reconciliation" && /(cannot afford|prior authorization|dispense|medication access)/i.test(lowered)) {
    return "Resolve medication access or bridge supply before discharge proceeds.";
  }

  return compactAction(action);
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
  const accessToken = process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || undefined;

  if (!fhirServer || !patientReference || !encounterReference || reconciled.final_verdict === "ready") {
    return reconciled;
  }

  const practitionerRoles = reconciled.deterministic.fhir_context?.practitioner_roles ?? {};
  const categories = packet.reconciled_transition_status.blocker_categories;
  const taskWrites: typeof packet.fhir_resources_written = [];
  const browserAuthTaskPayloads: Array<{
    category: string;
    authoredOn: string;
    taskCodeText: string;
    reasonReferences: string[];
    taskResource: Record<string, unknown>;
  }> = [];
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
    const taskCodeText = buildTaskCodeText(category, step.action, step.rationale, packet);
    const taskResource: Record<string, unknown> = {
      resourceType: "Task",
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
        text: taskCodeText,
      },
      reasonReference: reasonReferences.map((reference) => ({ reference })),
      authoredOn,
      note: [
        {
          text: `${reconciled.final_verdict} gate for ${category}: ${step.rationale}`,
        },
      ],
      identifier: [
        {
          system: CTC_TAG_SYSTEM,
          value: taskId,
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

    const useBrowserCookieAuth = isPromptOpinionBrowserAuthEnabled();

    if (useBrowserCookieAuth) {
      const browserTaskResource: Record<string, unknown> = {
        ...taskResource,
        reasonReference: {
          reference: reasonReferences[0],
        },
      };
      browserAuthTaskPayloads.push({
        category,
        authoredOn,
        taskCodeText,
        reasonReferences,
        taskResource: browserTaskResource,
      });
      continue;
    }

    if (isLocalFhirBaseUrl(fhirServer)) {
      taskResource["id"] = taskId;
    }

    const writtenTask = isLocalFhirBaseUrl(fhirServer)
      ? await upsertFhirResource(fhirServer, taskResource, { accessToken })
      : await createFhirResource(fhirServer, taskResource, { accessToken });
    const writtenTaskId = String(writtenTask["id"] ?? taskId);
    taskWrites.push({
      reference: `Task/${writtenTaskId}`,
      resource_type: "Task",
      resource_id: writtenTaskId,
      timestamp: authoredOn,
      summary: taskCodeText,
      linked_evidence_references: reasonReferences,
    });
  }

  if (browserAuthTaskPayloads.length > 0) {
    const createdTasks = createResourcesViaPromptOpinionBrowserAuth(
      browserAuthTaskPayloads.map((item) => item.taskResource),
    );
    createdTasks.forEach((writtenTask, index) => {
      const source = browserAuthTaskPayloads[index];
      if (!source) {
        return;
      }
      const writtenTaskId = String(writtenTask["id"] ?? randomUUID());
      taskWrites.push({
        reference: `Task/${writtenTaskId}`,
        resource_type: "Task",
        resource_id: writtenTaskId,
        timestamp: source.authoredOn,
        summary: source.taskCodeText,
        linked_evidence_references: source.reasonReferences,
      });
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
