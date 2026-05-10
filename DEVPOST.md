# Care Transitions Command

**Evidence is what confers discharge authority.**

## Inspiration

If you look at the architecture of modern identity systems (like Auth0), they operate on a simple principle: "approval confers identity." A user isn't authenticated because they clicked a button; they are authenticated because an immutable token was minted proving they met the criteria.

Healthcare discharges, surprisingly, don't work this way. Today, patients are discharged when a clinician writes an order, but that order often happens while hidden risks—like a pending biopsy or a conflicting medication note—lurk in the narrative record. Structured discharge data alone misses real risk because it only sees the clean, deterministic snapshot. 

We were inspired to build a control system for care transitions. A system that doesn't just "check" readiness, but explicitly models discharge as a cryptographic gate. *Evidence is what confers discharge authority.* Until the evidence proves safety, the gate remains closed.

## What it does

Care Transitions Command is a multi-agent system that catches hidden discharge risks when the contradiction lives in narrative evidence, not in the clean structured snapshot. 

When a clinician asks, *"Is this patient safe to discharge today?"*, the system orchestrates a dual-path analysis. It builds a structured readiness baseline, then scours the unstructured narrative for hidden contradictions. 

If a contradiction is found (e.g., structured data says "Ready", but a recent nursing note says "Patient dizzy on standing"), the system escalates to `not_ready`, cites the exact evidence, and generates FHIR Tasks that must be completed before discharge can proceed.

**Core primitive:** Blocking evidence creates FHIR Tasks. Task completion is what opens the gate. The system holds discharge until the FHIR layer says otherwise.

## How we built it

We implemented a strictly bounded `2 MCPs + 1 external A2A` architecture to ensure deterministic, inspectable execution.

### The Architecture

```text
+-------------------------------------------------------------+
|                     EXTERNAL A2A ORCHESTRATOR               |
|  (Prompt Opinion -> Fuses Deterministic & Narrative paths)  |
+------------------------------+------------------------------+
               |                               |
      +--------v--------+             +--------v--------+
      | Discharge       |             | Clinical        |
      | Gatekeeper MCP  |             | Intelligence MCP|
      +--------+--------+             +--------+--------+
               |                               |
   +-----------v-------------------------------v-----------+
   |                     FHIR R4 STORE                     |
   +-------------------------------------------------------+
```

1. **Discharge Gatekeeper (DGK) MCP:** Builds the structured baseline from FHIR resources. It evaluates the deterministic structured spine—labs, vitals, active medications—and determines the baseline discharge readiness posture.
2. **Clinical Intelligence (CI) MCP:** Finds the narrative contradiction. It analyzes unstructured notes and documents to discover hidden risks that contradict the structured posture.
3. **External A2A Orchestrator:** Fuses both. It receives the Prompt Opinion prompt, synchronously calls both MCPs in the right order, and fuses the deterministic and narrative evidence into a single, conclusive answer.
4. **FHIR Task Write-Back:** When a hidden risk is discovered, the system doesn't just warn the user. It creates real care coordination artifacts. Blocking evidence creates FHIR Tasks with a `reasonReference` pointing directly to the blocking evidence.
5. **Regulatory-Grade Audit Trail:** Every decision, evaluation, and generated Task is wrapped in a `Provenance` and `AuditEvent` resource, creating an immutable, regulatory-grade audit trail of *why* the discharge gate was locked or opened.
6. **Polling Re-Arbitration:** This is a control plane, not a one-shot checker. The system polls the FHIR store. As FHIR Tasks are marked `completed`, the system re-arbitrates the discharge posture. Task completion is what opens the gate.

*Note: The system runs on a local FHIR R4 store and probes public HAPI. Prompt Opinion FHIR context forwarding is currently constrained by platform scope registration.*

## Generality & Safety Invariants

To prove the system isn't overfit to a single scenario, we validated it against four distinct trap-patient profiles:
*   **Maria:** Catches a hidden pending pathology report not reflected in the structured problem list.
*   **Daniel:** Catches a medication reconciliation contradiction hidden in a discharge summary draft.
*   **Eleanor:** Identifies a hidden home-support failure noted only in a social worker's narrative text.
*   **Olivia:** Flags a delayed equipment delivery buried in case management notes.

**Safety Invariants:** The system never implies autonomous discharge authority. It acts as a safety net that *assists* human review by surfacing readiness posture, contradictions, blockers, and next actions. It can delay a discharge, but it cannot authorize one without human intervention.

## Challenges

Fusing deterministic structured data with probabilistic narrative intelligence is hard. The biggest challenge was preventing the LLM from hallucinating medical status when the structured data was silent. We solved this by enforcing a strict hierarchy: the DGK MCP establishes the unshakeable ground truth, and the CI MCP is only allowed to *subtract* readiness based on explicit, citable narrative contradictions.

## Accomplishments

We built a system that moves beyond generic "copilots" into a true operational control plane. By wiring narrative contradictions directly into FHIR Tasks with `reasonReference`, we bridged the gap between AI insights and actual hospital operations.

## What we learned

We learned that in healthcare, the "why" is more important than the "what." A system that says "Patient is not ready" is useless. A system that says "Patient is not ready because Nursing Note #452 mentions dizziness, and I have created FHIR Task #892 for a physical therapy consult" is a system clinicians can actually use.

## What's next

We are looking at expanding the orchestration layer to support more granular state machines for different hospital departments, and integrating directly with streaming HL7v2 feeds for real-time narrative processing.

## Built With

`fhir`, `gemini-api`, `typescript`, `node.js`, `mcp`

## Try it out

[GitHub Repo](https://github.com/Arshgill01/Discharge-Gatekeeper)
