# Care Transitions Command

**Evidence is what confers discharge authority.**

---

Care Transitions Command is a care-transitions control system built for Prompt Opinion. It uses two MCPs and an external A2A orchestrator to catch the hidden discharge risk when the contradiction lives in narrative evidence, not in the clean structured snapshot.

The structured chart can say the patient is ready. Vitals stable. Medications reconciled. Follow-up arranged. And a 10:40 PM nursing note — written after the last round, after the morning team assessment — can document that the patient desaturated to 82% on room air after six stairs, has no oxygen available at home tonight, and lives alone in a third-floor walk-up with no overnight support.

The chart does not see any of that. The system does.

---

## The core primitive

Blocking evidence creates FHIR Tasks. Task completion is what opens the gate. The system holds discharge until the FHIR layer says otherwise.

This is not a metaphor. When the Clinical Intelligence MCP surfaces a hidden risk, the orchestrator writes FHIR `Task` resources — one per blocking canonical category — with `reasonReference` pointing to the exact `DocumentReference` that produced the finding. `Provenance` and `AuditEvent` resources are written for each Task. The discharge posture is re-arbitrated when follow-on prompts signal task resolution. The gate state lives in FHIR, not in a conversation thread.

---

## System identity

| Component | Role |
|---|---|
| **Discharge Gatekeeper MCP** | Deterministic structured discharge spine. Reads FHIR resources, normalizes patient context, produces a structured baseline verdict from bounded evidence across eight canonical blocker categories. |
| **Clinical Intelligence MCP** | Narrative contradiction intelligence. Inspects note and document evidence for hidden risks that contradict the structured posture. Returns citation-anchored findings with typed safety invariant evaluations. |
| **External A2A Orchestrator** | Prompt-level coordination. Calls both MCPs in sequence, fuses deterministic and narrative evidence into one answer, writes FHIR Tasks and Provenance, handles re-arbitration, and enforces the synchronous A2A task-lifecycle contract. |

---

## The 3-prompt demo

The canonical demo proves this sequence in three prompts inside Prompt Opinion:

**Prompt 1 — `Is this patient safe to discharge today?`**
The structured baseline is `ready`. After hidden-risk review, the reconciled verdict is `not_ready`. Both postures are visible. Hidden-risk review status is explicit, not implied.

**Prompt 2 — `What hidden risk changed that answer? Show me the contradiction and the evidence.`**
The contradiction in precise language. Citation anchors to the exact note — `Nursing Note 2026-04-18 20:40`. Canonical blocker categories. No transition-package noise. This is the decisive moment.

**Prompt 3 — `What exactly must happen before discharge, and prepare the transition package.`**
FHIR Tasks written with `reasonReference`. Provenance chain recorded. Prioritized next steps with owner roles (`bedside_rn`, `case_manager`, `covering_clinician`) and timing. Clinician handoff brief. Patient-safe hold instructions. Re-arbitration path documented.

---

## Canonical blocker taxonomy

Eight canonical categories enforced across all components:

```
clinical_stability
pending_diagnostics
medication_reconciliation
follow_up_and_referrals
patient_education
home_support_and_services
equipment_and_transport
administrative_and_documentation
```

Canonical verdicts: `ready` | `ready_with_caveats` | `not_ready`

---

## Validated patient scenarios

Four complete FHIR R4 transaction bundles are included:

| Patient | Hidden risk |
|---|---|
| **Maria Alvarez** | Exertional desaturation to 82% on stair trial. Home oxygen unavailable. No overnight support. Third-floor walk-up. |
| **Daniel Brooks** | Medication reconciliation contradiction in a discharge summary draft. Bridge supply not arranged. |
| **Eleanor Singh** | Home support failure documented only in a social worker's narrative note, absent from the structured plan. |
| **Olivia Chen** | DME delivery delayed to the following morning, documented only in case management notes. |

Each bundle contains `Patient`, `Encounter`, `Condition`, `Observation`, `MedicationRequest`, `ServiceRequest`, `CarePlan`, `DocumentReference`, and `PractitionerRole` resources. The CI MCP reads `DocumentReference.content[].attachment.data` and maps content to typed `FhirNarrativeEvidenceSource` objects carrying `fhir_reference`, `fhir_resource_type`, and `fhir_resource_id`.

---

## Safety invariants

Six typed safety invariants are evaluated programmatically on every CI MCP response:

| Invariant | What it checks |
|---|---|
| `structured_baseline_preserved` | Final answer references the structured posture, not only narrative reasoning |
| `no_uncited_escalation` | Every escalation to `not_ready` carries a citation anchor |
| `no_ready_with_active_hidden_blocker` | A confirmed hidden blocker cannot coexist with a `ready` final verdict |
| `manual_review_on_uncertainty` | Inconclusive findings produce `manual_review_required` language, not fabricated risk |
| `duplicate_signal_suppression` | Duplicate evidence sources do not produce duplicate blocker categories |
| `no_task_without_fhir_source` | No FHIR Task is written without a traceable FHIR source reference |

---

## FHIR write-back shape

