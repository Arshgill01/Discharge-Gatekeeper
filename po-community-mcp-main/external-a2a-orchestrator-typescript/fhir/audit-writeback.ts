import { randomUUID } from "node:crypto";
import { upsertFhirResource } from "../../typescript/fhir-store";
import { ReconciliationResult } from "../types";

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

  for (const taskWrite of taskWrites) {
    const provenanceId = `ctc-provenance-${taskWrite.resource_id}-${packet.trace.task_id ?? randomUUID()}`;
    const recorded = new Date().toISOString();
    await upsertFhirResource(fhirServer, {
      resourceType: "Provenance",
      id: provenanceId,
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
    });
    provenanceWrites.push({
      reference: `Provenance/${provenanceId}`,
      resource_type: "Provenance",
      resource_id: provenanceId,
      timestamp: recorded,
      summary: `Provenance for ${taskWrite.reference}`,
      linked_evidence_references: taskWrite.linked_evidence_references,
    });
  }

  const auditId = buildAuditId(packet.patient.encounter_id, packet.trace.task_id);
  const occurredAt = new Date().toISOString();
  await upsertFhirResource(fhirServer, {
    resourceType: "AuditEvent",
    id: auditId,
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
  });

  return {
    ...reconciled,
    transition_safety_packet: {
      ...packet,
      fhir_resources_written: [
        ...packet.fhir_resources_written,
        ...provenanceWrites,
        {
          reference: `AuditEvent/${auditId}`,
          resource_type: "AuditEvent",
          resource_id: auditId,
          timestamp: occurredAt,
          summary: `Audit event for verdict ${reconciled.final_verdict}`,
          linked_evidence_references: packet.controlling_evidence.map((item) => item.reference),
        },
      ],
    },
  };
};
