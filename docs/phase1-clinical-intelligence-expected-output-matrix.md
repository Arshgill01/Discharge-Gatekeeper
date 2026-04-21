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

| Scenario lane | Expected result | Required categories | Required note citations/references | Guardrail requirement |
| --- | --- | --- | --- | --- |
| Trap patient (`Maria Alvarez`) | `hidden_risk_present`, impact=`not_ready`, status=`ok` | `clinical_stability`, `equipment_and_transport`, `home_support_and_services` | Must cite/reference `Nursing Note 2026-04-18 20:40` and `Case Management Addendum 2026-04-18 20:55`; each finding needs at least one citation id resolving to `citations[]` | Canonical contradiction must be visible and citeable |
| Clean control | `no_hidden_risk`, impact=`none`, status=`ok` | none | No hidden-risk citations required | `hidden_risk_findings=[]`, `manual_review_required=false`, explicit no-risk summary |
| Maria ablation (contradiction notes removed) | `no_hidden_risk`, impact=`none`, status=`ok` | none | none | Confirms note dependency for escalation |
| Duplicate-signal control | `no_hidden_risk`, impact=`none`, status=`ok` | none | none in final kept output | Must increment duplicate suppression count; no extra hidden-risk findings |
| Inconclusive context | `inconclusive`, impact=`uncertain`, status=`insufficient_context` | none | none | `hidden_risk_findings=[]`, `citations=[]`, `manual_review_required=true` |
| Alternative hidden-risk (home-support contradiction) | `hidden_risk_present`, impact=`not_ready`, status=`ok` | `home_support_and_services` | Must cite/reference `Case Management Escalation Note 2026-04-18 21:05` | Demonstrates credible non-Maria hidden-risk lane without taxonomy drift |

## `synthesize_transition_narrative` matrix

| Scenario lane | Expected disposition | Grounding requirements | Action requirements |
| --- | --- | --- | --- |
| Trap patient (`Maria Alvarez`) | `not_ready` | Preserve baseline deterministic posture and include citation references for contradiction evidence | At least one recommended action; hidden-risk actions include linked blocker categories and citation ids |
| Alternative hidden-risk (home-support contradiction) | `not_ready` | Preserve baseline deterministic posture; cite case-management escalation evidence | Recommended actions remain category-linked and citation-backed |
| Clean control | `ready` | Explicitly state no additional hidden risk surfaced | Deterministic recommended actions still required; no invented hidden-risk citations |

## Guardrail intent
These checks enforce behavior, not cosmetic output style:
- detect hidden-risk contradictions when present
- suppress weak/uncited/duplicate escalation when absent
- ensure parseable contract-aligned payloads
- ensure citation traceability
- keep narrative synthesis bounded to deterministic posture plus cited hidden-risk deltas
