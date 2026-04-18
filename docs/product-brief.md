# Product Brief

## System name
**Care Transitions Command**

## Component names
- existing MCP: **Discharge Gatekeeper MCP**
- new MCP: **Clinical Intelligence MCP**
- new coordinating agent: **external A2A orchestrator**

## One-line pitch
Care Transitions Command is a Prompt Opinion-native care-transitions system that combines a deterministic discharge spine with bounded narrative contradiction intelligence to stop unsafe discharge when the hidden risk lives in notes, not in structured data.

## Why this matters
Discharge failures often happen at the boundary between clean structured signals and messy real-world evidence.
The chart can say:
- vitals are stable
- follow-up is scheduled
- medications are reconciled

The real risk can still be buried in narrative documentation:
- a late nursing note
- a case-management addendum
- a PT or respiratory therapy observation
- a document that contradicts the morning discharge posture

Care Transitions Command exists to catch that contradiction before the patient leaves.

## Product thesis
This is not a discharge-summary generator.
This is not a generic hospital copilot.

The wedge is:
**a care-transitions control system that detects a hidden contradiction, changes the discharge decision, and tells the team exactly what to do next.**

## Core product law
The system must answer:
1. Is this patient safe to discharge today?
2. What contradiction or blocker explains that answer?
3. What exactly must happen before discharge?

## Why the system has three components

### Discharge Gatekeeper MCP
Owns the deterministic foundation:
- structured patient-context normalization
- canonical discharge posture
- blocker taxonomy
- next-step spine

This component must stay inspectable and boring.
It is the foundation, not the wow moment by itself.

### Clinical Intelligence MCP
Exists because the hidden risk is often unstructured.
It owns:
- bounded note and document reading
- contradiction detection against the structured posture
- hidden-risk evidence synthesis
- concise narrative explanation of why the posture changed

### external A2A orchestrator
Exists because the final user experience is one coordinated answer in Prompt Opinion.
It owns:
- prompt-level routing
- escalation from deterministic spine to narrative contradiction review
- final answer assembly for the 3-prompt demo

## The AI factor
The AI factor is not "we used an LLM on discharge."
The AI factor is:
1. the system starts from a deterministic structured posture
2. bounded reasoning inspects the note bundle
3. the system finds a contradiction the structured view missed
4. the final answer changes for a defensible, evidence-backed reason

That is the holy-shit moment.

## 3-prompt demo promise
In three prompts, a judge should see:
1. a discharge answer
2. the hidden-risk contradiction that changed the answer
3. the transition package that operationalizes the finding

## Canonical outputs
1. discharge readiness verdict
2. blocker list with severity
3. evidence trace by source
4. prioritized next-step checklist
5. clinician handoff brief
6. patient-friendly discharge instructions

## Primary user
A clinician, case manager, or discharge coordinator working inside Prompt Opinion.

## Scope
In scope:
- discharge-readiness support
- blocker identification
- contradiction detection across structured and narrative evidence
- transition planning and discharge artifacts

Out of scope:
- diagnosis generation
- autonomous discharge decisions
- treatment recommendation beyond bounded transition support
- custom frontend work
- generic inpatient operations tooling
- architectures larger than `2 MCPs + 1 external A2A`

## Safety framing
The system supports human review.
It does not claim autonomous discharge authority.
It should be explicit when the final answer changed because note evidence contradicted the structured posture.

## Initial success condition
A new judge or teammate should understand in under 20 seconds why the patient looked ready, what hidden contradiction was found, and why the system correctly stopped discharge.
