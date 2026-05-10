# Care Transitions Command

## Inspiration

In modern identity systems, the architectural principle is precise: approval confers identity. Auth0 does not authenticate a user because a button was clicked — it authenticates because a signed, immutable token was minted, proving that specific claims were evaluated and met. There is no discharge authority without that proof.

Hospital discharge does not work this way. A clinician writes a discharge order, and the patient leaves. The structured chart says stable vitals, reconciled medications, a scheduled follow-up. But buried in a 10:40 PM nursing note — one that ran after the last round, after the formal team assessment, after the hospitalist wrote their plan — is a different story entirely.

The patient desaturated to 82% on room air after six stairs. She said she has no oxygen at home tonight, and her daughter cannot stay. The vendor cannot deliver the concentrator until morning. The chart never sees any of this. The structured discharge spine says `ready`. The system sends the patient home.

**Evidence is what confers discharge authority.** If the evidence does not prove the discharge is safe, the gate should not open. We built Care Transitions Command to be that gate.

---

## What it does

Care Transitions Command is a care-transitions control system that operates inside Prompt Opinion using two MCPs and an external A2A orchestrator. It is not a discharge summary generator. It is not a generic clinical copilot. Its entire purpose is to catch the hidden risk when the contradiction lives in narrative evidence, not in the clean structured snapshot.

When a clinician asks *"Is this patient safe to discharge today?"*, the system runs a two-path analysis in sequence:

**Path 1 — Deterministic structured baseline (Discharge Gatekeeper MCP).** The DGK MCP reads FHIR resources directly: `Patient`, `Encounter`, `Condition`, `Observation`, `MedicationRequest`, `ServiceRequest`, `CarePlan`, `DocumentReference`. It normalizes these resources against a canonical discharge readiness contract, applies a bounded deterministic spine across eight canonical blocker categories, and produces a structured baseline verdict — `ready`, `ready_with_caveats`, or `not_ready` — anchored exclusively to structured evidence.

**Path 2 — Narrative contradiction intelligence (Clinical Intelligence MCP).** The CI MCP receives the structured posture from Path 1 alongside the narrative evidence bundle. It inspects `DocumentReference` content — nursing notes, respiratory therapy notes, physical therapy notes, case management addenda — specifically looking for assertions that contradict the structured posture. It does not summarize. It looks for the contradiction. When it finds one, it returns a structured `hidden_risk_present` finding with citation anchors to the exact source notes, impacted canonical blocker categories, and a bounded explanation of why the structured posture should change.

**Path 3 — Fusion and FHIR write-back (external A2A orchestrator).** The orchestrator fuses both paths into one answer. But it does not stop at assembling prose. If the CI MCP surfaces a hidden risk that escalates the verdict to `not_ready`, the orchestrator writes FHIR `Task` resources — one per blocking evidence category — with `reasonReference` pointing directly to the FHIR `DocumentReference` that produced the blocking finding. Every task is stamped with owner role, priority, and resolution signal pattern. `Provenance` and `AuditEvent` resources are written for each Task, recording the orchestrator as the agent, the evidence sources as entities, and the decision timestamp. This is a regulatory-grade audit trail of why the discharge gate was locked.

**Polling re-arbitration closes the loop.** The system does not emit findings and exit. When a follow-on prompt signals task resolution — a nurse documents that oxygen delivery was confirmed, a case manager documents overnight support secured — the orchestrator scans the FHIR `Task` store for tags matching canonical categories, evaluates completion status against resolution patterns, and re-arbitrates the discharge posture. Task completion is what opens the gate.

The three-prompt demo makes this concrete:

| Prompt | What you ask | What you see |
|---|---|---|
| 1 | `Is this patient safe to discharge today?` | Structured baseline `ready` — then final reconciled verdict `not_ready`. Both postures visible. Hidden-risk review status explicit. |
| 2 | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | The contradiction in plain language. Citation anchors to the exact notes. Canonical blocker categories. No transition-package noise. |
| 3 | `What exactly must happen before discharge, and prepare the transition package.` | FHIR Tasks written with `reasonReference`. Provenance chain recorded. Prioritized next steps with owner roles and timing. Clinician handoff brief. Patient-safe hold instructions. |

---

## How we built it

### Discharge Gatekeeper MCP

