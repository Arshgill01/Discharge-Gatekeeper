# Phase 0 Orchestrator Decision Matrix

## Purpose
This matrix is the source of truth for how the `external A2A orchestrator` reconciles:
- the deterministic structured verdict from `Discharge Gatekeeper MCP`
- the hidden-risk result from `Clinical Intelligence MCP`

## Inputs

### Structured verdict
Allowed values:
- `ready`
- `ready_with_caveats`
- `not_ready`

### Hidden-risk result
Allowed values:
- `no_hidden_risk`
- `hidden_risk_present`
- `inconclusive`

### Hidden-risk disposition impact
Allowed values:
- `none`
- `caveat`
- `not_ready`
- `uncertain`

## Decision table

| Case | Structured verdict | Hidden-risk result | Allowed impact | Final verdict | Orchestrator action | Manual review |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ready` | `no_hidden_risk` | `none` | `ready` | preserve deterministic output | `false` |
| 2 | `ready` | `hidden_risk_present` | `caveat` | `ready_with_caveats` | add cited hidden-risk caveat and keep deterministic blockers intact | `false` |
| 3 | `ready` | `hidden_risk_present` | `not_ready` | `not_ready` | add cited hidden-risk blocker and escalate disposition | `false` |
| 4 | `ready_with_caveats` | `no_hidden_risk` | `none` | `ready_with_caveats` | preserve deterministic caveats | `false` |
| 5 | `ready_with_caveats` | `hidden_risk_present` | `caveat` | `ready_with_caveats` | add hidden-risk finding without downgrading below current caveat state | `false` |
| 6 | `ready_with_caveats` | `hidden_risk_present` | `not_ready` | `not_ready` | escalate from caveat to blocker state | `false` |
| 7 | `not_ready` | `no_hidden_risk` | `none` | `not_ready` | preserve deterministic blocker state | `false` |
| 8 | `not_ready` | `hidden_risk_present` | `caveat` | `not_ready` | keep final state `not_ready`; add hidden-risk context only if non-duplicate | `false` |
| 9 | `not_ready` | `hidden_risk_present` | `not_ready` | `not_ready` | keep final state `not_ready`; append cited hidden-risk blocker or evidence | `false` |
| 10 | `ready` | `inconclusive` | `uncertain` | `ready_with_caveats` | downgrade one level and require human review because `ready` cannot survive unresolved hidden-risk ambiguity | `true` |
| 11 | `ready_with_caveats` | `inconclusive` | `uncertain` | `ready_with_caveats` | preserve caveat state and attach `manual_review_required` | `true` |
| 12 | `not_ready` | `inconclusive` | `uncertain` | `not_ready` | preserve blocker state and attach `manual_review_required` | `true` |

## Required output actions by row

| Final verdict | Required output behavior |
| --- | --- |
| `ready` | return deterministic next steps unchanged; hidden-risk section may show `no_hidden_risk` |
| `ready_with_caveats` | keep deterministic next steps and append any hidden-risk caveat actions or manual-review requirement |
| `not_ready` | ensure final blocker set includes the discharge-blocking reason that drove `not_ready`, whether deterministic or hidden-risk-derived |

## Merge rules

| Rule | Requirement |
| --- | --- |
| Deterministic IDs | do not rewrite deterministic blocker IDs, evidence IDs, or next-step IDs |
| Hidden-risk IDs | add new IDs with a distinct hidden-risk namespace such as `hr_` |
| Duplicates | if `Clinical Intelligence MCP` marks a finding as duplicate, do not create a new blocker |
| Citations | keep citation provenance from both MCPs in the final payload |
| Explainability | final payload must disclose which component caused the last disposition downgrade |
| Manual review | if `manual_review_required=true`, surface it in the top-level response |

## Row mapping for the required cases

| Required case | Matrix rows |
| --- | --- |
| `ready` + no hidden risk | row 1 |
| `ready` + hidden risk | rows 2-3 |
| `ready_with_caveats` + no hidden risk | row 4 |
| `ready_with_caveats` + hidden risk | rows 5-6 |
| `not_ready` + no hidden risk | row 7 |
| `not_ready` + hidden risk | rows 8-9 |
| inconclusive / uncertain hidden-risk path | rows 10-12 |
