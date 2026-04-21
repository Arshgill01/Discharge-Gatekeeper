# Timed Rehearsal Results

## Date
2026-04-21

## Environment
- All three services running locally (heuristic LLM provider)
- Discharge Gatekeeper MCP: http://127.0.0.1:5055/mcp
- Clinical Intelligence MCP: http://127.0.0.1:5056/mcp
- external A2A orchestrator: http://127.0.0.1:5057

## Run 1: A2A 3-prompt demo
| Prompt | Time (ms) |
| --- | --- |
| Prompt 1: Is this patient safe to discharge today? | 117 |
| Prompt 2: What hidden risk changed that answer? Show me the contradiction and the evidence. | 68 |
| Prompt 3: What exactly must happen before discharge, and prepare the transition package. | 63 |
| **Total** | **324** |

### Run 1 Assertions
- Prompt 1: deterministic.verdict=ready, final_verdict=not_ready, hidden_risk_run_status=used, decision_matrix_row=3 ✅
- Prompt 2: final_verdict=not_ready, contradiction_summary includes "from ready to not_ready", cites Nursing Note, assistive framing present ✅
- Prompt 3: final_verdict=not_ready, merged_next_steps includes 3 hidden_risk-sourced actions, transition package present ✅

## Run 2: A2A 3-prompt demo
| Prompt | Time (ms) |
| --- | --- |
| Prompt 1 | 82 |
| Prompt 2 | 65 |
| Prompt 3 | 60 |
| **Total** | **278** |

### Run 2 Assertions
- All three prompts: status=completed, final_verdict=not_ready, deterministic.verdict=ready ✅

## Control Path (A2A)
- final_verdict=ready ✅
- hidden_risk_run_status=used ✅
- hidden_risk_result=no_hidden_risk ✅
- manual_review_required=false ✅
- No hidden_risk blockers ✅

## Direct-MCP Fallback Path
### Prompt 1 (Discharge Gatekeeper MCP: assess_discharge_readiness)
- verdict=ready ✅
- blocker_count=0 ✅

### Prompt 2 (Clinical Intelligence MCP: surface_hidden_risks)
- status=ok ✅
- hidden_risk_result=hidden_risk_present ✅
- disposition_impact=not_ready ✅
- finding_count=3 ✅
- citation_count=5 ✅
- Categories: clinical_stability, equipment_and_transport, home_support_and_services ✅

### Prompt 3 (Clinical Intelligence MCP: synthesize_transition_narrative)
- contract_version=phase0_transition_narrative_v1 ✅
- narrative clearly states contradiction ✅
- narrative states posture should be treated as not_ready ✅

## Demo Timing Assessment
- Backend latency: ~60-120ms per prompt, ~280-330ms total 3-prompt flow
- Demo-safe: YES - backend is extremely fast
- The bottleneck in a real Prompt Opinion demo will be UI rendering and any LLM call if using the google provider instead of heuristic
- With heuristic provider: sub-second total, instant demo feel
- With google provider: add ~3-10s per prompt for Gemini API calls

## UI Friction Assessment
- Not measurable without Prompt Opinion workspace access (auth blocker)
- Backend surfaces are fully ready

## Operator Confusion Risks
- None at backend level - identities, outputs, and contracts are clean
- Risk at Prompt Opinion level: unknown until auth is resolved
