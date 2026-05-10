# Transition Safety Packet Spec

## Purpose

The Transition Safety Packet is the core product artifact of Care Transitions Command.

It exists to answer:

> Why is this patient safe or unsafe to discharge, and what evidence/actions support that status?

The packet prevents the system from feeling like a generic LLM verdict.

It makes the output:

- structured
- evidence-cited
- auditable
- safety-bounded
- operational

## Product Principle

A discharge-readiness answer should not stand unless it is reconciled across:

1. structured chart evidence
2. narrative contradiction evidence
3. transition feasibility
4. safety invariants
5. owner-specific actions

## Top-Level Shape

```json
{
  "packet_type": "transition_safety_packet",
  "contract_version": "phase9_transition_safety_packet_v1",
  "patient": {},
  "structured_baseline": {},
  "narrative_review": {},
  "reconciled_transition_status": {},
  "action_router": [],
  "safety_invariants": {},
  "trace": {}
}
```

## Fields

### `patient`

Required fields:

```json
{
  "patient_id": "phase0-trap-maria-alvarez",
  "encounter_id": "enc-phase0-trap-001"
}
```

Optional fields:

```json
{
  "display_name": "Maria Alvarez",
  "age": 74,
  "planned_disposition": "home"
}
```

### `structured_baseline`

Produced by Discharge Gatekeeper MCP.

Required fields:

```json
{
  "source": "Discharge Gatekeeper MCP",
  "verdict": "ready",
  "summary": "Structured chart suggests discharge readiness.",
  "evidence": [],
  "blockers": []
}
```

Purpose:

- preserve the deterministic structured baseline
- make it clear the system did not simply start with an LLM conclusion
- prove the contradiction changed the answer

Example:

```json
{
  "source": "Discharge Gatekeeper MCP",
  "verdict": "ready",
  "summary": "Resting vitals are stable, oral medications are ready, follow-up is scheduled, and no structured pending diagnostic hold is present.",
  "evidence": [
    "SpO2 94% on room air at rest",
    "oral medications ready",
    "PCP and pulmonology follow-up scheduled",
    "no structured pending diagnostic hold"
  ],
  "blockers": []
}
```

### `narrative_review`

Produced by Clinical Intelligence MCP.

Required fields:

```json
{
  "source": "Clinical Intelligence MCP",
  "status": "ok",
  "hidden_risk_result": "hidden_risk_present",
  "contradiction_summary": "",
  "citations": []
}
```

Allowed `hidden_risk_result` values:

- `hidden_risk_present`
- `no_hidden_risk`
- `inconclusive`

Allowed `status` values:

- `ok`
- `inconclusive`
- `insufficient_context`
- `error`

Example:

```json
{
  "source": "Clinical Intelligence MCP",
  "status": "ok",
  "hidden_risk_result": "hidden_risk_present",
  "contradiction_summary": "Structured evidence showed resting stability, but late narrative evidence showed exertional desaturation, missing home oxygen, and no overnight support.",
  "citations": [
    {
      "source_label": "Nursing Note 2026-04-18 20:40",
      "excerpt": "O2 sat 94% on room air at rest, dropped to 82% on room air after approximately 20 feet and 6 stairs."
    },
    {
      "source_label": "Case Management Addendum 2026-04-18 20:55",
      "excerpt": "Confirmed home oxygen delivery delayed until tomorrow morning. Daughter unavailable overnight."
    }
  ]
}
```

### `reconciled_transition_status`

Produced by reconciliation/orchestrator logic.

Required fields:

```json
{
  "final_verdict": "not_ready",
  "why_changed": "",
  "blocker_categories": [],
  "manual_review_required": true
}
```

Allowed `final_verdict` values:

- `ready`
- `ready_with_caveats`
- `not_ready`

Example:

```json
{
  "final_verdict": "not_ready",
  "why_changed": "The structured chart looked ready, but late narrative evidence created active transition blockers: exertional instability, unavailable oxygen, and no overnight support.",
  "blocker_categories": [
    "clinical_stability",
    "equipment_and_transport",
    "home_support_and_services"
  ],
  "manual_review_required": true
}
```