```
Task
  status: "requested"
  priority: "urgent" | "asap"
  code.text: <action derived from blocking evidence>
  reasonReference: [ { reference: "DocumentReference/{id}" } ]
  meta.tag: [
    { system: "https://care-transitions-command.local/tags", code: "ctc-generated" },
    { system: "...", code: "ctc-category-{canonical_category}" }
  ]

Provenance
  target: [ { reference: "Task/{id}" } ]
  agent: [ { who.display: "CareTransitionsCommand / external A2A orchestrator" } ]
  entity: [ { role: "source", what.reference: "DocumentReference/{id}" } ]
  recorded: <ISO timestamp>

AuditEvent
  action: "C"
  recorded: <ISO timestamp>
  agent: [ { name: "CareTransitionsCommand" } ]
  entity: [ { reference: "Task/{id}" } ]
```

---

## Re-arbitration

The orchestrator polls the FHIR store when a follow-on prompt signals resolution. Resolution patterns are matched by canonical category:

```
clinical_stability    → "exertional reassessment passed" | "oxygen reassessment passed"
equipment_and_transport → "oxygen delivery confirmed" | "vendor confirmed"
home_support_and_services → "overnight support confirmed" | "caregiver confirmed"
medication_reconciliation → "medication bridge approved" | "prior authorization resolved"
```

Resolved Tasks are marked `completed`. Remaining open Tasks determine the updated posture. The gate re-opens only when all blocking Tasks are resolved.

---

## Smoke and release gates

| Check | What it validates |
|---|---|
| `smoke:runtime` | Agent card shape, synchronous task envelope, request/task correlation |
| `smoke:decision-matrix` | All 12 reconciliation matrix rows against live behavior |
| `smoke:orchestrator` | Trap / control / inconclusive / no-risk contradiction quality |
| `smoke:phase2-two-mcp` | Note-dependent escalation, clean control, citation traceability |
| `safety-invariants-smoke` | Six typed invariants on trap, clean control, duplicate signal, inconclusive |
| `fhir-task-writeback-smoke` | Task creation, `reasonReference` correctness, tag structure |
| `fhir-rearbitration-smoke` | Task completion signals, gate re-evaluation |
| `fhir-audit-writeback-smoke` | `Provenance` and `AuditEvent` resource shape |
| `fhir-heldout-scenarios-smoke` | Daniel, Eleanor, Olivia — held-out patients |
| `prompt-opinion-compatibility-smoke` | A2A envelope compatibility with `message/send` |

---

## Demo surface and lane status

Primary live demo path: Direct-MCP 3 prompts in Prompt Opinion (Discharge Gatekeeper MCP for Prompt 1, Clinical Intelligence MCP for Prompts 2 and 3).

Architecture proof path: one-turn Prompt Opinion → external A2A orchestrator → both MCPs → one synchronous reconciled response.

Lane promotion rule: `A2A-main` is the live primary lane only when the current run folder marks both `A2A-main` and `Direct-MCP fallback` as `green`. If `A2A-main` is `yellow` or `red` and `Direct-MCP fallback` is `green`, run the fallback lane and keep the architecture narration accurate.

Run-folder status source of truth: `output/prompt-opinion-e2e/latest/reports/status-summary.md`

---

## FHIR proof scope

The system runs on a local FHIR R4 store and probes public HAPI FHIR endpoints. Prompt Opinion FHIR context forwarding is currently constrained by platform scope registration. The backend produces correct FHIR output validated by the task-writeback, audit-writeback, and rearbitration smoke checks. Run-folder evidence records the wire-level A2A response shape and the platform-side rendering constraint.

---

## Locked architecture constraints

```
2 MCPs + 1 external A2A
no custom frontend
no third MCP
synchronous external A2A request/response only
no A2A streaming
Prompt Opinion is the only user-facing surface
```

These do not change without an explicit logged decision in `docs/decisions.md`.

---

## Document map

| Document | Purpose |
|---|---|
| [`PLAN.md`](PLAN.md) | Live priorities, phase sequence, active workstreams |
| [`docs/product-brief.md`](docs/product-brief.md) | Product thesis and scope |
| [`docs/architecture.md`](docs/architecture.md) | Component boundaries and end-to-end request flow |
| [`docs/demo-script.md`](docs/demo-script.md) | Prompt-by-prompt demo spec with narration lines and fallback rules |
| [`docs/phase0-trap-patient-spec.md`](docs/phase0-trap-patient-spec.md) | Canonical demo patient: structured picture, note bundle, expected system behavior |
| [`docs/decisions.md`](docs/decisions.md) | All cross-workstream architectural decisions with dates and rationale |
| [`docs/submission-checklist.md`](docs/submission-checklist.md) | Pre-recording and pre-submission gate checks |
| [`docs/prompt-opinion-integration-runbook.md`](docs/prompt-opinion-integration-runbook.md) | Step-by-step Prompt Opinion operator path |
| [`docs/evals.md`](docs/evals.md) | Evaluation matrices and quality gate definitions |
| [`AGENTS.md`](AGENTS.md) | Agent operating rules and non-goals |

---

## Safety framing

The system supports human review. It does not claim autonomous discharge authority. It cannot authorize a discharge. It can hold one by surfacing evidence that a human reviewer must act on. Every finding is citable. Every escalation carries a citation anchor. Every Task carries a `reasonReference`. The audit trail is immutable.
