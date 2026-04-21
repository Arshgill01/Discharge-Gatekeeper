# Phase 2 Two-MCP Expected-Output Matrix

## Purpose
This matrix defines canonical, testable Phase 2 behavior for the direct two-MCP path before A2A:
- `Discharge Gatekeeper MCP` emits deterministic structured posture
- `Clinical Intelligence MCP` emits narrative hidden-risk output
- local reconciliation applies [phase0-orchestrator-decision-matrix.md](phase0-orchestrator-decision-matrix.md)
- Prompt 1 and Prompt 2 are measurably stronger than structured-only output

## Canonical runtime and evidence paths
- Structured MCP entrypoint: `po-community-mcp-main/typescript/index.ts`
- Clinical Intelligence MCP entrypoint: `po-community-mcp-main/clinical-intelligence-typescript/index.ts`
- Scenario-pack fixtures: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`
- Two-MCP smoke/integration checks: `po-community-mcp-main/clinical-intelligence-typescript/smoke/two-mcp-integration-smoke.ts`
- Combined integration shell smoke: `po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- Prompt Opinion fallback/operator runbook: `docs/phase2-two-mcp-operator-runbook.md`

## Expected-output properties

| Surface | Trap (`Maria Alvarez`) | Control / guardrail lanes | Gate intent |
| --- | --- | --- | --- |
| 1. Structured discharge posture output (`Discharge Gatekeeper MCP`) | `verdict=ready`; no high-severity blockers from structured-only baseline | Duplicate-signal lane may start from deterministic blocker state; all other lanes keep deterministic baseline intact | Preserve deterministic spine authority |
| 2. Hidden-risk output (`Clinical Intelligence MCP`) | `status=ok`; `result=hidden_risk_present`; impact=`not_ready`; categories include `clinical_stability`, `equipment_and_transport`, `home_support_and_services`; citations include canonical contradiction notes | control/ablation/duplicate return `result=no_hidden_risk`; inconclusive lane returns `status=insufficient_context`; alternative lane returns single-category `home_support_and_services` hidden risk with citation | Prove contradiction detection plus false-positive suppression |
| 3. Combined manual two-MCP interpretation (non-A2A fallback) | Baseline deterministic `ready` remains visible, then final escalates to `not_ready` on cited contradiction | control/ablation stay at deterministic baseline; duplicate lane preserves deterministic verdict without adding hidden-risk blockers; inconclusive lane remains bounded/manual-review explicit | Prove decision-matrix behavior before A2A |
| 4. Prompt strength uplift for Prompt 1 + Prompt 2 | Prompt 1 shows baseline `ready` and final `not_ready`; Prompt 2 shows contradiction summary + citations | control/ablation explicitly state `no_hidden_risk`; inconclusive lane stays manual-review explicit; alternative lane shows narrower contradiction with bounded category scope | Prove measurable uplift over structured-only output |

## Note-dependency expectation
Trap escalation must be note-dependent:
- removing contradiction narrative evidence must prevent hidden-risk escalation
- fallback interpretation must remain at deterministic baseline when contradiction notes are ablated

## False-positive suppression expectation
- duplicate findings that restate deterministic blockers are suppressed
- uncited findings are suppressed
- weak/no-signal narrative evidence does not force escalation

## Parseability and citation expectation
For all lanes:
- payloads remain machine-parseable JSON objects
- every kept hidden-risk finding resolves to at least one citation id in `citations[]`
- citation locators/excerpts are non-empty and inspectable

## Enforcement commands
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
