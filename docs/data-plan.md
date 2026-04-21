# Data Plan

## Goal
Maintain one canonical trap patient for the judge story while running a small scenario pack that stress-tests false positives, note dependency, and bounded uncertainty.

The canonical patient remains locked in:
- `docs/phase0-trap-patient-spec.md`

## Anchor law
`Maria Alvarez` is the primary demo anchor and cannot be replaced by expansion cases.

All additional scenarios must reinforce one of these checks:
- hidden-risk contradiction detection when it is real
- no-escalation when narrative evidence is weak, duplicate, or absent
- note-dependency (ablation removes escalation)
- bounded uncertainty (`inconclusive` / manual review)

## Canonical contradiction sequence
The anchor patient must still force this sequence:
1. structured data alone suggests discharge is acceptable
2. narrative evidence reveals a contradiction
3. final disposition changes because of that contradiction

If a scenario does not help evaluate this behavior, it is out of scope.

## Phase 6 synthetic scenario pack
Primary fixture source:
- `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`

A2A mirror fixture source:
- `po-community-mcp-main/external-a2a-orchestrator-typescript/orchestrator/fixtures.ts`

Scenario lanes:
- `trap`: `Maria Alvarez` canonical contradiction (`ready` -> `not_ready`)
- `control`: clean no-hidden-risk (`ready` stays `ready`)
- `ablation`: Maria with contradiction notes removed (`ready` stays `ready`)
- `duplicate_signal`: narrative repeats an existing deterministic blocker (suppressed)
- `inconclusive`: no narrative context (`insufficient_context`, manual review)
- `alternative_hidden_risk`: isolated home-support contradiction that still escalates

## Structured data requirements
Structured evidence should stay bounded and deterministic:
- preserve canonical verdict states: `ready`, `ready_with_caveats`, `not_ready`
- preserve canonical blocker categories without adding new top-level categories
- keep deterministic spine authoritative for baseline blockers and next steps

## Narrative evidence requirements
Narrative bundles should remain inspectable:
- every escalation must be citeable from provided excerpts
- weak, duplicate, or uncited concerns must be suppressible
- contradiction notes should be explainable aloud in one sentence
- scenario text should avoid synthetic eval-answer-key phrasing

## Expected blocker outcomes
Canonical trap still ends with:
- `clinical_stability`
- `equipment_and_transport`
- `home_support_and_services`

Alternative hidden-risk lane should demonstrate narrower escalation with:
- `home_support_and_services`

## Artifact requirements
The scenario pack must support:
- hidden-risk JSON outputs with citations
- two-MCP reconciliation checks
- A2A Prompt 1/2/3 behavior checks
- fallback and bounded uncertainty checks

## Non-goals
- replacing Maria with a different primary trap
- adding a large scenario zoo
- expanding beyond `2 MCPs + 1 external A2A`
- introducing non-canonical blocker taxonomies