### `action_router`

Purpose:

Convert the contradiction into operational next steps.

Each action must include:

```json
{
  "owner": "",
  "action": "",
  "timing": "",
  "release_condition": ""
}
```

Example:

```json
[
  {
    "owner": "Bedside RN",
    "action": "Repeat exertional room-air assessment, including ambulation/stair tolerance.",
    "timing": "before discharge",
    "release_condition": "Document exertional stability or escalate oxygen requirement."
  },
  {
    "owner": "Case manager",
    "action": "Confirm oxygen concentrator delivery or arrange alternate safe disposition.",
    "timing": "before transport",
    "release_condition": "Home oxygen availability confirmed before discharge."
  },
  {
    "owner": "Care team",
    "action": "Confirm overnight support for first night home.",
    "timing": "before discharge",
    "release_condition": "Support plan documented or discharge remains held."
  }
]
```

### `safety_invariants`

Required invariants:

```json
{
  "structured_baseline_preserved": "pass",
  "no_uncited_escalation": "pass",
  "no_ready_with_active_hidden_blocker": "pass",
  "manual_review_on_uncertainty": "pass",
  "duplicate_signal_suppression": "pass"
}
```

#### `structured_baseline_preserved`

Passes when final output shows the structured baseline before narrative reconciliation.

#### `no_uncited_escalation`

Passes when a hidden-risk-driven `not_ready` verdict has at least one cited narrative source.

Fails if the system escalates without evidence.

#### `no_ready_with_active_hidden_blocker`

Passes when a high-confidence hidden risk with `not_ready` impact prevents final `ready`.

#### `manual_review_on_uncertainty`

Passes when `error`, `insufficient_context`, or `inconclusive` outputs require manual review instead of confident clearance.

#### `duplicate_signal_suppression`

Passes when narrative findings that duplicate deterministic blockers are not double-counted.

### `trace`

Purpose:

Show integration confidence without exposing secrets.

Fields:

```json
{
  "dgk_mcp_used": true,
  "clinical_intelligence_mcp_used": true,
  "a2a_orchestrator_supported": true,
  "request_id": null,
  "task_id": null,
  "provider": null,
  "model": null
}
```

Do not include secrets.

Do not include raw API keys.

Do not expose private Prompt Opinion auth data.

## Prompt Opinion Visible Rendering

The full packet can be structured JSON internally, but Prompt Opinion output must be concise.

### Prompt 1 visible form

```text
Final verdict: not_ready
Structured baseline: ready
Hidden-risk review: hidden_risk_present

The structured discharge spine looked ready, but narrative evidence contradicted it.
Evidence anchors: Nursing Note 2026-04-18 20:40; Case Management Addendum 2026-04-18 20:55.
```

### Prompt 2 visible form

```text
HIDDEN CONTRADICTION FOUND

Structured baseline:
READY — stable at rest, meds ready, follow-up scheduled.

Contradicting narrative evidence:
Nursing Note 2026-04-18 20:40:
SpO2 dropped to 82% after 20 feet and 6 stairs.

Case Management Addendum 2026-04-18 20:55:
Oxygen delivery delayed until tomorrow; daughter unavailable overnight.

Final transition status:
NOT_READY
```

### Prompt 3 visible form

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

## Non-Goals

The packet must not become:

- autonomous discharge approval
- diagnosis generation
- broad care-management plan
- verbose hospital dashboard output
- uncited clinical reasoning
- custom frontend dependency

## Acceptance Test

For the canonical trap patient, the packet must prove:

- structured baseline is `ready`
- hidden risk is present
- final verdict is `not_ready`
- required evidence anchors are present
- blocker categories match:
  - `clinical_stability`
  - `equipment_and_transport`
  - `home_support_and_services`
- safety invariants pass
- transition actions are concise and owner-specific
