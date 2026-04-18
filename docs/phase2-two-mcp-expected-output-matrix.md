# Phase 2 Two-MCP Expected-Output Matrix

## Purpose
This matrix defines the canonical, testable Phase 2 behavior for the direct two-MCP path before A2A:
- `Discharge Gatekeeper MCP` emits deterministic structured posture
- `Clinical Intelligence MCP` emits narrative hidden-risk output
- operator/manual reconciliation applies the decision matrix from [phase0-orchestrator-decision-matrix.md](phase0-orchestrator-decision-matrix.md)
- Prompt 1 and Prompt 2 become measurably stronger than the structured-only story

## Canonical runtime and evidence paths
- Structured MCP entrypoint: `po-community-mcp-main/typescript/index.ts`
- Clinical Intelligence MCP entrypoint: `po-community-mcp-main/clinical-intelligence-typescript/index.ts`
- Trap and control fixtures: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`
- Two-MCP smoke/integration checks: `po-community-mcp-main/clinical-intelligence-typescript/smoke/two-mcp-integration-smoke.ts`
- Combined integration shell smoke: `po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- Prompt Opinion fallback/operator runbook: `docs/phase2-two-mcp-operator-runbook.md`

## Expected-output properties

| Surface | Trap patient expected behavior (`Maria Alvarez`) | Clean control expected behavior | Gate intent |
| --- | --- | --- | --- |
| 1. Structured discharge posture output (`Discharge Gatekeeper MCP`) | `verdict=ready`; no high-severity blockers from structured-only baseline | `verdict=ready`; deterministic blockers remain empty | Preserve deterministic spine as baseline authority |
| 2. Hidden-risk output (`Clinical Intelligence MCP`) | `status=ok`; `hidden_risk_summary.result=hidden_risk_present`; `overall_disposition_impact=not_ready`; categories include `clinical_stability`, `equipment_and_transport`, `home_support_and_services`; citations include contradiction nursing note and case-management addendum | `status=ok`; `hidden_risk_summary.result=no_hidden_risk`; `overall_disposition_impact=none`; no fabricated findings | Prove contradiction detection and false-positive suppression |
| 3. Combined manual two-MCP interpretation (non-A2A fallback) | Baseline deterministic posture remains visible as `ready`, then escalates to final `not_ready` based on cited hidden-risk contradiction | Final stays `ready`; no escalation without note-backed contradiction | Prove reconciliation behavior before A2A |
| 4. Prompt strength uplift for Prompt 1 + Prompt 2 | Prompt 1 shows final `not_ready` plus explicit statement that structured baseline looked `ready`; Prompt 2 shows contradiction summary + note citations that changed the answer | Prompt 1 remains `ready`; Prompt 2 explicitly reports bounded `no_hidden_risk` behavior | Prove measurable AI-factor uplift beyond structured-only output |

## Note-dependency expectation
Trap escalation must be note-dependent:
- removing contradiction narrative evidence must prevent hidden-risk escalation
- fallback interpretation must remain at deterministic baseline when contradiction notes are absent

## Parseability and citation expectation
For both trap and control flows:
- payloads must remain machine-parseable JSON objects
- every surfaced hidden-risk finding must resolve to at least one citation id in `citations[]`
- citation locators/excerpts must be non-empty and inspectable

## Enforcement commands
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
