# Three-Minute Video Script

## 0:00–0:20 — Problem / Stakes

Screen action:
- open the repo README or the slide with the one-line pitch
- zoom the sentence that says this is a discharge control plane, not a generic copilot

Say:
- “Care Transitions Command catches the discharge contradiction that a structured chart missed.”
- “The point is not summarization. The point is that blocking evidence creates FHIR Tasks, and discharge stays held until the FHIR layer says otherwise.”

## 0:20–0:45 — Patient Scope Setup

Screen action:
- show Prompt Opinion launchpad
- select `Patient`
- select `Daniel Brooks`
- select `Care Transitions Command BYO Fallback`
- show `FHIR Context`
- if available, turn `Show Tool calls` on

Expected visible output:
- `Daniel Brooks`
- `FHIR Context`
- `Show Tool calls`
- `Care Transitions Command BYO Fallback`

Zoom / highlight:
- patient name
- FHIR Context badge
- tool-call toggle

Fallback line if output differs:
- “If the Show Tool calls toggle is absent, we rely on the saved transcript and network/runtime artifacts for tool evidence.”

## 0:45–1:15 — Prompt 1 Verdict

Exact prompt:

`Is this patient safe to discharge today?`

Expected visible output:
- structured baseline `ready`
- final verdict `not_ready`
- explicit `hidden_risk_result: hidden_risk_present`
- Daniel PO FHIR references including at least two of:
  - `DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69`
  - `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`
  - `DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14`
  - `Task/15ec9b46-f5c8-44ba-8e09-ae2991ee54df`

Say:
- “The structured chart looked ready.”
- “Then the contradiction layer escalated to not_ready.”

Fallback line if output differs:
- “If the assistant text stalls, show the persisted tool response in the transcript and the saved proof artifact for this run.”

## 1:15–1:45 — Prompt 2 Contradiction / Evidence

Exact prompt:

`What hidden risk changed that answer? Show me the contradiction and the evidence.`

Expected visible output:
- `HIDDEN CONTRADICTION REVIEW`
- structured baseline `READY`
- narrative result `HIDDEN_RISK_PRESENT`
- visible contradiction summary spanning:
  - pharmacy note
  - nursing note
  - case-management note
- visible raw FHIR refs including:
  - `DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69`
  - `DocumentReference/7978a116-881e-4280-871f-1c16c59dc500`
  - `DocumentReference/d7ebe424-afd0-46d6-957c-26bf381c1e14`

Zoom / highlight:
- the contradiction summary line
- the three evidence bullets

Say:
- “This is the holy-shit moment.”
- “The chart looked ready, but the note evidence says medication access, symptom change, and home logistics all fail together.”

## 1:45–2:00 — Prompt 3 Transition Package

Exact prompt:

`What exactly must happen before discharge, and prepare the transition package.`

Expected visible output:
- `TRANSITION PACKAGE - DISCHARGE HOLD ACTIVE`
- owner/action/timing steps
- visible FHIR Task references
- visible Provenance references

Zoom / highlight:
- the release condition
- the first two actions
- Task / Provenance references

Say:
- “Now the contradiction becomes work.”
- “The system writes blocking FHIR Tasks and Provenance, and the handoff packet stays aligned to that control plane.”

## 2:00–2:40 — Prompt 4 Re-Arbitration

Exact prompt:

`New updates arrived: the medication bridge was delivered to bedside and the daughter arranged a working home scale, but the patient still reports orthopnea when lying flat. Re-arbitrate the discharge gates from the FHIR Tasks and evidence.`

Expected visible output:
- `DISCHARGE STATUS UPDATE`
- previous status `NOT_READY`
- resolved gates include medication and home-monitoring / patient-education
- remaining unresolved gate `clinical_stability`
- final status stays `NOT_READY`
- visible Task references in the resolution evidence line

What to highlight:
- `Resolved gates`
- `Remaining unresolved gates: clinical_stability`
- any Task references shown in the answer

Say:
- “This is not just a better explanation.”
- “The backend rereads FHIR Task state and refuses to clear discharge while orthopnea remains unresolved.”

Fallback line if output differs:
- “If the visible transcript is delayed, show the saved rearbitration transcript plus the backend proof artifact that records Task status reads and the unchanged clinical-stability gate.”

## 2:40–3:00 — Olivia Clean Control / Close

Preferred screen action:
- switch to `Olivia Chen`
- run the clean control prompt

Exact prompt:

`Is this patient safe to discharge today?`

Expected visible output:
- final verdict `ready`
- explicit `hidden_risk_result: no_hidden_risk`
- zero blocking Tasks
- no Daniel or Maria bleed

Alternate screen action if time is tight:
- flash the scenario matrix and point to `Eleanor Singh` coverage, then return to Olivia control

Say:
- “We also prove the control case stays calm.”
- “Olivia remains ready, no hidden risk is fabricated, and no blocking Tasks are written.”

## Honest Architecture Line

Read this line verbatim once during the demo:

“Structured EHR resources — observations, medications, orders — flow through Prompt Opinion’s FHIR context. Narrative notes live in the care documentation layer, accessed through the Clinical Intelligence MCP.”

## Honest Local Demo Note

If asked how the local demo works, say:

- “For local proof, Prompt Opinion Patient Scope IDs for Daniel, Maria, Olivia, and Eleanor are mapped into seeded local FHIR bundles so we can honestly prove deterministic reads, Task write-back, Provenance, and polling re-arbitration without claiming production EHR connectivity.”
