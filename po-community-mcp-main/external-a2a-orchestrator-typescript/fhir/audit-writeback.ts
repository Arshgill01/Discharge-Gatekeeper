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

const buildAuditId = (
  encounterId: string | null,
  taskId: string | null | undefined,
): string => {
  const scope = `${encounterId ?? "encounter"}-${taskId ?? randomUUID()}`;
  return `ctc-audit-${scope}`.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
};

export const writeAuditArtifacts = async (
  reconciled: ReconciliationResult,
): Promise<ReconciliationResult> => {
  const packet = reconciled.transition_safety_packet;
  const fhirServer = packet.fhir_server;
  const patientReference = reconciled.deterministic.fhir_context?.patient_reference;
  const encounterReference = reconciled.deterministic.fhir_context?.encounter_reference;

  if (!fhirServer || !patientReference || !encounterReference) {
    return reconciled;
  }

  const taskWrites = packet.fhir_resources_written.filter((resource) => resource.resource_type === "Task");
  const provenanceWrites: typeof packet.fhir_resources_written = [];
  const accessToken = process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || undefined;
  const browserAuthProvenancePayloads: Array<{
    recorded: string;
    taskReference: string;
    linkedEvidenceReferences: string[] | undefined;
    payload: Record<string, unknown>;
  }> = [];

  for (const taskWrite of taskWrites) {
    const provenanceId = `ctc-provenance-${taskWrite.resource_id}-${packet.trace.task_id ?? randomUUID()}`;
    const recorded = new Date().toISOString();
    const provenanceResource: Record<string, unknown> = {
      resourceType: "Provenance",
      recorded,
      target: [{ reference: taskWrite.reference }],
      agent: [
        {
          type: {
            text: "CareTransitionsCommand",
          },
          who: {
            display: "CareTransitionsCommand / external A2A orchestrator",
          },
        },
      ],
      entity: (taskWrite.linked_evidence_references ?? []).map((reference) => ({
        role: "source",
        what: {
          reference,
        },
      })),
      meta: {
        tag: [
          {
            system: CTC_TAG_SYSTEM,
            code: "ctc-generated",
          },
          {
            system: CTC_TAG_SYSTEM,
            code: "ctc-task-provenance",
          },
        ],
      },
    };

    if (isPromptOpinionBrowserAuthEnabled()) {
      browserAuthProvenancePayloads.push({
        recorded,
        taskReference: taskWrite.reference,
        linkedEvidenceReferences: taskWrite.linked_evidence_references,
        payload: provenanceResource,
      });
      continue;
    }

    if (isLocalFhirBaseUrl(fhirServer)) {
      provenanceResource["id"] = provenanceId;
    }

    const writtenProvenance = isLocalFhirBaseUrl(fhirServer)
      ? await upsertFhirResource(fhirServer, provenanceResource, { accessToken })
      : await createFhirResource(fhirServer, provenanceResource, { accessToken });
    const writtenProvenanceId = String(writtenProvenance["id"] ?? provenanceId);
    provenanceWrites.push({
      reference: `Provenance/${writtenProvenanceId}`,
      resource_type: "Provenance",
      resource_id: writtenProvenanceId,
      timestamp: recorded,
      summary: `Provenance for ${taskWrite.reference}`,
      linked_evidence_references: taskWrite.linked_evidence_references,
    });
  }

  if (browserAuthProvenancePayloads.length > 0) {
    const writtenProvenanceResources = createResourcesViaPromptOpinionBrowserAuth(
      browserAuthProvenancePayloads.map((item) => item.payload),
    );
    writtenProvenanceResources.forEach((resource, index) => {
      const input = browserAuthProvenancePayloads[index];
      if (!input) {
        return;
      }
      const writtenProvenanceId = String(resource["id"] ?? randomUUID());
      provenanceWrites.push({
        reference: `Provenance/${writtenProvenanceId}`,
        resource_type: "Provenance",
        resource_id: writtenProvenanceId,
        timestamp: input.recorded,
        summary: `Provenance for ${input.taskReference}`,
        linked_evidence_references: input.linkedEvidenceReferences,
      });
    });
  }

  const auditId = buildAuditId(packet.patient.encounter_id, packet.trace.task_id);
  const occurredAt = new Date().toISOString();
  if (isPromptOpinionBrowserAuthEnabled()) {
    return {
      ...reconciled,
      transition_safety_packet: {
        ...packet,
        fhir_resources_written: [
          ...packet.fhir_resources_written,
          ...provenanceWrites,
        ],
      },
    };
  }

  const auditResource: Record<string, unknown> = {
    resourceType: "AuditEvent",
    type: {
      text: "CareTransitionsCommand discharge arbitration",
    },
    action: "E",
    recorded: occurredAt,
    outcomeDesc: `Final verdict ${reconciled.final_verdict}`,
    agent: [
      {
        requestor: false,
        who: {
          display: "CareTransitionsCommand / external A2A orchestrator",
        },
      },
    ],
    source: {
      observer: {
        display: "CareTransitionsCommand",
      },
    },
    entity: [
      {
        what: {
          reference: patientReference,
        },
      },
      {
        what: {
          reference: encounterReference,
        },
      },
      ...packet.controlling_evidence.map((item) => ({
        what: {
          reference: item.reference,
        },
      })),
    ],
    meta: {
      tag: [
        {
          system: CTC_TAG_SYSTEM,
          code: "ctc-generated",
        },
        {
          system: CTC_TAG_SYSTEM,
          code: "ctc-audit-event",
        },
      ],
    },
  };

  if (isLocalFhirBaseUrl(fhirServer)) {
    auditResource["id"] = auditId;
  }

  const writtenAudit = isLocalFhirBaseUrl(fhirServer)
    ? await upsertFhirResource(fhirServer, auditResource, { accessToken })
    : await createFhirResource(fhirServer, auditResource, { accessToken });
  const writtenAuditId = String(writtenAudit["id"] ?? auditId);

  return {
    ...reconciled,
    transition_safety_packet: {
      ...packet,
      fhir_resources_written: [
        ...packet.fhir_resources_written,
        ...provenanceWrites,
        {
          reference: `AuditEvent/${writtenAuditId}`,
          resource_type: "AuditEvent",
          resource_id: writtenAuditId,
          timestamp: occurredAt,
          summary: `Audit event for verdict ${reconciled.final_verdict}`,
          linked_evidence_references: packet.controlling_evidence.map((item) => item.reference),
        },
      ],
    },
  };
};
