# Phase 1 Clinical Intelligence Expected-Output Matrix

## Purpose
This matrix converts the Phase 0 trap-patient story into executable quality targets for:
- `surface_hidden_risks`
- `synthesize_transition_narrative`

The corresponding enforcement checks live in:
- `po-community-mcp-main/clinical-intelligence-typescript/smoke/hidden-risk-detection-smoke.ts`
- `po-community-mcp-main/clinical-intelligence-typescript/smoke/transition-narrative-smoke.ts`
- `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/expected-output-matrix.ts`

## `surface_hidden_risks` matrix

| Scenario | Expected result | Required categories | Required note citations/references | No-risk behavior |
| --- | --- | --- | --- | --- |
| Trap patient (`Maria Alvarez`) | `hidden_risk_present`, impact=`not_ready`, status=`ok` | `clinical_stability`, `equipment_and_transport`, `home_support_and_services` | Must cite/reference `Nursing Note 2026-04-18 20:40` and `Case Management Addendum 2026-04-18 20:55`; each finding must include at least one citation id that resolves to `citations[]` | Not applicable |
| Clean control case | `no_hidden_risk`, impact=`none`, status=`ok` | none | No hidden-risk citations required | `hidden_risk_findings=[]`, `manual_review_required=false`, explicit no-risk summary |
| Missing narrative context | `insufficient_context` | none | none | `hidden_risk_findings=[]`, `citations=[]`, `manual_review_required=true` |

## `synthesize_transition_narrative` matrix

| Scenario | Expected disposition | Grounding requirements | Action requirements |
| --- | --- | --- | --- |
| Trap patient (`Maria Alvarez`) | `not_ready` | Narrative must preserve baseline deterministic posture and include citation references for the contradiction | At least one recommended action; hidden-risk actions must include linked blocker categories and citation ids |
| Clean control case | `ready` | Narrative must explicitly state no additional hidden risk surfaced | Deterministic recommended actions still required; no invented hidden-risk citations |

## Guardrail intent
These checks intentionally enforce behavior, not output cosmetics:
- detect hidden-risk contradictions when present
- suppress weak/uncited escalation when absent
- ensure parseable contract-aligned payloads
- ensure citations are traceable and meaningful
- ensure narrative synthesis remains grounded in evidence and deterministic posture
