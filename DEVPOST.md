# Care Transitions Command

## Inspiration

Discharge is where clean structured confidence and messy real-world failure collide.

The chart can say:

- vitals stabilized
- medications entered
- follow-up ordered

And the actual discharge can still be unsafe because the contradiction shows up late:

- the medication will not actually be available tonight
- the patient’s symptoms changed after the morning snapshot
- the home support plan is weaker than the structured chart suggests

We wanted to build a system that does not just summarize that situation, but changes the operational state because of it.

## What it does

Care Transitions Command is a Prompt Opinion-native discharge control plane built from:

- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

The core primitive is:

**Blocking evidence creates FHIR Tasks. Task completion opens the gate. The system holds discharge until the FHIR layer says otherwise.**

In the held-out Daniel Brooks demo:

- the structured chart looks discharge-ready
- a pharmacy note shows medication access failure
- a nursing note shows orthopnea and late symptom change
- a case-management note shows pickup logistics failure

The system escalates to `not_ready`, cites the contradiction, writes blocking FHIR Tasks, records Provenance and AuditEvent artifacts, and re-arbitrates when some tasks resolve.

## How it works

Structured EHR resources — observations, medications, orders — flow through Prompt Opinion’s FHIR context. Narrative notes live in the care documentation layer, accessed through the Clinical Intelligence MCP.

The judged direct lane uses Prompt Opinion Patient Scope with `Care Transitions Command BYO Fallback`.
The architecture-proof lane keeps the synchronous `external A2A orchestrator`.

Flow:

1. Prompt Opinion forwards Patient Scope context.
2. `Discharge Gatekeeper MCP` computes the structured baseline.
3. `Clinical Intelligence MCP` reconciles note contradiction against that baseline.
4. Blocking evidence becomes FHIR `Task` resources.
5. The system writes `Provenance` and `AuditEvent` artifacts.
6. Prompt 4 polls task state and re-arbitrates from the FHIR layer.

Concrete Daniel task example:

```json
{
  "resourceType": "Task",
  "id": "047009c1-0969-4aa8-a506-1cf622def0a5",
  "status": "requested",
  "for": {
    "reference": "Patient/db4b066b-200f-405f-9fe4-c52eefbc1425"
  },
  "reasonReference": {
    "reference": "DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14"
  },
  "code": {
    "text": "Resolve medication access or bridge supply before discharge proceeds."
  }
}
```

## Live FHIR Workspace Evidence

After a complete Daniel Brooks discharge assessment, the following resources exist on Prompt Opinion's FHIR server:

### Blocking Evidence

- `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500` — Nursing Note 2026-04-19 18:40
- `DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14` — Case Management Note 2026-04-19 19:05
- `DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69` — Pharmacy Note 2026-04-19 18:15

### Discharge-Blocking Tasks

- `Task/21ee518a-26f2-44c8-a36b-68c1f804a6b2` — `patient_education` — `requested`
  - `reasonReference: DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`
- `Task/047009c1-0969-4aa8-a506-1cf622def0a5` — `medication_reconciliation` — `requested`
  - `reasonReference: DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14`
- `Task/4e18de12-102b-41ee-8d56-98d5bf96d85a` — `clinical_stability` — `requested`
  - `reasonReference: DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`

### Provenance Chains

- `Provenance/a88df349-78d0-45f8-a420-d63e1bf1d3e5` → `Task/4e18de12-102b-41ee-8d56-98d5bf96d85a` ← `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`

### Audit Trail

- No PO `AuditEvent` resources are currently present for Care Transitions Command.
- `AuditEvent` write is still blocked by PO parser constraints; the live FHIR chain currently proves `DocumentReference` + `Task` + `Provenance`.

## How we built it

- TypeScript MCP runtimes for DGK and Clinical Intelligence
- synchronous A2A runtime with `/tasks`, `/message:send`, and JSON-RPC surfaces
- FHIR-shaped seeded bundles for Daniel, Maria, Eleanor, and Olivia
- local FHIR store for deterministic demo proof
- Prompt Opinion Patient Scope integrations
- FHIR Task / Provenance / AuditEvent write-back
- polling re-arbitration instead of depending on webhook/subscription infrastructure

## Challenges we ran into

- getting Prompt Opinion Patient Scope, MCP execution, and visible proof standards to line up
- avoiding stale ngrok/runtime state during repeated live proofs
- keeping the A2A lane honest instead of hiding behind backend-only evidence
- making Daniel work as a held-out case instead of a Maria-specific overfit path
- proving FHIR-native writeback without overclaiming production EHR connectivity

## Accomplishments that we're proud of

- a held-out Daniel Brooks discharge contradiction lane that writes real FHIR coordination artifacts
- a clean Olivia Chen control path that stays `ready` and writes zero blocking Tasks
- a Prompt 4 re-arbitration loop that does not falsely clear all gates while `clinical_stability` remains unresolved
- inspectable evidence lineage through `Task`, `Provenance`, and `AuditEvent`
- a locked `2 MCPs + 1 external A2A` architecture with no custom frontend

## What we learned

- the strongest healthcare AI moment is not “LLM summary,” it is contradiction detection with bounded evidence
- the product becomes more credible when evidence changes control-plane state, not when the model just describes what should happen
- polling re-arbitration is a far more reliable proof primitive than claiming real webhook/subscription behavior we cannot demonstrate

## What's next for Care Transitions Command

- stabilize one completely fresh Prompt Opinion browser-proof bundle across Daniel Prompt 1–4 plus Olivia clean control
- keep A2A as a provable synchronous architecture lane with stronger visible rendering
- improve final evidence packaging and judge-facing proof audits
- keep expanding held-out scenario coverage without changing the locked architecture

## Safety and feasibility

- no autonomous discharge authority
- no production hospital deployment claim
- no full Epic SMART integration claim
- no real FHIR Subscription/webhook claim
- no clinician replacement claim

For local demo mode, Prompt Opinion patient UUIDs for Daniel, Maria, and Olivia are mapped into seeded local FHIR bundles so the system can honestly prove FHIR-native reads, Task write-back, Provenance, AuditEvent, and polling re-arbitration without pretending it is connected to a production EHR.

## Proof artifacts

- endgame run folder: `output/endgame/runs/20260510T101519Z/`
- PO workspace proof summary:
  - `output/endgame/runs/20260510T101519Z/po-fhir-workspace-proof/po-fhir-workspace-proof-summary.md`
- Prompt Opinion historical proof bundles: `output/prompt-opinion-e2e/runs/`
- held-out patients:
  - Daniel Brooks
  - Olivia Chen
  - Eleanor Singh
  - Maria Alvarez

Daniel is the held-out live demo patient.
Olivia is the clean control.
Eleanor remains required scenario-matrix coverage.
