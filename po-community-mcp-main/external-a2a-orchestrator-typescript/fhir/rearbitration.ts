import { searchFhirResources, upsertFhirResource } from "../../typescript/fhir-store";
import { ReconciliationResult } from "../types";
import {
  isPromptOpinionBrowserAuthEnabled,
  readBundleViaPromptOpinionBrowserAuth,
} from "./po-cookie-auth";

type TaskResource = {
  resourceType: "Task";
  id: string;
  status?: string;
  encounter?: { reference?: string };
  code?: { text?: string };
  note?: Array<{ text?: string }>;
  reasonReference?: Array<{ reference?: string }>;
  meta?: {
    tag?: Array<{ code?: string }>;
  };
};

const RESOLUTION_PATTERNS: Record<string, RegExp[]> = {
  clinical_stability: [
    /exertional reassessment passed/i,
    /reassessment passed/i,
    /oxygen reassessment passed/i,
    /stable on exertion/i,
    /clinical reassessment passed/i,
    /orthopnea resolved/i,
  ],
  equipment_and_transport: [
    /oxygen delivery confirmed/i,
    /equipment delivered/i,
    /transport confirmed/i,
    /vendor confirmed/i,
    /ride arranged/i,
  ],
  home_support_and_services: [
    /overnight support confirmed/i,
    /caregiver confirmed/i,
    /home support confirmed/i,
    /home services arranged/i,
  ],
  medication_reconciliation: [
    /medication bridge approved/i,
    /prior authorization resolved/i,
    /medication delivered/i,
    /medication bridge .* delivered/i,
    /bridge .* delivered to bedside/i,
    /medication access confirmed/i,
  ],
  follow_up_and_referrals: [/follow-up confirmed/i, /referral scheduled/i],
  patient_education: [
    /teach-back completed/i,
    /instructions understood/i,
    /working home scale/i,
    /daily weight monitoring (?:plan|confirmed|arranged)/i,
    /home monitoring (?:plan|confirmed|arranged)/i,
  ],
  pending_diagnostics: [/diagnostic completed/i, /results reviewed/i],
  administrative_and_documentation: [/documentation complete/i, /paperwork complete/i],
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toTaskResource = (value: unknown): TaskResource | null => {
  return isRecord(value) && value["resourceType"] === "Task" ? (value as TaskResource) : null;
};

const taskCategory = (task: TaskResource): string | null => {
  for (const tag of task.meta?.tag ?? []) {
    if (tag.code?.startsWith("ctc-category-")) {
      return tag.code.replace("ctc-category-", "");
    }
  }
  return null;
};

export const shouldProcessResolutionPrompt = (prompt: string): boolean => {
  return /update discharge status|update readiness|re-?arbitrate|status update/i.test(prompt);
};

const shouldCompleteTask = (category: string, prompt: string): boolean => {
  return (RESOLUTION_PATTERNS[category] ?? []).some((pattern) => pattern.test(prompt));
};

const toCanonicalCategory = (value: string): ReconciliationResult["transition_safety_packet"]["reconciled_transition_status"]["blocker_categories"][number] | null => {
  return [
    "clinical_stability",
    "pending_diagnostics",
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
    "administrative_and_documentation",
  ].includes(value)
    ? (value as ReconciliationResult["transition_safety_packet"]["reconciled_transition_status"]["blocker_categories"][number])
    : null;
};

const toResolutionEvidence = (
  task: TaskResource,
  category: string,
): ReconciliationResult["transition_safety_packet"]["resolution_evidence"][number] => ({
  reference: `Task/${task.id}`,
  resource_type: "Task",
  resource_id: task.id,
  role: "resolution_evidence",
  summary: task.code?.text ?? `Task ${task.id} completed`,
  supports: [toCanonicalCategory(category)].filter(
    (value): value is ReconciliationResult["transition_safety_packet"]["resolution_evidence"][number]["supports"][number] => Boolean(value),
  ),
  source: "FHIR",
});

export const applyTaskResolutionAndRearbitration = async (
  taskPrompt: string,
  reconciled: ReconciliationResult,
): Promise<ReconciliationResult> => {
  if (!shouldProcessResolutionPrompt(taskPrompt)) {
    return reconciled;
  }

  const packet = reconciled.transition_safety_packet;
  const fhirServer = packet.fhir_server;
  const encounterReference = reconciled.deterministic.fhir_context?.encounter_reference;

  if (!fhirServer || !encounterReference) {
    return reconciled;
  }

  const taskBundle = isPromptOpinionBrowserAuthEnabled()
    ? readBundleViaPromptOpinionBrowserAuth(
        `Task?encounter=${encodeURIComponent(encounterReference)}&_count=50`,
      )
    : await searchFhirResources(
        fhirServer,
        "Task",
        [`encounter=${encounterReference}`, "_count=50"],
      );
  const taskEntries = Array.isArray(taskBundle["entry"])
    ? (taskBundle["entry"] as Array<{ resource?: unknown }>)
    : [];
  const tasks = taskEntries
    .map((entry) => toTaskResource(entry.resource))
    .filter((task): task is TaskResource => Boolean(task));

  if (tasks.length === 0) {
    return reconciled;
  }

  const completedWrites: typeof packet.fhir_resources_written = [];
  const completedCategories: string[] = [];
  const useBrowserCookieReadOnly = isPromptOpinionBrowserAuthEnabled();

  for (const task of tasks) {
    const category = taskCategory(task);
    if (!category) {
      continue;
    }

    if (useBrowserCookieReadOnly) {
      if (task.status === "completed") {
        completedCategories.push(category);
      }
      continue;
    }

    if (task.status === "completed" || !shouldCompleteTask(category, taskPrompt)) {
      continue;
    }

    const updatedTask: TaskResource = {
      ...task,
      status: "completed",
      note: [
        ...(task.note ?? []),
        {
          text: `Resolution prompt applied: ${taskPrompt}`,
        },
      ],
    };

    await upsertFhirResource(fhirServer, updatedTask as unknown as Record<string, unknown>);
    completedWrites.push({
      reference: `Task/${task.id}`,
      resource_type: "Task",
      resource_id: task.id,
      timestamp: new Date().toISOString(),
      summary: `Task completed: ${task.code?.text ?? task.id}`,
      linked_evidence_references: (task.reasonReference ?? [])
        .map((item) => item.reference)
        .filter((reference): reference is string => Boolean(reference)),
    });
    completedCategories.push(category);
  }

  const refreshedBundle = useBrowserCookieReadOnly
    ? taskBundle
    : await searchFhirResources(
        fhirServer,
        "Task",
        [`encounter=${encounterReference}`, "_count=50"],
      );
  const refreshedEntries = Array.isArray(refreshedBundle["entry"])
    ? (refreshedBundle["entry"] as Array<{ resource?: unknown }>)
    : [];
  const refreshedTasks = refreshedEntries
    .map((entry) => toTaskResource(entry.resource))
    .filter((task): task is TaskResource => Boolean(task));

  const unresolvedCategories = refreshedTasks
    .filter((task) => task.status !== "completed")
    .map((task) => taskCategory(task))
    .filter((category): category is string => Boolean(category))
    .map((category) => toCanonicalCategory(category))
    .filter(
      (category): category is ReconciliationResult["transition_safety_packet"]["reconciled_transition_status"]["blocker_categories"][number] =>
        Boolean(category),
    );

  const updatedFinalVerdict = unresolvedCategories.length === 0 ? "ready_with_caveats" : "not_ready";
  const resolvedLabel = completedCategories.length > 0 ? completedCategories.join(", ") : "none";
  const unresolvedLabel = unresolvedCategories.length > 0 ? unresolvedCategories.join(", ") : "none";

  return {
    ...reconciled,
    final_verdict: updatedFinalVerdict,
    manual_review_required: true,
    contradiction_summary:
      `Previous status ${reconciled.final_verdict}; updated status ${updatedFinalVerdict}. ` +
      `Resolved gates: ${resolvedLabel}. Remaining unresolved gates: ${unresolvedLabel}.`,
    transition_safety_packet: {
      ...packet,
      resolution_evidence: refreshedTasks
        .filter((task) => task.status === "completed")
        .map((task) => {
          const category = taskCategory(task) ?? "administrative_and_documentation";
          return toResolutionEvidence(task, category);
        }),
      fhir_resources_written: [...packet.fhir_resources_written, ...completedWrites],
      reconciled_transition_status: {
        ...packet.reconciled_transition_status,
        final_verdict: updatedFinalVerdict,
        blocker_categories: unresolvedCategories,
        manual_review_required: true,
        why_changed:
          `Previous status ${reconciled.final_verdict}; updated status ${updatedFinalVerdict}. ` +
          `Resolved gates: ${resolvedLabel}. Remaining unresolved gates: ${unresolvedLabel}.`,
      },
      trace: {
        ...packet.trace,
      },
    },
  };
};
