# Phase 10 ExecPlan — FHIR-Native Discharge Control Plane

## Objective

Finish the remaining real Phase 9 reliability work, then implement Phase 10 as a FHIR-native discharge control plane.

This run is **not** a final submission-polish run. It should not spend time on Devpost copy, final judge deck, final README polish, or video script unless a small technical note is required to explain implemented runtime behavior.

## Source of Truth

Before editing, read:

- `docs/phase9-winning-proposal.md`
- `docs/phase9-execplan.md`
- `docs/transition-safety-packet-spec.md`
- `docs/final-demo-script-phase9.md`
- `docs/phase9-agent-operating-protocol.md`
- current Phase 9 commits on `fix/phase8.6-a2a-latency-recovery`
- `output/prompt-opinion-e2e/baseline-goal-completion-audit.md`
- `docs/phase10-fhir-native-control-plane.md`
- this file

## Important Context

Phase 9 Waves 1–4 are expected to be already committed:

1. Transition Safety Packet
2. Evidence-first Prompt 2 / compact Prompt 3
3. Safety invariants
4. Scenario matrix + medication-access scenario

Phase 9 remaining work should be limited to release-gate reliability and final technical cleanup needed before Phase 10.

Skip Phase 9 judge/submission docs for now.

## Work Style

- Create a run folder: `output/phase10/runs/<timestamp>/`
- Write an ExecPlan before editing.
- Break work into waves.
- Commit after each coherent wave.
- Keep commits small and meaningful.
- Run targeted tests after each wave.
- Keep a `wave-status.md` and `test-log.md`.
- Do not push unless explicitly instructed.
- Keep `git status` clean at the end.
- Do not call the goal complete after only planning or docs.

Suggested commit style:

```text
fix(test): complete phase9 release-gate cleanup
feat(fhir): add phase10 fhir bundle seeding
feat(fhir): ingest discharge context from fhir resources
feat(fhir): add evidence ledger resource provenance
feat(fhir): write discharge-blocking tasks
feat(fhir): write provenance and audit events
feat(fhir): add task polling re-arbitration
test(fhir): add held-out patient fhir scenario pack
docs(phase10): record implementation audit
```

## Wave 0 — Inventory and Phase 9 State Reconciliation

### Goal

Understand current repo state and confirm what Phase 9 has already implemented.

### Tasks

1. Confirm branch and commit.
2. Confirm Phase 9 Waves 1–4 commits are present.
3. Inspect current modified/untracked files.
4. Identify current scripts/tests relevant to:
   - DGK readiness
   - Clinical Intelligence hidden risk
   - transition narrative
   - A2A orchestrator
   - Prompt Opinion proof
   - scenario matrix
   - FHIR utilities/client
5. Write `output/phase10/runs/<timestamp>/phase10-execplan.md`.
6. Update `wave-status.md`.

### Acceptance

- Repo state understood.
- No accidental overwrite of Phase 9 work.
- No implementation begins before plan is written.

## Wave 1 — Finish Phase 9 Release-Gate Reliability

### Goal

Finish the remaining real Phase 9 engineering work: reliable tests/cleanup.

### Tasks

1. Investigate known runtime boot / package test hang issues.
2. Ensure smoke tests clean up spawned processes.
3. Add timeout/cleanup traps where needed.
4. Run typechecks for:
   - `po-community-mcp-main/typescript`
   - `po-community-mcp-main/clinical-intelligence-typescript`
   - `po-community-mcp-main/external-a2a-orchestrator-typescript`
5. Run relevant smokes with reasonable timeouts.
6. Run `lsof` cleanup check on known ports:
   - 5055
   - 5056
   - 5057
   - 5080
   - 4040
7. If full `npm test` cannot be made safe quickly, document exact fallback commands and the reason.

### Acceptance

- Test lifecycle issue fixed or explicitly documented.
- No orphaned listeners remain.
- Phase 9 release-gate reliability status is green or clearly yellow with fallback commands.
- Commit this wave.

## Wave 2 — FHIR Bundle Pack and Seeder

### Goal

Create real FHIR R4-shaped patient bundles and a repeatable seeding/loading path.

### Patients

1. Maria Alvarez — canonical trap/regression
2. Daniel Brooks — held-out demo patient
3. Eleanor Singh — functional/cognitive risk
4. Olivia Chen — clean control

### Resources

Each patient should use a coherent subset of:

- `Patient`
- `Encounter`
- `Condition`
- `Observation`
- `MedicationRequest`
- `ServiceRequest`
- `CarePlan`
- `DocumentReference`
- `PractitionerRole`
- optional `Task`
- optional `Provenance`
- optional `AuditEvent`

### Implementation Options

Preferred:

- `fixtures/fhir/bundles/*.json`
- `scripts/seed-fhir-bundles.ts`
- support for a configured FHIR base URL:
  - default local/mock path
  - optional public HAPI path

Fallback:

- local FHIR Bundle loader if public HAPI is unavailable/flaky
- still use real FHIR R4 resource shapes and IDs

### Requirements

- Use stable deterministic resource IDs where possible.
- Avoid patient-name-specific logic.
- Include timestamps.
- Include enough structured resources for baseline readiness.
- Include narrative evidence in `DocumentReference`.
- Include contradiction evidence in actual FHIR resources where possible, especially `Observation`.

### Acceptance

- Bundle validation/shape smoke exists.
- Seeder or loader runs.
- Daniel and Olivia are included.
- Commit this wave.

## Wave 3 — FHIR Ingestion Path

### Goal

Use actual FHIR resources as runtime input, not only handcrafted fixture JSON.

### Tasks

1. Wire existing `FhirClient` / FHIR context utilities into a runtime path.
2. Add a tool/function that can read patient discharge context from FHIR:
   - by patient ID
   - by encounter ID
   - by FHIR base URL
3. Fetch/search relevant resources:
   - Patient
   - Encounter
   - Observations
   - MedicationRequests
   - ServiceRequests
   - CarePlans
   - DocumentReferences
4. Normalize them into the existing DGK/CI input shapes.
5. Preserve resource IDs in the normalized context.

### Acceptance

- Smoke test proves:
  - FHIR resources are read
  - resource IDs are preserved
  - structured baseline can be produced from FHIR-derived context
  - narrative documents reach Clinical Intelligence
- No existing non-FHIR demo path is broken.
- Commit this wave.

## Wave 4 — FHIR Evidence Ledger

### Goal

Upgrade the Transition Safety Packet from prose evidence to FHIR resource provenance.

### Required Packet Fields

Add or surface:

```json
{
  "fhir_server": "...",
  "fhir_resources_read": [],
  "controlling_evidence": [],
  "superseded_evidence": [],
  "fhir_resources_written": []
}
```

Each evidence item should include:

- resource type
- resource id/reference
- timestamp if available
- role:
  - structured baseline
  - narrative contradiction
  - controlling evidence
  - superseded evidence
  - resolution evidence
- short human-readable summary

### Acceptance

- Maria packet cites FHIR resource references.
- Daniel packet cites FHIR resource references.
- Olivia packet has no fabricated hidden-risk evidence.
- Existing evidence anchors still visible in Prompt Opinion-friendly text.
- Commit this wave.

## Wave 5 — FHIR Task Write-Back

### Goal

When final status is `not_ready`, create real FHIR `Task` resources representing discharge-blocking work.

### Task Requirements

Each Task should include:

- `resourceType: "Task"`
- `status: "requested"` or equivalent
- `intent`
- `priority`
- `for` reference
- `encounter` reference
- `owner` reference where available
- `code.text`
- `reasonReference` pointing to blocking evidence
- concise `note`
- stable metadata/tag identifying Care Transitions Command

### Gates

Create Tasks for blocker categories such as:

- clinical stability
- equipment / DME / transport
- home support
- medication access
- functional mobility / fall risk
- patient education / teach-back
- home monitoring

### Invariant

Add:

```text
no_task_without_fhir_source
```

A Task must not be written unless it has at least one cited FHIR evidence resource.

### Acceptance

- Maria `not_ready` creates blocking Tasks.
- Daniel `not_ready` / `ready_with_caveats` creates appropriate Tasks.
- Olivia `ready` creates no blocking Tasks.
- Created Task IDs are returned in packet.
- Commit this wave.

## Wave 6 — Provenance and AuditEvent Write-Back

### Goal

Create FHIR-native evidence and audit records.

### Provenance

For each created Task, write a `Provenance` resource linking:

- target Task
- source evidence resources
- CTC/MCP agent
- timestamp

### AuditEvent

For each verdict and re-arbitration, write an `AuditEvent` resource recording:

- patient
- encounter
- verdict
- agent/system
- evidence resources
- outcome
- timestamp