The DGK MCP is written in TypeScript and runs as an MCP-compatible server registered directly in Prompt Opinion.

It reads live FHIR context from a local FHIR R4 store (`fhir-store.ts`) or probes HAPI FHIR public endpoints as a fallback. The `live-context.ts` module normalizes retrieved FHIR resources into a typed `RetrievedDischargeContext` — patient, encounter, conditions, observations, medication requests, service requests, care plans, document references, practitioner roles. The `assess-discharge-readiness` logic evaluates this context against a canonical eight-category blocker taxonomy and returns a structured posture with evidence assertions, signal states, and an evidence record that distinguishes structured from narrative sources.

The structured discharge spine is foundational and intentionally boring. Its job is to be inspectable. The narrative intelligence layer is only meaningful because the structured baseline exists.

### Clinical Intelligence MCP

The CI MCP is a separate TypeScript MCP runtime with three tools:

- `SurfaceHiddenRisksTool` — inspects the narrative bundle for contradictions against the structured posture. Uses a dual-provider architecture: a Google Gemini-backed LLM provider for production inference, and a deterministic heuristic provider for local smoke checks and CI gates. Returns a typed `HiddenRiskOutput` with `status`, `hidden_risk_summary`, `citations`, `impacted_blocker_categories`, and `disposition_impact`.

- `AssessReconciledDischargeReadinessTool` — produces a unified `ReconciledDischargeReadinessPayload` that packages the structured baseline verdict alongside the CI finding into one normalized response, including `contract_version: "phase9_reconciled_readiness_v1"`.

- `SynthesizeTransitionNarrativeTool` — the Prompt 3 surface. Builds a `TransitionSafetyPacket` that carries the baseline posture, the contradiction finding, citation anchors, transition actions with owner roles, safety invariant evaluations, and the `FhirEvidenceLedger` — a typed ledger of every FHIR resource read, with each entry classified as `structured_baseline`, `narrative_evidence`, `controlling_evidence`, `superseded_evidence`, or `resolution_evidence`.

The CI MCP enforces six typed safety invariants on every response: `structured_baseline_preserved`, `no_uncited_escalation`, `no_ready_with_active_hidden_blocker`, `manual_review_on_uncertainty`, `duplicate_signal_suppression`, and `no_task_without_fhir_source`. These are evaluated programmatically, not by prompt.

### External A2A Orchestrator

The orchestrator is a TypeScript Express server implementing the synchronous A2A agent-card and task-lifecycle protocol (`/.well-known/agent-card.json`, `POST /tasks`, `GET /tasks/:taskId`). It is registered in Prompt Opinion as an external agent.

The orchestrator runs a prompt-mode detection pass to classify incoming turns as `prompt_1`, `prompt_2`, or `prompt_3`, then calls MCPs in the appropriate order via typed MCP invokers (`mcp/invoker.ts`). Every downstream call is traced with `DownstreamCallDiagnostic` — component, tool name, MCP URL, request ID, HTTP exchanges, duration, propagated headers.

The `reconcile.ts` module applies a 12-row decision matrix that determines the final verdict, whether to invoke hidden-risk review, and how to handle clinical intelligence unavailability. The `synthesis.ts` module produces prompt-aware, contradiction-first responses using explicit evidence anchors and bounded clinical language.

The orchestrator includes an exact-input hidden-risk cache (`hidden-risk-cache.ts`). The cache key is a stable SHA-256 hash of all inputs that could affect the hidden-risk result. Cache entries are only served for `status: "ok"` results with confirmed evidence anchors — the canonical trap patient cache requires `Nursing Note 2026-04-18 20:40` and `Case Management Addendum 2026-04-18 20:55` to be present. Error, inconclusive, and anchor-missing results are never served from cache.

### FHIR Task write-back and audit trail

When the final verdict is `not_ready` with blocking evidence:

1. `task-writeback.ts` creates one FHIR `Task` per blocking canonical category. Each Task carries: status `requested`, priority (`urgent` or `asap` by category), owner role (`bedside_rn`, `covering_clinician`, `pharmacist`, `case_manager`), code text derived from the specific blocking action, and `reasonReference` as an array of FHIR `DocumentReference` references pointing to the exact notes that created the blocker. Tasks are tagged with `ctc-generated` and `ctc-category-{category}` in the `meta.tag` array.

