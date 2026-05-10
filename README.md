<div align="center">
  <h1>Care Transitions Command</h1>
  <p><em>Evidence is what confers discharge authority.</em></p>
  
  [![Hackathon Submission](https://img.shields.io/badge/Submission-Phase_10-blue.svg)](#)
  [![Architecture](https://img.shields.io/badge/Architecture-2_MCPs_+_1_Orchestrator-orange.svg)](#)
  [![Status](https://img.shields.io/badge/Status-Demo_Ready-brightgreen.svg)](#)
</div>

---

## ⚡ The Control Plane for Hospital Discharges

**Care Transitions Command** is a multi-agent control system designed to catch hidden discharge risks when the contradiction lives in narrative evidence, not in the clean structured snapshot.

Today, a patient might look "ready for discharge" on paper—stable vitals, normal labs, ordered meds. But buried in a nursing note or a social worker's assessment is a hidden risk: *a pending biopsy, a delayed wheelchair delivery, or a spouse unable to provide care.*

This system acts as a **cryptographic gate** for discharge. It fuses deterministic structured data with probabilistic narrative intelligence. 

**The Core Primitive:**
> Blocking evidence creates FHIR Tasks. Task completion is what opens the gate. The system holds discharge until the FHIR layer says otherwise.

---

## 🏗️ Architecture

We implemented a strictly bounded **`2 MCPs + 1 external A2A`** architecture to ensure deterministic, inspectable execution.

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

### 1. Discharge Gatekeeper (DGK) MCP
Builds the structured baseline from FHIR resources. It evaluates the deterministic structured spine—labs, vitals, active medications—and determines the baseline discharge readiness posture.

### 2. Clinical Intelligence (CI) MCP
Finds the narrative contradiction. It analyzes unstructured notes and documents to discover hidden risks that contradict the structured posture.

### 3. External A2A Orchestrator
The brain of the operation. It receives the prompt, synchronously calls both MCPs in the right order, and fuses the deterministic and narrative evidence into a single, conclusive answer.

---

## 🚀 The 3-Prompt Demo

The core value is demonstrated through a canonical 3-prompt sequence in our Prompt Opinion surface:

1. **The Baseline Check:** 
   *Prompt:* `"Is this patient safe to discharge today?"`
   *Result:* The patient looks acceptable on the deterministic discharge spine.

2. **The Catch:** 
   *Prompt:* `"What hidden risk changed that answer? Show me the contradiction and the evidence."`
   *Result:* The system catches a hidden contradiction in the notes, flips the answer to `not_ready`, and cites the exact evidence.

3. **The Action:** 
   *Prompt:* `"What exactly must happen before discharge, and prepare the transition package."`
   *Result:* The system turns that finding into concrete FHIR Tasks and a transition package.

---

## 🛡️ Generality & Safety Invariants

To prove the system isn't overfit to a single scenario, we validated it against four distinct trap-patient profiles:
*   🩺 **Maria:** Catches a hidden pending pathology report.
*   💊 **Daniel:** Catches a medication reconciliation contradiction.
*   🏠 **Eleanor:** Identifies a hidden home-support failure.
*   🦽 **Olivia:** Flags a delayed equipment delivery.

**Safety Invariant:** *The system never implies autonomous discharge authority.* It is a safety net that assists human review by surfacing readiness posture, contradictions, blockers, and next actions. It can delay a discharge, but it cannot authorize one without human intervention.

---

## 📖 Documentation & System of Record

Treat these files as the map, not the encyclopedia:

| Priority | Document | Purpose |
|----------|----------|---------|
| 1 | [`PLAN.md`](PLAN.md) | Live priorities and sequencing |
| 2 | [`docs/product-brief.md`](docs/product-brief.md) | Product framing and core value proposition |
| 3 | [`docs/architecture.md`](docs/architecture.md) | Architecture and component boundaries |
| 4 | [`docs/demo-script.md`](docs/demo-script.md) | The canonical demo flow |
| 5 | [`docs/phase0-trap-patient-spec.md`](docs/phase0-trap-patient-spec.md) | Canonical synthetic patient definitions |

*For operational rules, refer to [`AGENTS.md`](AGENTS.md).*

---
<div align="center">
  <i>Built with Care, FHIR, and TypeScript.</i>
</div>
