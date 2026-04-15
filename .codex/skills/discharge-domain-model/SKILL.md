---
name: discharge-domain-model
description: Keep product and implementation work aligned to the discharge-readiness wedge. Use when defining blocker categories, verdict logic, safety framing, output semantics, or demo patient assumptions.
compatibility: Codex-compatible skill for domain-shaping work.
metadata:
  version: "1.0"
  owner: discharge-gatekeeper
---

# Discharge Domain Model

## Use this skill when
- shaping discharge-readiness logic
- refining blocker categories
- checking whether a feature still fits the wedge
- improving safety framing or product semantics

## First read
1. `AGENTS.md`
2. `docs/product-brief.md`
3. `docs/architecture.md`
4. `docs/evals.md`
5. `docs/data-plan.md`

## Core product law
The repo answers one central question:
**Is this patient safe to discharge today?**

Everything else is secondary support.

## Canonical concepts
Verdict labels:
- `ready`
- `ready_with_caveats`
- `not_ready`

Blocker categories:
- clinical_stability
- pending_diagnostics
- medication_reconciliation
- follow_up_and_referrals
- patient_education
- home_support_and_services
- equipment_and_transport
- administrative_and_documentation

## Domain rules
- Prefer assistive workflow language over medical-autonomy language.
- Prefer actionability over theoretical completeness.
- Prefer a small, believable blocker set over an exhaustive one.
- Avoid turning the product into a generic care-management agent.

## When evaluating an idea or change
Ask:
1. Does this help the system answer the core discharge question?
2. Does it make blockers clearer or more useful?
3. Does it improve a real transition output?
4. Does it stay feasible and judge-friendly?

If not, push back.

## Final checks
Before finishing:
1. Did the change keep the wedge sharp?
2. Did it preserve canonical terms?
3. Did it avoid overclaiming clinical authority?
