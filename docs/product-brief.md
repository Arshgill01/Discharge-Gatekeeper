# Product Brief

## Working name
**Discharge Gatekeeper**

## One-line pitch
An interoperable discharge-readiness agent that determines whether a patient is safe for discharge, identifies blockers with evidence, and prepares the safest next-step transition plan.

## Why this matters
Discharge is where fragmented context becomes dangerous. The real blockers are often scattered across progress notes, case-management notes, medication lists, pending diagnostics, referrals, equipment needs, and patient education gaps. Discharge Gatekeeper turns that fragmented context into a concrete readiness verdict and an actionable plan.

## Problem statement
Care teams routinely ask a deceptively simple question:
**Can this patient safely go home today?**

The answer is rarely stored in one place. It must be reconstructed from:
- structured chart data
- note text
- recent changes in meds or oxygen requirements
- follow-up/referral status
- home support realities
- missing paperwork or education

This creates delay, rushed discharges, avoidable confusion, and weak transitions.

## Product thesis
The winning wedge is not “AI for discharge summaries.”
The wedge is:
**a discharge control tower that catches hidden blockers before unsafe transition happens.**

## Core jobs
### Primary job
Decide whether the patient is safe for discharge **now**.

### Secondary jobs
- identify blockers
- prioritize next steps
- show evidence for each blocker
- generate clinician and patient transition outputs

## What the product should return
At minimum:
1. readiness verdict: `ready`, `ready_with_caveats`, or `not_ready`
2. blocker list with category and severity
3. evidence trace by source
4. prioritized next-step checklist
5. one transition artifact

## Primary user
A clinician, case manager, or discharge coordinator working inside Prompt Opinion.

## Demo promise
In three prompts, a judge should be able to see:
1. the system decide whether discharge is safe
2. the system explain what is blocking discharge
3. the system prepare the transition package

## Why AI is required
Traditional rule-based software can track checklists but struggles with:
- conflicting note text
- implicit blockers hidden in narrative documentation
- evidence synthesis across multiple sources
- context-dependent prioritization
- language generation for different stakeholders

This workflow needs LLM-powered synthesis, not just forms.

## Why this is feasible
The agent is assistive, not autonomous.
It supports readiness review and transition coordination.
It does not claim authority to discharge or replace clinician judgment.

## What makes it interoperable
The product should visibly benefit from:
- Prompt Opinion workspace integration
- patient/FHIR context propagation
- uploaded notes/documents
- MCP tools with inspectable outputs

## Non-goals
Do not turn this into:
- a diagnosis engine
- a triage platform
- a readmission predictor
- a broad hospital dashboard
- a generic care-management chatbot

## Initial blocker categories
- clinical_stability
- pending_diagnostics
- medication_reconciliation
- follow_up_and_referrals
- patient_education
- home_support_and_services
- equipment_and_transport
- administrative_and_documentation

## Initial success metric
A judge should immediately understand why the patient is or is not ready for discharge without needing a long explanation from the team.
