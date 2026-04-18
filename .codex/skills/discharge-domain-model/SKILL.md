---
name: discharge-domain-model
description: Keep work aligned to the Care Transitions Command discharge-readiness wedge and the frozen two-MCP plus external-A2A architecture.
compatibility: Codex-compatible skill for domain-shaping work.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# Discharge Domain Model

## Use this skill when
- shaping discharge-readiness semantics
- checking whether a change still fits the wedge
- reviewing blocker categories, verdict logic, or safety framing
- deciding whether logic belongs in the deterministic spine or the hidden-risk layer

## First read
1. `AGENTS.md`
2. `docs/product-brief.md`
3. `docs/evals.md`
4. `docs/phase0-hidden-risk-prompt-contract.md`
5. `docs/phase0-orchestrator-decision-matrix.md`

## Frozen architecture facts
- top-level identity: `Care Transitions Command`
- deterministic MCP: `Discharge Gatekeeper MCP`
- hidden-risk MCP: `Clinical Intelligence MCP`
- orchestration layer: `external A2A orchestrator`
- deterministic spine remains foundational
- LLM use is allowed only in `Clinical Intelligence MCP` and the `external A2A orchestrator`

## Canonical discharge concepts
Verdicts:
- `ready`
- `ready_with_caveats`
- `not_ready`

Blocker categories:
- `clinical_stability`
- `pending_diagnostics`
- `medication_reconciliation`
- `follow_up_and_referrals`
- `patient_education`
- `home_support_and_services`
- `equipment_and_transport`
- `administrative_and_documentation`

## Core laws
- `Discharge Gatekeeper MCP` owns the baseline structured verdict and next-step spine.
- `Clinical Intelligence MCP` only adds bounded hidden-risk or contradiction findings.
- Hidden-risk findings must be cited and materially relevant.
- No component claims autonomous discharge authority.

## Decision check
Ask:
1. Does this improve the answer to "Is this patient safe to discharge today?"
2. Does it sharpen blocker clarity or next-step actionability?
3. Does it belong in the deterministic MCP, the hidden-risk MCP, or the orchestrator?
4. Does it preserve the 3-prompt demo?

## Do not
- drift into diagnosis or treatment planning
- widen the system into a generic hospital copilot
- move hidden-risk prompting into the deterministic MCP
- let narrative reasoning replace structured evidence