2. `audit-writeback.ts` writes a FHIR `Provenance` resource for each Task — recording the orchestrator as the agent (`CareTransitionsCommand / external A2A orchestrator`), linking evidence source references as entities with `role: "source"`, and stamping the recorded timestamp. An `AuditEvent` is also written, providing a machine-readable record of the CTC system's decision action.

3. `rearbitration.ts` handles polling re-arbitration. When a follow-on prompt matches re-arbitration patterns (`update discharge status`, `re-arbitrate`, `status update`), it searches the FHIR store for CTC-tagged Tasks, evaluates their notes against resolution patterns by canonical category, marks resolved Tasks as `completed`, and re-runs the reconciliation against the remaining open Tasks. If all blocking Tasks are resolved, the posture can advance. The gate state lives in the FHIR layer.

### FHIR fixtures and scenario validation

Four complete FHIR R4 transaction bundles are included (`fixtures/fhir/bundles/`):

- **maria-alvarez.json** — the canonical Phase 0 trap patient. COPD exacerbation with resolving pneumonia. Structured picture: vitals stable, medications reconciled, follow-up arranged. Hidden risk: stair desaturation to 82%, oxygen unavailable, third-floor walk-up, no overnight support.
- **daniel-brooks.json** — medication reconciliation contradiction hidden in a discharge summary draft.
- **eleanor-singh.json** — home support failure documented only in a social worker's narrative note.
- **olivia-chen.json** — delayed equipment delivery buried in case management notes.

Each bundle contains `Patient`, `Encounter`, `Condition`, `Observation`, `MedicationRequest`, `ServiceRequest`, `CarePlan`, `DocumentReference`, and `PractitionerRole` resources. The CI MCP's narrative evidence pipeline reads `DocumentReference.content[].attachment.data` and maps note content to typed `FhirNarrativeEvidenceSource` objects that carry `fhir_reference`, `fhir_resource_type`, and `fhir_resource_id` for direct audit traceability.

### Smoke and release gates

Every component has typed smoke checks that run against the actual runtime, not mocks:

| Check | Target |
|---|---|
| `smoke:runtime` (A2A orchestrator) | Agent card shape, synchronous task response, request/task correlation |
| `smoke:decision-matrix` | All 12 reconciliation matrix rows against live component behavior |
| `smoke:orchestrator` | Trap / control / inconclusive / no-risk flows with contradiction quality assertions |
| `smoke:phase2-two-mcp` | Two-MCP direct integration: note-dependent escalation, clean control bounded behavior, citation quality |
| `safety-invariants-smoke` | Six typed safety invariants on trap, clean control, duplicate signal, and inconclusive inputs |
| `fhir-task-writeback-smoke` | Task creation, `reasonReference` correctness, tag structure |
| `fhir-rearbitration-smoke` | Polling re-arbitration: task completion signals, gate re-evaluation |
| `fhir-audit-writeback-smoke` | `Provenance` and `AuditEvent` resource shape |
| `fhir-heldout-scenarios-smoke` | Daniel, Eleanor, Olivia — held-out patients not used in training or heuristic tuning |
| `prompt-opinion-compatibility-smoke` | A2A task envelope compatibility with Prompt Opinion's `message/send` protocol |

---

## Challenges

**Preventing the narrative layer from hallucinating escalation.** The primary risk was a CI MCP that escalates every patient to `not_ready` regardless of evidence. We solved this through three mechanisms: (1) the safety invariant `no_uncited_escalation` enforced programmatically on every response — any escalation without a citation anchor fails the invariant; (2) a clean control patient fixture that the heuristic provider must not escalate, enforced in smoke checks; and (3) the `inconclusive` and `insufficient_context` response paths that the orchestrator treats as `clinical_intelligence_unavailable`, preserving the deterministic posture rather than defaulting to forced escalation.

**Fusing structured and narrative evidence without losing lineage.** The `FhirEvidenceLedger` was the solution. Each evidence item carries role (`structured_baseline`, `narrative_evidence`, `controlling_evidence`, `superseded_evidence`, `resolution_evidence`), the canonical blocker categories it supports, and a FHIR reference. When a Task is written, its `reasonReference` is populated from the ledger — specifically from `controlling_evidence` items for the matching category. The audit chain is unbroken: from the note in `DocumentReference` to the ledger entry to the Task to the Provenance resource.

