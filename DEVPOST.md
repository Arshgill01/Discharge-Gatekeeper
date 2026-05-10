# Care Transitions Command

## Inspiration

Hospital discharge is where structured certainty and messy real-world risk collide. A chart can look clean: vitals stabilized, discharge meds entered, follow-up placed. The actual failure can still be hiding in a late nursing note, a case-management addendum, or a logistics note that never became a structured blocker.

We built Care Transitions Command to make that contradiction visible before the patient leaves.

## What it does

Care Transitions Command is a Prompt Opinion-native discharge control plane built from:

- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

The primitive is simple:

**Blocking evidence creates FHIR Tasks. Task completion opens the gate. The system holds discharge until the FHIR layer says otherwise.**

In the held-out Daniel Brooks demo, the structured snapshot looks ready. Then late narrative evidence shows:

- medication bridge failure
- orthopnea and weight-change concern
- broken home monitoring
- medication pickup logistics failure

The system escalates to `not_ready`, cites the evidence, writes blocking FHIR Tasks, records Provenance and AuditEvent artifacts, and re-arbitrates after partial task resolution.

## How it works

Structured EHR resources — observations, medications, orders — flow through Prompt Opinion’s FHIR context. Narrative notes live in the care documentation layer, accessed through the Clinical Intelligence MCP.

The direct judged lane uses Prompt Opinion Patient Scope with `Care Transitions Command BYO Fallback`. The architecture-proof lane keeps the synchronous `external A2A orchestrator`.

Flow:

1. Prompt Opinion sends Patient Scope context.
2. `Discharge Gatekeeper MCP` computes the structured baseline from FHIR-shaped resources.
3. `Clinical Intelligence MCP` inspects `DocumentReference` narrative evidence and reconciles contradiction against the baseline.
4. The system writes FHIR `Task` resources for unresolved discharge gates.
5. It writes `Provenance` for task creation and `AuditEvent` for verdict changes.
6. Prompt 4 rereads task state and re-arbitrates from the FHIR layer.

Concrete Task example from the Daniel path:

```json
{
  "resourceType": "Task",
  "status": "requested",
  "for": {
    "reference": "Patient/db4b066b-200f-405f-9fe4-c52eefbc1425"
  },
  "reasonReference": {
    "reference": "DocumentReference/daniel-pharmacy-note-1815"
  },
  "code": {
    "text": "Resolve medication bridge before discharge"
  }
}
```

## How we built it

- TypeScript MCP runtimes for DGK and Clinical Intelligence
- synchronous external A2A runtime with explicit `/tasks`, `/message:send`, and JSON-RPC surfaces
- FHIR-shaped local bundles for Daniel, Maria, Eleanor, and Olivia
- local FHIR store for deterministic demo proof
- Prompt Opinion Patient Scope integrations and MCP/A2A registrations
- FHIR Task, Provenance, and AuditEvent write-back logic
- polling re-arbitration loop instead of depending on webhook/subscription infrastructure

## Challenges

- getting Prompt Opinion Patient Scope and MCP execution to line up with the exact visible proof standard
- avoiding stale ngrok/runtime state during repeated live browser proofs
- keeping the A2A lane honest instead of masking platform/tooling issues with backend-only claims
- making the held-out Daniel path work without Maria-specific overfit behavior
- surfacing the FHIR-native writeback story without overclaiming production EHR integration

## Accomplishments that we’re proud of

- a held-out Daniel Brooks discharge contradiction path that writes real FHIR coordination artifacts
- a clean Olivia Chen control path that stays `ready` and writes zero blocking Tasks
- a Prompt 4 re-arbitration loop that does not falsely clear all gates when `clinical_stability` remains unresolved
- inspectable evidence lineage through `Task`, `Provenance`, and `AuditEvent`
- a locked `2 MCPs + 1 external A2A` architecture with no custom frontend

## What we learned

- in healthcare agent systems, the useful “AI moment” is not generic summarization; it is contradiction detection with bounded evidence
- the strongest workflow proof is when evidence changes state in the control plane, not when the model merely describes what should happen
- polling-based re-arbitration is a much more reliable demo primitive than claiming real webhook/subscription behavior we cannot prove

## What’s next

- stabilize the full Prompt Opinion live proof lane across all four Daniel prompts in one fresh session
- keep A2A as a provable synchronous architecture lane with cleaner external-agent rendering behavior
- improve final evidence packaging and judge-facing artifact reports
- extend held-out scenario coverage while keeping the architecture locked

## Safety and feasibility

- no autonomous discharge authority
- no production hospital deployment claim
- no full Epic SMART integration claim
- no real FHIR Subscription/webhook claim
- no clinician replacement claim

The system supports human review by surfacing posture, contradiction, blockers, evidence, and next actions.

For local demo mode, Prompt Opinion patient UUIDs for Daniel, Maria, and Olivia are mapped into seeded local FHIR bundles so the system can honestly prove FHIR-native reads, Task write-back, Provenance, AuditEvent, and polling re-arbitration without pretending it is running against a production EHR.

## Proof artifacts

- endgame run folder: `output/endgame/runs/20260510T101519Z/`
- Prompt Opinion historical proof bundle: `output/prompt-opinion-e2e/runs/`
- held-out patients: Daniel Brooks, Olivia Chen, Eleanor Singh, Maria Alvarez
- live Prompt Opinion workspace reused: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

Daniel is the held-out live demo patient.
Olivia is the clean control.
Eleanor remains required scenario-matrix coverage.
