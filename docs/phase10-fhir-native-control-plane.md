# Phase 10 — FHIR-Native Discharge Control Plane

## Status

Phase 9 made Care Transitions Command cleaner, safer, and more credible:

- Transition Safety Packet surfaced in runtime outputs.
- Evidence-first contradiction rendering improved the “holy-shit” moment.
- Compact transition package reduced timeout/verbosity risk.
- Safety invariants became testable.
- Scenario/control evidence started addressing overfit concerns.

But Phase 9 is still vulnerable to the critique:

> The system may be sophisticated prompt/tool orchestration over synthetic fixtures.

Phase 10 exists to break that ceiling.

## Locked Direction

Phase 10 is not a documentation phase and not another formatting pass.

Phase 10 turns Care Transitions Command into a **FHIR-native discharge control plane**:

> The system reads real FHIR-shaped resources, detects the contradiction that structured data missed, writes real FHIR care-coordination artifacts, records provenance/audit trails, and re-arbitrates readiness when those care-team tasks resolve.

## Winning Primitive

**Blocking evidence creates real FHIR coordination work. Readiness only changes when FHIR-backed gates are resolved.**

Alternate judge-facing line:

> Evidence is what confers discharge authority — and blocking evidence creates the care-team work inside FHIR.

## Why This Is the Leap

The previous system could be dismissed as:

> An LLM describing a clinical workflow.

Phase 10 should make that impossible.

The system should now demonstrate:

1. FHIR Bundle ingestion.
2. FHIR resource reads through the MCP runtime.
3. Structured discharge baseline from FHIR resources.
4. Narrative contradiction from FHIR `DocumentReference`/note resources.
5. FHIR `Task` write-back for unresolved discharge gates.
6. FHIR `Provenance` attached to the created coordination artifacts.
7. FHIR `AuditEvent` for verdicts and status transitions.
8. Polling-based re-arbitration after tasks are completed.
9. Multiple patients, including a held-out demo patient.

## Strategic Analogy

The Auth0 winning project did not merely describe GitHub remediation. It opened real PRs under real identity flows.

Care Transitions Command should not merely describe discharge actions. It should create real FHIR coordination objects.

Not:

> “The case manager should confirm oxygen delivery.”

But:

> `Task/discharge-block-equipment-002` exists in the FHIR server, has `Task.reasonReference` pointing to the blocking evidence, and has a `Provenance` chain showing why it was created.

## Core Architecture

```text
Prompt Opinion
  ↓
External A2A Orchestrator / Direct-MCP Lane
  ↓
Discharge Gatekeeper MCP
  ↓
FHIR Ingestion + Structured Baseline
  ↓
Clinical Intelligence MCP
  ↓
FHIR DocumentReference / narrative contradiction
  ↓
FHIR Evidence Ledger
  ↓
FHIR Task Write-Back + Provenance + AuditEvent
  ↓
Polling Watcher / Re-Arbitration Loop
  ↓
Updated Transition Safety Packet
```

## Hard Boundaries

Phase 10 must not become sprawl.

Allowed:

- FHIR R4 Bundle fixtures.
- HAPI/local FHIR sandbox seeding.
- FHIR read/search path using existing FHIR client utilities.
- FHIR resource provenance in packets.
- FHIR Task write-back.
- FHIR Provenance and AuditEvent creation.
- Polling-based Task completion/re-arbitration.
- Optional Subscription resource creation as stretch proof.
- Optional Epic SMART compatibility doc/probe as stretch.

Not allowed as core:

- Building a custom frontend.
- Adding a third MCP.
- Replacing the current Prompt Opinion demo surface.
- Making autonomous discharge claims.
- Building full SMART-on-FHIR OAuth as a required path.
- Depending on real FHIR webhooks/subscriptions for the final proof.
- Overclaiming Epic integration unless it actually works.
- Hardcoding patient-specific names, exact note phrases, or Maria-only logic.

## Core Correction: Polling Over Subscription Dependency

FHIR Subscriptions/rest-hooks are attractive, but public FHIR server webhook delivery may be unreliable or unavailable.

Core loop must be deterministic:

```text
Create Tasks
  → mark Task.status = completed via controlled update
  → poll/search Tasks by encounter
  → re-fetch evidence
  → re-arbitrate readiness
  → write new AuditEvent/Provenance
```

Stretch:

```text
Create Subscription
  → expose ngrok/public webhook
  → capture real notification if server supports it
```

The demo should not depend on external Subscription delivery.

## Phase 10 Patients

### 1. Maria Alvarez — Regression / Canonical Trap

Purpose:

- preserve old hero case
- verify structured ready → hidden contradiction → not_ready
- test oxygen/stairs/home-support gates
- test Task write-back and re-arbitration

### 2. Daniel Brooks — Held-Out Demo Patient

Purpose:

- final demo patient
- different hidden-risk type
- not COPD, not oxygen-only, not Maria
- heart failure + medication access + weight/orthopnea + home monitoring

Final video should use Daniel as the “first-pass” case where possible.

### 3. Eleanor Singh — Functional/Cognitive Risk

Purpose:

- PT/nursing contradiction
- fall risk / stair safety / teach-back / home support
- proves the system handles non-medication, non-oxygen transition failure

### 4. Olivia Chen — Clean Control

Purpose:

- prove the system does not always escalate
- ready → no hidden risk → no blocking Tasks written

## Phase 10 Definition of Done

Phase 10 is complete only when:

1. FHIR Bundle fixtures exist for Maria, Daniel, Eleanor, and Olivia.
2. There is a repeatable seeding/fixture-loading path.
3. The runtime can read FHIR resources and normalize them into discharge context.
4. Transition Safety Packets include FHIR resource references.
5. `not_ready` verdicts create real FHIR `Task` resources.
6. Each created Task has at least one FHIR source reference.
7. Task write-back creates associated `Provenance`.
8. Verdict/re-arbitration creates `AuditEvent`.
9. Polling-based re-arbitration updates readiness after Task completion.
10. Daniel runs through the same machinery as Maria.
11. Olivia does not create false blocking Tasks.
12. Safety invariants include FHIR-specific checks.
13. Final technical validation runs.
14. Prompt Opinion proof is refreshed after Phase 10 changes.
15. Git history contains coherent commits.
16. Final audit honestly reports green/yellow/red status.

## What Phase 10 Should Make Judges Feel

A judge should be able to say:

> “This is not just a prompt over a fake patient. It reads FHIR resources, writes FHIR Tasks, preserves Provenance and AuditEvents, and re-arbitrates readiness from live FHIR state.”

That is the standard.