**Making the A2A protocol surface spec-correct.** The Prompt Opinion platform validates the agent card strictly. A sparse card shape (`/.well-known/agent-card.json` without declared skills, protocol version, interface declarations, and `text/plain` modes) returned HTTP 422. Correcting the card required precise fields: `protocolVersion`, non-empty `skills` with `id`, `name`, and `description`, `interfaces` with `type: "a2a"` and `supportedVersions`, and `defaultInputModes`/`defaultOutputModes` including `text/plain`. The platform scope registration constraint for FHIR context forwarding was isolated as a platform-side blocker after confirming the backend produced a valid, compact `application/a2a+json` response shape. This is documented in the run-folder evidence rather than hidden behind vague prose.

**Latency under Prompt Opinion's timeout budget.** The hidden-risk cache was introduced specifically for the proof harness. The cache is exact-input: SHA-256 keyed on all inputs that could affect the clinical result, TTL-bounded, and subject to anchor validation before serving. This reduced end-to-end latency from inference-plus-synthesis to cache-hit-plus-synthesis while preserving clinical accuracy — the cache is only served when the full result is present with confirmed citation anchors.

---

## Accomplishments

The core accomplishment is operational: a system where discharge hold is not a prose recommendation. It is a FHIR state. Blocking evidence creates Tasks. Tasks have typed owners, priorities, and resolution signals. Provenance records why each Task exists. Re-arbitration polls the FHIR layer and updates posture as Tasks are completed. The gate is real, not rhetorical.

The secondary accomplishment is safety discipline. Every escalation in the system is citable. Every output is bounded. The six typed safety invariants pass programmatically across four distinct patient profiles. Clean control patients are not escalated. Inconclusive findings trigger `manual_review_required` language, not fabricated risk findings. The system is explicit when Clinical Intelligence MCP is unavailable — it returns `clinical_intelligence_unavailable` and preserves the deterministic posture rather than guessing.

---

## What we learned

**The "why" must be structurally enforced, not described.** A system that says "the patient is not ready" is noise. A system that returns a `Task` resource with `reasonReference: ["DocumentReference/note-rn-contradiction-001"]` and `meta.tag: [{code: "ctc-category-clinical_stability"}]` is evidence that a specific finding was recorded. The difference is not prose quality — it is structural commitment.

**Deterministic baselines are not a concession. They are the product.** The contradiction moment is only possible because the structured spine exists. If the system returned `not_ready` directly from unstructured reasoning, there would be no before-and-after. The judge would see an answer, not a decision. The visible transition from structured `ready` to reconciled `not_ready` — grounded in a specific citable note — is the entire argument.

**Platform boundaries should be isolated in evidence, not papered over in prose.** The Prompt Opinion FHIR context forwarding constraint is documented precisely: the system produces correct FHIR output, the backend is reachable, the A2A task response is well-formed, and the constraint is a scope registration issue on the platform side. This is provably different from an implementation defect. Recording it accurately is more credible than claiming it works when it does not.

---

## What's next

The FHIR control plane generalizes beyond a single patient or a single hospital department. The next concrete direction is extending the re-arbitration polling loop to consume live HL7v2 ADT feeds, so the gate state updates in response to real clinical events rather than follow-on prompts. The second direction is expanding the held-out scenario pack — Daniel, Eleanor, and Olivia demonstrate generality, but a larger scenario set would formalize the statistical argument. The third direction is a formal FHIR `Questionnaire` surface for patient education tasks, which would allow the `patient_education` blocker category to have a structured completion signal rather than a free-text resolution pattern match.

---

## FHIR proof note

The system runs on a local FHIR R4 store and probes public HAPI FHIR endpoints. Prompt Opinion FHIR context forwarding is currently constrained by platform scope registration. The backend produces correct FHIR output — validated by the task-writeback, audit-writeback, and rearbitration smoke checks against the local R4 store. Run-folder evidence in `output/prompt-opinion-e2e/` records the wire-level A2A response shape, request/task correlation, and the platform-side rendering constraint.

---

## Built with

TypeScript, Node.js, MCP SDK, FHIR R4 (local store + HAPI FHIR), Google Gemini API, Prompt Opinion, A2A protocol, Express, Playwright (browser proof harness), ngrok (public A2A path proxy)
