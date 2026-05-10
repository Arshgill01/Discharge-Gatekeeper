# Final Demo Script — Phase 9

## Demo Goal

In under 3 minutes, prove that Care Transitions Command catches a hidden note-level contradiction that turns a discharge-ready chart into an unsafe transition.

## Demo Thesis

The structured chart looked safe.

The notes changed everything.

Care Transitions Command caught the contradiction, cited the evidence, and produced the transition actions.

## Required Demo Setup

Use the canonical Maria Alvarez trap patient.

Structured baseline:

- resting vitals stable
- SpO2 94% on room air at rest
- oral medications ready
- follow-up scheduled
- no structured pending diagnostic hold
- baseline verdict: `ready`

Narrative contradiction:

- exertional/stair SpO2 drops to 82%
- oxygen concentrator unavailable until tomorrow
- daughter unavailable overnight
- patient lives alone in third-floor walk-up
- final status: `not_ready`

## Demo Architecture

The system uses:

1. Discharge Gatekeeper MCP
2. Clinical Intelligence MCP
3. external A2A orchestrator

Prompt Opinion is the user-facing surface.

If A2A live browser execution is not fully green, use Direct-MCP as primary live lane and A2A as architecture/runtime proof.

Do not overclaim unstable lanes.

## 3-Minute Timeline

### 0:00–0:20 — Opening

Narration:

> “Discharge failures often happen in the gap between clean structured chart data and messy real-world notes. Care Transitions Command is built for that gap.”

Show:

- Prompt Opinion workspace
- selected tool/agent path
- patient context if visible

### 0:20–0:55 — Prompt 1

Prompt:

```text
Is this patient safe to discharge today?
```

Expected visible answer:

```text
Final verdict: not_ready
Structured baseline: ready
Hidden-risk review: hidden_risk_present

The structured discharge spine looked ready, but narrative evidence contradicted it.
```

Narration:

> “The important part is that the system preserves both answers: the structured baseline was ready, but the final reconciled transition status is not_ready.”

Judge should notice:

- baseline is `ready`
- final is `not_ready`
- hidden-risk review changed the answer

### 0:55–1:45 — Prompt 2 / Holy-Shit Moment

Prompt:

```text
What hidden risk changed that answer? Show me the contradiction and the evidence.
```

Expected visible answer:

```text
HIDDEN CONTRADICTION FOUND

Structured baseline:
READY — stable at rest, meds ready, follow-up scheduled.

Contradicting narrative evidence:
Nursing Note 2026-04-18 20:40:
SpO2 dropped to 82% after 20 feet and 6 stairs.

Case Management Addendum 2026-04-18 20:55:
Oxygen delivery delayed until tomorrow; daughter unavailable overnight.

Why this changes the answer:
The chart was stable at rest, but home discharge tonight requires stair tolerance, oxygen availability, and overnight support. Those conditions are not met.

Final transition status:
NOT_READY
```

Narration:

> “This is the failure mode. A structured-only system sees stable resting oxygen and scheduled follow-up. The late note shows she cannot safely make it home tonight.”

Judge should notice:

- exact contradiction
- exact citation anchors
- why structured data alone missed it
- final status change is evidence-backed

### 1:45–2:25 — Prompt 3 / Transition Package

Prompt:

```text
What exactly must happen before discharge, and prepare the transition package.
```

Expected visible answer:

```text
TRANSITION PACKAGE — DISCHARGE HOLD ACTIVE

Release condition:
Do not discharge until exertional stability, oxygen logistics, and overnight support are confirmed.

Actions:
1. Bedside RN — repeat exertional room-air assessment before discharge.
2. Covering clinician — reassess discharge readiness after exertional result.
3. Case manager — confirm oxygen concentrator delivery or alternate disposition.
4. Family/support — confirm overnight support for first night home.
5. Care team — document updated handoff and patient-facing instructions.

Evidence:
- Nursing Note 2026-04-18 20:40
- Case Management Addendum 2026-04-18 20:55
```

Narration:

> “The system does not just flag risk. It turns the hidden contradiction into owner-specific transition actions.”

Judge should notice:

- concise actions
- owner and timing
- no autonomous discharge claim
- evidence remains attached

### 2:25–2:50 — Architecture Proof

Show or mention:

- Discharge Gatekeeper MCP creates structured baseline.
- Clinical Intelligence MCP finds narrative contradiction.
- external A2A orchestrator fuses the two.
- Transition Safety Packet preserves evidence and actions.
- Controls prove the system does not always escalate.

Narration:

> “The architecture is intentionally split: deterministic structured readiness, bounded narrative contradiction intelligence, and an A2A orchestration layer that fuses the evidence.”

### 2:50–3:00 — Close

Narration:

> “Care Transitions Command is not autonomous discharge. It is evidence-chained transition control for clinician review.”

Final line:

> “The chart looked ready. The notes said otherwise. The system caught it before the patient left.”

## Fallback Rules

If A2A browser path is not fully green:

- use Direct-MCP as primary live demo lane
- show A2A proof as runtime/architecture evidence
- do not claim full A2A browser lane is green

If Prompt 3 risks timeout:

- shorten output
- show top 3–5 actions only
- preserve release condition and evidence anchors

If Prompt 1 output is too generic:

- ensure first lines include:
  - `Final verdict: not_ready`
  - `Structured baseline: ready`
  - `Hidden-risk review: hidden_risk_present`

If Prompt 2 is too verbose:

- remove transition actions
- keep only contradiction, citations, and status change

## What To Avoid Saying

Avoid:

- “The AI decides discharge.”
- “The system approves discharge.”
- “It predicts discharge outcome.”
- “It replaces clinician review.”
- “It is a general medical diagnosis agent.”

Use:

- “supports clinician review”
- “evidence-cited transition safety”
- “structured baseline”
- “narrative contradiction”
- “transition actions”
- “bounded hidden-risk review”

## Final Judge Takeaway

A judge should be able to say:

> “This project caught the hidden note contradiction that turned a discharge-ready chart into an unsafe transition.”
