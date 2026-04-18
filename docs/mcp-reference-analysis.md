# MCP Reference Analysis

## Reference repo
`prompt-opinion/po-community-mcp`

## Why it still matters after the pivot
The community MCP repo remains the best public reference for how Prompt Opinion expects a boring, stateless MCP integration to look.

It is still relevant for:
- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`

It is not the reference for:
- `external A2A orchestrator`
- hidden-risk prompt contracts
- verdict reconciliation policy

## What to borrow for both MCPs

### 1. Stateless MCP transport
Borrow:
- straightforward MCP bootstrap
- request-scoped handling
- explicit per-tool registration

Why:
- both MCPs need to be independently discoverable and easy to debug

### 2. Prompt Opinion FHIR-context handling
Borrow:
- header-driven FHIR URL discovery
- token/header-driven patient identification
- capability exposure for Prompt Opinion-specific context

Why:
- both MCPs should read the same request-scoped context model rather than inventing separate retrieval patterns

### 3. Minimal runtime assumptions
Borrow:
- small utility layers
- explicit health checks
- simple error surfaces

Why:
- the two-MCP setup already adds enough moving parts; runtime cleverness would only increase demo risk

## What not to borrow blindly
- starter naming
- toy tool semantics
- single-surface assumptions that collapse deterministic and LLM behavior into one MCP
- overly generic tool descriptions

## Pivot-specific adaptation

| Component | What the reference helps with | What must be custom |
| --- | --- | --- |
| `Discharge Gatekeeper MCP` | MCP transport, FHIR context utilities, deterministic tool registration | structured discharge contracts, blocker taxonomy, next-step outputs, non-LLM deterministic spine |
| `Clinical Intelligence MCP` | MCP transport, FHIR context utilities, independent registration/discovery | hidden-risk prompt contract, citation schema, false-positive control, contradiction handling |
| `external A2A orchestrator` | almost nothing beyond general HTTP hygiene | orchestration logic, decision matrix, fallback policy, synchronous non-streaming behavior |

## Recommended MCP split

### `Discharge Gatekeeper MCP`
Responsibilities:
- structured discharge-readiness determination
- canonical blocker output
- deterministic next-step plan

Implementation guardrails:
- keep it inspectable
- keep it deterministic
- do not place the hidden-risk prompt here

### `Clinical Intelligence MCP`
Responsibilities:
- detect narrative-only hidden risks
- surface contradictions between structured and unstructured evidence
- return citations and bounded disposition impact

Implementation guardrails:
- LLM allowed here
- do not let it replace the deterministic spine
- do not let it emit an uncited final discharge verdict

## Shared patterns both MCPs should keep
- one request-scoped patient/context resolver pattern
- one citation object style
- one set of canonical verdict labels
- one shared understanding of blocker categories
- one boring health/discovery story

## Reference limitations that now matter more
- the reference repo does not answer how to reconcile deterministic and narrative findings
- the reference repo does not define false-positive controls for hidden-risk prompting
- the reference repo does not define fallback behavior when an A2A layer fails
- the reference repo does not define how to package a multi-surface judge demo

Those gaps are now filled by:
- [phase0-hidden-risk-prompt-contract.md](/Users/arshdeepsingh/Developer/ctc-phase0-ops/docs/phase0-hidden-risk-prompt-contract.md)
- [phase0-orchestrator-decision-matrix.md](/Users/arshdeepsingh/Developer/ctc-phase0-ops/docs/phase0-orchestrator-decision-matrix.md)
- [phase0-failure-mode-plan.md](/Users/arshdeepsingh/Developer/ctc-phase0-ops/docs/phase0-failure-mode-plan.md)
- [prompt-opinion-integration-runbook.md](/Users/arshdeepsingh/Developer/ctc-phase0-ops/docs/prompt-opinion-integration-runbook.md)
