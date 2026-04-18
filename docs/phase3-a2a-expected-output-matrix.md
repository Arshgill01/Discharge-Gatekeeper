# Phase 3 External A2A Expected-Output Matrix

## Purpose
This matrix defines the canonical, testable behavior for the preferred Phase 3 path where Prompt Opinion invokes the `external A2A orchestrator` and receives one reconciled synchronous response.

This matrix is the acceptance source of truth for:
- trap-patient contradiction escalation
- bounded no-risk or insufficient-context behavior
- direct two-MCP fallback continuity when A2A or downstream dependencies fail

## Canonical runtime and evidence paths
- A2A runtime entrypoint: `po-community-mcp-main/external-a2a-orchestrator-typescript/index.ts`
- Agent card surface: `po-community-mcp-main/external-a2a-orchestrator-typescript/agent-card.ts`
- Task/request schema: `po-community-mcp-main/external-a2a-orchestrator-typescript/types.ts` (`A2ATaskInput`)
- Trap/control fixtures: `po-community-mcp-main/external-a2a-orchestrator-typescript/orchestrator/fixtures.ts`
- A2A orchestration smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/orchestrator-smoke.ts`
- A2A runtime + card smoke: `po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/runtime-boot-and-agent-card-smoke.ts`
- Combined A2A shell smoke: `po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`
- Prompt Opinion registration runbook: `docs/prompt-opinion-integration-runbook.md`
- Fallback direct-MCP runbook: `docs/phase2-two-mcp-operator-runbook.md`

## Trap-patient 3-prompt expected properties

| Prompt surface | A2A expected behavior (`Maria Alvarez`) | Why this is stronger than direct two-MCP fallback |
| --- | --- | --- |
| Prompt 1: `Is this patient safe to discharge today?` | `deterministic.verdict=ready`, `final_verdict=not_ready`, `hidden_risk_run_status=used`, `decision_matrix_row=3`, hidden-risk citations present | A2A returns one fused answer that keeps baseline deterministic posture visible while proving final escalation in the same payload. |
| Prompt 2: `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `contradiction_summary` explicitly states structured-baseline-vs-narrative contradiction; hidden-risk citation anchors include the contradiction nursing and case-management notes | A2A exposes contradiction evidence and reconciliation result without operator stitching two separate MCP responses manually. |
| Prompt 3: `What exactly must happen before discharge, and prepare the transition package.` | `merged_next_steps` contains deterministic actions and hidden-risk escalation actions; final output remains assistive/non-autonomous | A2A keeps transition actions and escalation state in one response, reducing demo risk versus manual fallback narration. |

## Control and bounded-path expected properties

| Scenario | Required output properties | Gate intent |
| --- | --- | --- |
| Clean control narrative (no hidden risk) | `final_verdict=ready`; `hidden_risk_run_status=used`; `hidden_risk_result=no_hidden_risk`; no fabricated escalation blockers | Prove false-positive suppression on the preferred A2A path. |
| Hidden-risk review with missing narrative evidence | `hidden_risk_run_status=unavailable`; `hidden_risk_result=inconclusive`; final posture downgraded per matrix uncertainty rules (`ready_with_caveats` from `ready`) with manual review | Prove bounded insufficient-context behavior without fabricated hidden-risk findings. |
| Clinical Intelligence MCP unavailable | deterministic payload preserved; `hidden_risk_run_status=unavailable`; `hidden_risk_unavailable_reason` set; no fabricated hidden-risk findings | Prove fail-closed behavior when narrative dependency fails. |

## Registration/readiness expected properties

| Surface | Required property |
| --- | --- |
| `GET /readyz` | `status=ok`, `server_name=external A2A orchestrator` |
| `GET /.well-known/agent-card.json` | `schema_version=a2a_card_v1`, `agent_identity.name=external A2A orchestrator`, `task_lifecycle.streaming=false`, task endpoints populated, dependency list includes both MCP identities |
| `POST /tasks` | returns completed task record with parsed `output` payload and decision-matrix metadata |

## Fallback continuity requirement
If A2A registration or invocation fails, the direct two-MCP fallback must remain immediately available and testable through:
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
- `docs/phase2-two-mcp-operator-runbook.md`
