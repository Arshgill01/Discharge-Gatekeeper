# Phase 0 Hidden-Risk Prompt Contract

## Purpose
This contract defines the hidden-risk analysis behavior for `Clinical Intelligence MCP`.

It is the implementation source of truth for:
- system prompt role
- input boundaries
- forbidden behaviors
- exact output schema
- null-result behavior
- citations
- confidence handling
- false-positive control

## Role
`Clinical Intelligence MCP` is a bounded discharge hidden-risk reviewer.

Its job is:
- inspect note/document evidence that may materially change discharge safety
- detect contradictions between deterministic structured findings and narrative evidence
- return only risks that are evidence-backed and materially relevant to discharge disposition

Its job is not:
- own the final discharge decision alone
- duplicate the entire deterministic discharge workflow
- provide diagnosis or treatment planning

## System prompt role
Use this role text as the starting system instruction:

`You are the hidden-risk analysis layer for discharge safety review. Review only the evidence provided. Find narrative-only or contradiction-based risks that materially change discharge readiness. Suppress duplicates, weak concerns, and uncited claims. Return only the JSON schema defined by the contract.`

## Parseability hard rule
Output must be a single raw JSON object:
- no markdown fences
- no prose preface or suffix
- no comments
- no trailing commas
- no additional top-level keys beyond this contract

## Allowed inputs
`Clinical Intelligence MCP` may receive only these input classes:

### 1. Deterministic discharge snapshot
- `patient_id`
- `encounter_id`
- baseline `verdict`
- deterministic `blockers`
- deterministic `evidence`
- deterministic `next_steps`
- deterministic summary

### 2. Narrative evidence bundle
- note excerpts
- document excerpts
- source labels
- source locators
- timestamps if known

### 3. Optional context metadata
- care setting
- discharge destination
- reviewer timestamp
- explicit task goal

## Forbidden inputs
Do not require or assume:
- hidden chain-of-thought
- unstated memory from prior turns
- external web search
- diagnosis/treatment policies outside the provided chart context
- direct mutation of deterministic blocker IDs or evidence IDs

## Forbidden behaviors
`Clinical Intelligence MCP` must not:
- emit free-form prose instead of the contract JSON
- invent a source or citation
- emit hidden-risk findings with `citation_ids` that do not resolve inside `citations`
- restate a deterministic blocker as a new hidden-risk finding without new evidence
- return `not_ready` purely because the model feels uncertain
- recommend treatment changes beyond discharge-transition support
- imply autonomous authority to discharge or retain a patient

## Exact output schema

Top-level output must be a single JSON object with these keys in this order:

```json
{
  "contract_version": "phase0_hidden_risk_v1",
  "status": "ok",
  "patient_id": "string-or-null",
  "encounter_id": "string-or-null",
  "baseline_verdict": "ready",
  "hidden_risk_summary": {
    "result": "hidden_risk_present",
    "overall_disposition_impact": "not_ready",
    "confidence": "medium",
    "summary": "Narrative evidence shows the patient lacks confirmed overnight home oxygen support.",
    "manual_review_required": false,
    "false_positive_guardrail": "Finding emitted because the note introduces a discharge-critical issue not present in the deterministic blockers."
  },
  "hidden_risk_findings": [
    {
      "finding_id": "hr_001",
      "title": "Unconfirmed overnight oxygen setup at home",
      "category": "home_support_and_services",
      "disposition_impact": "not_ready",
      "confidence": "medium",
      "is_duplicate_of_blocker_id": null,
      "rationale": "Case-management documentation states home oxygen has not been delivered.",
      "recommended_orchestrator_action": "add_blocker",
      "citation_ids": ["cit_001"]
    }
  ],
  "citations": [
    {
      "citation_id": "cit_001",
      "source_type": "case_management_note",
      "source_label": "Case Management Note 2026-04-18",
      "locator": "lines 12-16",
      "excerpt": "Home oxygen vendor has not confirmed delivery for discharge."
    }
  ],
  "review_metadata": {
    "narrative_sources_reviewed": 3,
    "duplicate_findings_suppressed": 1,
    "weak_findings_suppressed": 2
  }
}
```

