# Prompt Opinion E2E Validation Report

## Date
2026-04-22

## Validation scope
Local reproducibility validation plus real authenticated Prompt Opinion workspace validation for the BYO-agent direct-MCP fallback and A2A lanes for `Care Transitions Command`.

This report replaces the earlier optimistic fallback claim.
Local runtime and smoke coverage remain green, but the real BYO-agent workspace path is only partially proven.

## Status legend
- `green`: fully proven with run-folder evidence
- `yellow`: partially proven or missing required workspace evidence
- `red`: blocking failure

## Artifact source of truth
- latest run bundle: `output/prompt-opinion-e2e/latest/`
- run history: `output/prompt-opinion-e2e/runs/<run-id>/`

Current reproducibility contract for the next decisive pass:
- `reports/status-summary.md` for the lane board
- `reports/request-id-correlation.md` for local A2A request/task propagation
- `notes/experiment-matrix.md` for every workspace attempt that matters to the lane decision
- `notes/request-id-correlation.md` for Prompt Opinion A2A proof or precise blocker isolation
- `notes/workspace-evidence.md` for screenshots, registrations, and final lane calls

## What was validated

### Local prerequisite checks
| Check | Result |
| --- | --- |
| `./po-community-mcp-main/scripts/run-full-system-validation.sh` | ✅ PASS (captured in run `20260421T203407Z`) |
| `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh` | ✅ PASS (captured in run `20260421T203407Z`) |
| `./po-community-mcp-main/scripts/check-a2a-readiness.sh` | ✅ PASS (captured in run `20260421T203407Z`) |
| `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal` | ✅ PASS (captured in run `20260421T203407Z`) |

### Current lane status (explicit)
| Lane | Status | Evidence |
| --- | --- | --- |
| Local automated rehearsal lane | `green` | `output/prompt-opinion-e2e/runs/20260421T203407Z/reports/status-summary.md` |
| Prompt Opinion A2A chat execution lane | `yellow` | no current run proving external runtime execution from Prompt Opinion chat |
| Prompt Opinion dual-tool BYO Prompt 2/3 lane | `red` | persistent transcript completion failures in `output/prompt-opinion-e2e/final-transcript-debug-notes.md` |

For future lane promotion:
- `A2A-main` cannot be `green` without request/task correlation that proves the Prompt Opinion attempt hit the external runtime and propagated into downstream MCP calls.
- `Direct-MCP fallback` cannot be `green` without visible Prompt 1, Prompt 2, and Prompt 3 workspace artifacts in the same run folder.

### Prompt Opinion workspace validation
| Check | Result |
| --- | --- |
| Login page accessible | ✅ PASS |
| Authenticated workspace access | ✅ PASS (`Arshgill's org`) |
| `Discharge Gatekeeper MCP` registration | ✅ PASS (workspace discovery succeeded) |
| `Clinical Intelligence MCP` registration | ✅ PASS (workspace discovery succeeded) |
| A2A agent-card validation | ✅ PASS after runtime card fix |
| A2A connection creation | ✅ PASS |
| A2A chat execution | ❌ FAIL |
| BYO agent creation | ✅ PASS |
| BYO dual-tool binding | ✅ PASS |
| BYO single-tool Clinical Intelligence Prompt 2 | ✅ PASS |
| BYO single-tool Clinical Intelligence Prompt 3 (tool-explicit) | ✅ PASS |
| BYO dual-tool Prompt 2/3 | ❌ FAIL |

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

### Prompt 2 and Prompt 3 experiment results

Key new finding from the continuation pass:
- the blocker is not a raw `Clinical Intelligence MCP` transport failure
- the blocker is specific to a BYO agent bound to more than one MCP server

#### Single-tool Clinical Intelligence agents

`Care Transitions Command CI Hidden Risk Debug`
- explicit Prompt 2 (`Run surface_hidden_risks on the trap patient and show the result.`): PASS
- canonical Prompt 2 (`What hidden risk changed that answer? Show me the contradiction and the evidence.`): PASS

`Care Transitions Command CI Transition Debug`
- explicit Prompt 3 (`Run synthesize_transition_narrative for the trap patient and show the result.`): PASS
- canonical Prompt 3 (`What exactly must happen before discharge, and prepare the transition package.`): still not proven in the checked window

What this proves:
- Prompt Opinion can persist and render the Clinical Intelligence tool path in the real workspace
- the original failure is not caused by the MCP server being unreachable or undiscoverable

#### Dual-tool BYO agents

`Care Transitions Command BYO Fallback`
- even after hardening the system prompt to force one tool call per turn and forbid `Discharge Gatekeeper MCP` on Prompt 2/3, Prompt Opinion still failed to complete a final assistant transcript artifact

`Care Transitions Command Dual Tool Lean Debug`
- a smaller two-tool routing prompt did not remove the failure

