# Phase 4 End-to-End Expected-Output Matrix

## Purpose
This matrix is the Phase 4 source of truth for realism, controls, and demo dominance across the full assembled system.

It locks expected behavior for:
- trap-patient Prompt 1/2/3
- no-hidden-risk control
- inconclusive hidden-risk behavior

## Canonical current implementation paths
- Trap/control hidden-risk fixtures: `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/fixtures.ts`
- Trap/control A2A task fixtures: `po-community-mcp-main/external-a2a-orchestrator-typescript/orchestrator/fixtures.ts`
- Direct two-MCP smoke: `po-community-mcp-main/clinical-intelligence-typescript/smoke/two-mcp-integration-smoke.ts`
- A2A end-to-end smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/orchestrator-smoke.ts`
- Two-MCP shell smoke: `po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- A2A shell smoke: `po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

## Matrix

| Case | Prompt | Required output properties | Why it matters |
| --- | --- | --- | --- |
| Trap patient (`Maria Alvarez`) | Prompt 1: `Is this patient safe to discharge today?` | `deterministic.verdict=ready`; `final_verdict=not_ready`; `hidden_risk_run_status=used`; `hidden_risk_result=hidden_risk_present`; `decision_matrix_row=3`; hidden-risk citations present | Keeps the structured baseline visible while proving the final answer changed. |
| Trap patient (`Maria Alvarez`) | Prompt 2: `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `final_verdict=not_ready`; contradiction summary explicitly describes structured-baseline-to-final change; includes evidence anchors to contradiction notes; prompt response remains contradiction-focused (no transition-package action-list phrasing) | This is the judge-visible contradiction moment and must remain the strongest signal. |
| Trap patient (`Maria Alvarez`) | Prompt 3: `What exactly must happen before discharge, and prepare the transition package.` | `final_verdict=not_ready`; `merged_next_steps` contains deterministic and hidden-risk sourced actions; summary includes concrete pre-discharge actions and remains assistive | Proves operational usefulness after contradiction detection. |
| Clean no-hidden-risk control | Prompt 1 (or equivalent A2A call) | `final_verdict=ready`; `hidden_risk_run_status=used`; `hidden_risk_result=no_hidden_risk`; no fabricated hidden-risk blockers/escalation language | Prevents false positives and over-choreographed escalation. |
| Inconclusive hidden-risk evidence | Prompt 2 (or equivalent A2A call with missing/insufficient narrative evidence) | `hidden_risk_result=inconclusive`; bounded posture (`ready_with_caveats` from structured `ready` on A2A path); `manual_review_required=true`; no fabricated hidden-risk findings/citations | Keeps uncertainty honest and safe. |

## Fallback continuity requirement
If A2A is unavailable, direct two-MCP fallback must remain runnable and demonstrate:
- trap escalation remains note-dependent
- clean control remains `no_hidden_risk`
- unavailable/inconclusive paths remain bounded and explicit