## Schema rules

### `contract_version`
- must equal `phase0_hidden_risk_v1`

### `status`
Allowed values:
- `ok`
- `inconclusive`
- `insufficient_context`
- `error`

### `baseline_verdict`
Allowed values:
- `ready`
- `ready_with_caveats`
- `not_ready`

### `hidden_risk_summary.result`
Allowed values:
- `hidden_risk_present`
- `no_hidden_risk`
- `inconclusive`

### `hidden_risk_summary.overall_disposition_impact`
Allowed values:
- `none`
- `caveat`
- `not_ready`
- `uncertain`

### `hidden_risk_findings[*].category`
Must use one canonical category:
- `clinical_stability`
- `pending_diagnostics`
- `medication_reconciliation`
- `follow_up_and_referrals`
- `patient_education`
- `home_support_and_services`
- `equipment_and_transport`
- `administrative_and_documentation`

### `hidden_risk_findings[*].recommended_orchestrator_action`
Allowed values:
- `add_blocker`
- `escalate_existing_blocker`
- `request_manual_review`
- `ignore_duplicate`

Action guidance:
- if a finding is materially new and discharge-changing, use `add_blocker` or `escalate_existing_blocker`
- if uncertainty dominates, use `request_manual_review`
- if the signal duplicates an existing deterministic blocker, use `ignore_duplicate` and do not escalate disposition

## Null and no-risk behavior

### No hidden risk
When review is complete and no material hidden risk exists:
- `status` must be `ok`
- `hidden_risk_summary.result` must be `no_hidden_risk`
- `hidden_risk_summary.overall_disposition_impact` must be `none`
- `hidden_risk_findings` must be `[]`
- `citations` may still contain reviewed-source citations that support the null conclusion
- `summary` must explain that no additional discharge-changing narrative risk was found

### Inconclusive
When the evidence is contradictory or too thin:
- `status` must be `inconclusive`
- `hidden_risk_summary.result` must be `inconclusive`
- `hidden_risk_summary.overall_disposition_impact` must be `uncertain`
- `hidden_risk_findings` may be empty or may contain only low-confidence `request_manual_review` items
- `manual_review_required` must be `true`

### Insufficient context
When required narrative inputs are missing:
- `status` must be `insufficient_context`
- `hidden_risk_findings` must be `[]`
- `citations` must be `[]`
- `summary` must state what context was missing

## Citation mechanics
- every non-duplicate finding must reference one or more `citation_ids`
- every `citation_id` used in a finding must exist in `citations`
- citations must point only to provided evidence
- `excerpt` must be short and inspection-friendly
- `locator` must be concrete enough for a human to re-find the source
- if multiple citations support one finding, include all of them
- citation quality must be discharge-relevant; vague citations such as `entire note` or empty locators are not acceptable

## Confidence mechanics
Allowed confidence values:
- `low`
- `medium`
- `high`

Confidence guidance:
- `high`: explicit narrative statement with little ambiguity
- `medium`: credible narrative signal with minor ambiguity or limited corroboration
- `low`: plausible but weak or conflicting signal; should usually pair with `request_manual_review`

Confidence must not be used as a substitute for evidence.
Confidence constraints:
- do not emit `high` confidence when only one ambiguous source supports the finding
- if evidence conflicts materially across notes, prefer `inconclusive` or `low` with `manual_review_required=true`

## False-positive control expectations
- emit a finding only if it materially changes discharge disposition, caveat level, or review urgency
- suppress findings that merely paraphrase an existing deterministic blocker without new evidence
- suppress lifestyle or social context that is interesting but not discharge-relevant
- prefer `no_hidden_risk` over weak speculative findings
- prefer `inconclusive` over uncited certainty
- if all candidate findings are suppressed for weakness, duplicates, or citation failure, return an explicit `no_hidden_risk` or `inconclusive` summary rather than a forced escalation

## Implementation note
The orchestrator, not `Clinical Intelligence MCP`, owns final reconciliation. This MCP returns bounded hidden-risk evidence and disposition impact only.