What this proves:
- the narrowest BYO blocker is a Prompt Opinion multi-MCP BYO execution/persistence problem, not a repo transport problem

### A2A registration and execution

The continuation pass fixed A2A registration in the repo/runtime:
- Prompt Opinion `external-agent-card` validation now returns `200`
- `POST /a2a-connections` now returns `201`

But A2A execution is still blocked in the workspace:
- the registered external connection can be selected in the chat UI
- direct `prompt-stream` with `a2aConnectionId` does not produce confirmed external runtime execution
- the external A2A runtime was not hit from the chat execution attempts

Result:
- A2A registration is fixed
- A2A chat execution inside Prompt Opinion is still externally blocked

## Timed results
| Step | Result | Timing |
| --- | --- | --- |
| Previous-pass BYO Prompt 1 visible result | ✅ PASS | 13.2s from user message to persisted tool response |
| Single-tool CI Prompt 2 explicit | ✅ PASS | ~56s from user message to assistant persistence |
| Single-tool CI Prompt 2 canonical | ✅ PASS | ~49s from user message to assistant persistence |
| Single-tool CI Prompt 3 explicit | ✅ PASS | ~48s from user message to assistant persistence |
| Dual-tool BYO Prompt 2 after routing hardening | ❌ FAIL | function call and tool response persisted, but no assistant completion after extended wait |
| Dual-tool BYO Prompt 2 lean variant | ❌ FAIL | no clean completion after extended wait |
| A2A card validation | ✅ PASS | immediate after runtime patch |
| A2A connection creation | ✅ PASS | immediate after runtime patch |
| A2A chat execution | ❌ FAIL | no confirmed external runtime execution from Prompt Opinion chat path |

## Artifacts captured
- `output/prompt-opinion-e2e/runs/20260421T203407Z/` - latest reproducible run bundle (logs, raw payloads, notes templates, status board)
- `output/prompt-opinion-e2e/latest/` - symlink to latest run bundle
- `output/playwright/01-po-login-page.png` - Prompt Opinion login page
- `output/playwright/02-po-workspace-launchpad.png` - Authenticated launchpad
- `output/playwright/03-po-mcp-servers-registered.png` - Both MCPs registered in workspace
- `output/playwright/05-byo-agent-system-prompt.png` - BYO fallback agent configuration
- `output/playwright/06-byo-prompt1-ready-tool-response.png` - Prompt 1 visible `ready` tool response
- `output/playwright/07-byo-prompt3-stalled-session.png` - Fresh-session Prompt 3 stalled workspace state
- `output/playwright/08-a2a-connection-check-modal.png` - External agent connection modal
- `output/playwright/09-single-tool-canonical-prompt2.png` - Single-tool Prompt 2 workspace run
- `output/playwright/10-single-tool-canonical-prompt3.png` - Single-tool Prompt 3 workspace run
- `output/prompt-opinion-e2e/byo-workspace-validation-notes.md` - conversation ids, timings, MCP log findings
- `output/prompt-opinion-e2e/final-transcript-debug-notes.md` - continuation-pass experiment matrix and final blocker isolation
- `output/prompt-opinion-e2e/local-readiness-evidence.txt` - readiness evidence
- `output/prompt-opinion-e2e/timed-rehearsal-results.md` - local rehearsal timings

## Open risks
1. **Dual-tool BYO execution gap**: when one BYO agent is bound to both MCP servers, Prompt Opinion still fails to reliably complete Prompt 2/3 into a final assistant transcript artifact, even after routing hardening.
2. **Canonical Prompt 3 remains weaker than tool-explicit Prompt 3**: the single-tool Clinical Intelligence transition agent completed the explicit tool-directed Prompt 3 but did not prove the canonical Prompt 3 in the checked window.
3. **A2A execution remains blocked**: Prompt Opinion now accepts the external A2A connection, but chat execution still does not produce confirmed external runtime use.
4. **One-agent full 3-prompt BYO fallback path is still not green**: the continuation pass isolated the blocker but did not convert the original one-agent dual-MCP BYO flow into a stable live-demo path.

## Conclusion
**Local rehearsal reproducibility is now green with run-scoped evidence, but the workspace A2A and one-agent dual-MCP BYO lanes remain unresolved.**

What is proven:
- workspace auth works
- both MCPs can be registered
- Prompt Opinion now accepts and stores the external A2A connection after the runtime card fix
- single-tool Clinical Intelligence MCP Prompt 2 can visibly complete in the real workspace
- single-tool Clinical Intelligence MCP Prompt 3 can visibly complete with the tool-explicit phrasing in the real workspace

What is not yet proven:
- a stable single-agent dual-MCP BYO Prompt 2/3 path in the real workspace
- canonical Prompt 3 as a stable visible workspace path
- a Prompt Opinion chat execution path that actually reaches the registered external A2A runtime