### Acceptance

- Task write-back creates associated Provenance.
- Initial verdict creates AuditEvent.
- Re-arbitration creates a second AuditEvent.
- Packet includes created Provenance/AuditEvent IDs.
- Commit this wave.

## Wave 7 — Polling-Based Re-Arbitration Loop

### Goal

Make the system a control plane, not a one-shot checker.

### Core Loop

```text
Initial assessment
  → create blocking Tasks
  → simulate/update Task completions
  → poll/search Tasks by encounter
  → re-arbitrate readiness
  → write updated AuditEvent/Provenance
  → output updated packet
```

### Tasks

1. Add a task polling function/script/tool.
2. Add controlled Task completion updates for demo/eval.
3. Add re-arbitration logic that:
   - does not clear status until all required gates are resolved
   - preserves unresolved gates
   - cites resolution evidence
   - writes updated AuditEvent
4. Add smoke tests for partial and full resolution.

### Acceptance

Maria:

- initial status: `not_ready`
- after one Task completion: still `not_ready`
- after all required gates resolved: `ready_with_caveats` or configured conservative status

Daniel:

- demonstrates at least one partial resolution state.

Olivia:

- no blocking Tasks and no fake re-arbitration loop.

Commit this wave.

## Wave 8 — Held-Out Patient Proof

### Goal

Make Daniel Brooks the high-quality held-out demo patient.

### Requirements

Daniel must run through the same machinery as Maria:

```text
FHIR Bundle
  → FHIR ingestion
  → structured baseline
  → narrative contradiction
  → evidence ledger
  → Task write-back
  → Provenance/AuditEvent
  → optional re-arbitration
```

### Daniel Clinical Pattern

Structured baseline appears ready:

- vitals stable enough
- oral medication plan
- follow-up scheduled
- discharge instructions present

Hidden contradiction:

- medication access blocked
- prior authorization/bridge supply issue
- new orthopnea or weight change
- home scale/monitoring gap

Expected:

- `not_ready` or `ready_with_caveats`
- Tasks for medication access, clinical reassessment, home monitoring/education
- no Maria-specific oxygen/stairs assumptions

### Acceptance

- Daniel has its own FHIR resources.
- Daniel output is not using Maria-specific strings or logic.
- Daniel works in scenario/eval.
- Commit this wave.

## Wave 9 — Final Technical Validation

### Goal

Prove Phase 10 without drifting into submission polish.

### Run

Minimum:

- `git diff --check`
- typecheck all three packages
- relevant DGK readiness smoke
- Clinical Intelligence hidden-risk smoke
- transition narrative smoke
- scenario matrix/eval
- FHIR bundle validation
- FHIR seed/load smoke
- FHIR ingestion smoke
- Task write-back smoke
- Provenance/AuditEvent smoke
- re-arbitration smoke
- A2A orchestrator compatibility smoke
- lsof cleanup check

Then refresh Prompt Opinion proof if Phase 10 affects visible output:

- Direct-MCP visible proof
- combined proof if available
- fresh reproducibility proof if feasible

Known working provider/model from previous baseline:

- GoogleFree
- gemini-3.1-flash-lite

### Acceptance

- Final audit exists:
  - `output/phase10/runs/<timestamp>/final-phase10-completion-audit.md`
- Audit includes:
  - commits
  - files changed
  - tests run
  - pass/fail status
  - FHIR server/base URL used
  - FHIR resources read/written
  - Prompt Opinion proof status
  - open risks
  - exact next action
- Git status clean.
- Do not push unless explicitly instructed.

## Goal Completion Criteria

The goal is complete only when all are true:

1. Phase 9 release reliability is completed or explicitly documented.
2. FHIR bundles exist for Maria, Daniel, Eleanor, Olivia.
3. FHIR seeding/loading works.
4. Runtime can ingest FHIR resources.
5. Transition packets include FHIR resource provenance.
6. `not_ready` writes FHIR Tasks.
7. Tasks have FHIR source references.
8. Provenance is written for Tasks.
9. AuditEvents are written for verdicts.
10. Polling-based re-arbitration works.
11. Daniel held-out scenario passes.
12. Olivia clean control writes no blocking Tasks.
13. Safety invariants include FHIR-specific checks.
14. Final validation is run and logged.
15. Coherent commits exist.
16. Git status is clean.
17. Final audit honestly reports remaining risks.

Do not call `update_goal` until these criteria are met.
