# Prompt Opinion E2E Validation Report

## Date
2026-04-21

## Validation scope
Real authenticated Prompt Opinion workspace validation of the BYO-agent direct-MCP fallback path for `Care Transitions Command`.

This report replaces the earlier optimistic fallback claim.
Local runtime and smoke coverage remain green, but the real BYO-agent workspace path is only partially proven.

## What was validated

### Local prerequisite checks
| Check | Result |
| --- | --- |
| `./po-community-mcp-main/scripts/run-full-system-validation.sh` | ✅ PASS |
| `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator` | ✅ PASS |
| `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal` | ✅ PASS |
| `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh` | ✅ PASS |

### Prompt Opinion workspace validation
| Check | Result |
| --- | --- |
| Login page accessible | ✅ PASS |
| Authenticated workspace access | ✅ PASS (`Arshgill's org`) |
| `Discharge Gatekeeper MCP` registration | ✅ PASS (workspace discovery succeeded) |
| `Clinical Intelligence MCP` registration | ✅ PASS (workspace discovery succeeded) |
| A2A agent registration | ❌ BLOCKED (`422 Unprocessable Entity`; accepted failure mode) |
| BYO agent creation | ✅ PASS (`Care Transitions Command BYO Fallback`) |
| BYO MCP tool binding | ✅ PASS (`Discharge Gatekeeper MCP` + `Clinical Intelligence MCP`) |
| General Chat Agent usable for fallback | ❌ FAIL (tool bindings are not exposed by default) |
| Prompt 1 visible direct-MCP fallback | ✅ PASS |
| Prompt 2 visible direct-MCP fallback | ❌ FAIL |
| Prompt 3 visible direct-MCP fallback | ❌ FAIL |

## Real BYO agent path used
1. Log into Prompt Opinion.
2. Open `Agents -> BYO Agents`.
3. Use `Care Transitions Command BYO Fallback` instead of `General Chat Agent`.
4. Bind only:
   - `Discharge Gatekeeper MCP`
   - `Clinical Intelligence MCP`
5. Keep embedded/community tools disabled.
6. Use a system prompt that locks:
   - `scenario_id=third_synthetic_discharge_slice_ready_v1`
   - Prompt 1 -> `assess_discharge_readiness`
   - Prompt 2 -> `surface_hidden_risks`
   - Prompt 3 -> `synthesize_transition_narrative`

## Observed workspace behavior

### Prompt 1
Prompt:
`Is this patient safe to discharge today?`

Observed behavior:
- user message persisted at `2026-04-21T09:18:23.781836+00:00`
- `assess_discharge_readiness` tool call persisted at `2026-04-21T09:18:32.998474+00:00`
- tool response persisted at `2026-04-21T09:18:36.937543+00:00`
- visible result was the tool-response card, not a synthesized assistant summary

Returned payload:
```json
{
  "verdict": "ready",
  "blockers": [],
  "evidence": [],
  "next_steps": [],
  "summary": "Verdict: READY. No active discharge blockers were detected in this assistive readiness review; final disposition remains with the clinical team."
}
```

Result:
- this proves the BYO agent can see and invoke `Discharge Gatekeeper MCP`
- this proves the structured trap-patient baseline is correctly `ready`

### Prompt 2
Prompt:
`What hidden risk changed that answer? Show me the contradiction and the evidence.`

Observed behavior in the same conversation:
- user message persisted at `2026-04-21T09:20:35.605677+00:00`
- no assistant/tool messages were persisted afterward in the conversation API
- live MCP server logs show both MCP surfaces were hit immediately after the prompt:
  - `Discharge Gatekeeper MCP`: `09:20:36.548Z`, `09:20:37.130Z`, `09:20:38.606Z`
  - `Clinical Intelligence MCP`: `09:20:37.541Z`, `09:20:38.303Z`, `09:20:39.178Z`
- Prompt Opinion also emitted a successful `POST .../prompt-stream => 200 OK`

Result:
- the hidden-risk path appears to execute at the MCP layer
- the actual workspace transcript did not render or persist the contradiction result
- therefore Prompt 2 is not demo-safe in the real BYO workspace yet

### Prompt 3
Prompt:
`What exactly must happen before discharge, and prepare the transition package.`

Observed behavior in a fresh BYO session:
- user message persisted at `2026-04-21T09:29:34.888816+00:00`
- no assistant/tool messages were persisted afterward in the conversation API
- MCP logs show only `Discharge Gatekeeper MCP` traffic:
  - `09:29:35.767Z`
  - `09:29:36.524Z`
- no corresponding `Clinical Intelligence MCP` hit was observed for this prompt

Result:
- the required visible Prompt 3 fallback path via `Clinical Intelligence MCP.synthesize_transition_narrative` is not proven in the real workspace
- the fresh-session Prompt 3 path is currently blocked

## Timed results
| Step | Result | Timing |
| --- | --- | --- |
| Prompt 1 visible result | ✅ PASS | 13.2s from user message to persisted tool response |
| Prompt 2 visible result | ❌ FAIL | MCP traffic within 4s, but no persisted/rendered result after extended wait |
| Prompt 3 visible result | ❌ FAIL | user message persisted; no persisted/rendered result after extended wait |

## Artifacts captured
- `output/playwright/01-po-login-page.png` - Prompt Opinion login page
- `output/playwright/02-po-workspace-launchpad.png` - Authenticated launchpad
- `output/playwright/03-po-mcp-servers-registered.png` - Both MCPs registered in workspace
- `output/playwright/05-byo-agent-system-prompt.png` - BYO fallback agent configuration
- `output/playwright/06-byo-prompt1-ready-tool-response.png` - Prompt 1 visible `ready` tool response
- `output/playwright/07-byo-prompt3-stalled-session.png` - Fresh-session Prompt 3 stalled workspace state
- `output/prompt-opinion-e2e/byo-workspace-validation-notes.md` - conversation ids, timings, MCP log findings
- `output/prompt-opinion-e2e/local-readiness-evidence.txt` - readiness evidence
- `output/prompt-opinion-e2e/timed-rehearsal-results.md` - local rehearsal timings

## Open risks
1. **BYO transcript persistence/rendering gap**: Prompt 2 reached both MCP runtimes, but Prompt Opinion did not persist or render the resulting assistant/tool messages in the conversation.
2. **Prompt 3 routing gap**: the fresh-session Prompt 3 path did not reach `Clinical Intelligence MCP`, so the required `synthesize_transition_narrative` fallback surface is not proven in-workspace.
3. **One-session repeatability is not proven**: the current workspace evidence supports Prompt 1 only; the 3-prompt live demo is not yet stable enough to claim readiness.
4. **A2A remains blocked**: the accepted direct-MCP fallback is still required because the Prompt Opinion A2A registration path is not usable today.

## Conclusion
**The real BYO-agent direct-MCP fallback path is only partially validated and is not yet demo-ready.**

What is proven:
- workspace auth works
- both MCPs can be registered
- a BYO agent can be created with the correct MCP tool bindings
- Prompt 1 can visibly execute the deterministic baseline and returns the correct `ready` trap-patient posture

What is not yet proven:
- a stable visible Prompt 2 contradiction result in the real BYO workspace
- a stable visible Prompt 3 transition-package result via `Clinical Intelligence MCP.synthesize_transition_narrative`
- a repeatable full 3-prompt direct-MCP demo inside one authenticated Prompt Opinion session
