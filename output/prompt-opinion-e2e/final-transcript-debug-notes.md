# Final Transcript Debug Notes

## Date
2026-04-21

## Fresh live endpoints used in this pass
- `Discharge Gatekeeper MCP`: `https://ouwgn-38-183-9-129.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://yvgqu-38-183-9-129.run.pinggy-free.link/mcp`
- `external A2A orchestrator` card: `https://wmuzt-38-183-9-129.run.pinggy-free.link/.well-known/agent-card.json`

## Runtime status
- local `run-full-system-validation.sh`: PASS
- live MCP registration tests in Prompt Opinion: PASS
- live external A2A agent-card validation in Prompt Opinion: PASS after agent-card schema patch

## Experiment matrix

### A. Single-tool Clinical Intelligence MCP agents

#### A1. `Care Transitions Command CI Hidden Risk Debug`
- Bound MCPs: `Clinical Intelligence MCP` only
- Prompt: `Run surface_hidden_risks on the trap patient and show the result.`
- Conversation: `019db134-3fb6-7857-9756-4245510b15c3`
- Outcome:
  - function call persisted
  - tool response persisted
  - final assistant message persisted
- Status: PASS

#### A2. `Care Transitions Command CI Hidden Risk Debug`
- Bound MCPs: `Clinical Intelligence MCP` only
- Prompt: `What hidden risk changed that answer? Show me the contradiction and the evidence.`
- Conversation: `019db143-9db4-72a9-8153-5226c92ba83e`
- Outcome:
  - function call persisted
  - tool response persisted
  - final assistant message persisted
- Status: PASS
- Note: canonical phrasing works, but takes materially longer than the tool-explicit phrasing

#### A3. `Care Transitions Command CI Transition Debug`
- Bound MCPs: `Clinical Intelligence MCP` only
- Prompt: `Run synthesize_transition_narrative for the trap patient and show the result.`
- Conversation: `019db137-2e45-75be-93db-9999af708be2`
- Outcome:
  - function call persisted
  - tool response persisted
  - final assistant message persisted
- Status: PASS

#### A4. `Care Transitions Command CI Transition Debug`
- Bound MCPs: `Clinical Intelligence MCP` only
- Prompt: `What exactly must happen before discharge, and prepare the transition package.`
- Conversation: `019db158-c0fe-78af-83dd-03fa0a8dee3c`
- Outcome:
  - function call persisted
  - tool response persisted
  - no final assistant message after an extended wait
- Status: FAIL
- Note: canonical Prompt 3 remains blocked while the tool-explicit Prompt 3 completes

### B. Dual-tool BYO agents

#### B1. `Care Transitions Command BYO Fallback` before routing hardening
- Bound MCPs: `Discharge Gatekeeper MCP` + `Clinical Intelligence MCP`
- Prompt: `Run surface_hidden_risks on the trap patient and show the result.`
- Conversation: `019db139-dd96-7d79-bd07-c6b11b3bbce3`
- Outcome:
  - first called `assess_discharge_readiness`
  - then called `surface_hidden_risks`
  - tool responses persisted
  - no final assistant message
- Status: FAIL

#### B2. `Care Transitions Command BYO Fallback` after routing hardening
- Bound MCPs: `Discharge Gatekeeper MCP` + `Clinical Intelligence MCP`
- System prompt changed to:
  - force one tool call per turn
  - forbid `Discharge Gatekeeper MCP` on Prompt 2/Prompt 3
  - provide fixed deterministic snapshot and evidence bundle
- Prompt: `Run surface_hidden_risks on the trap patient and show the result.`
- Conversation: `019db13d-6196-70dd-ac34-fa3576dd8ed4`
- Outcome:
  - called only `surface_hidden_risks`
  - tool response persisted
  - no final assistant message after extended wait
- Status: FAIL

#### B3. `Care Transitions Command Dual Tool Lean Debug`
- Bound MCPs: `Discharge Gatekeeper MCP` + `Clinical Intelligence MCP`
- Leaner system prompt than the main fallback agent
- Prompt: `Run surface_hidden_risks on the trap patient and show the result.`
- Conversation: `019db141-7716-793e-84ff-4d97cdbf4fed`
- Outcome:
  - function call persisted
  - no tool response or final assistant message persisted in the checked window
- Status: FAIL

## BYO conclusion
- Single-tool Clinical Intelligence MCP agents can complete and persist transcript output.
- Dual-tool BYO agents remain unstable even after prompt-routing hardening.
- The narrowest blocker is:
  - when one BYO agent is bound to both MCP servers, Prompt Opinion fails to consistently complete the turn into a final assistant transcript artifact after MCP execution.

## A2A status

### A2A registration
- Initial state: Prompt Opinion card validation returned `422`
- Cause isolated in repo/runtime:
  - external agent card emitted a sparse/legacy shape
- Fix applied:
  - add public `url`
  - add `protocolVersion`
  - add `supportedInterfaces`
  - add `additionalInterfaces`
  - add non-empty `skills`
  - add `defaultInputModes` / `defaultOutputModes` as `text/plain`
  - derive public base URL from forwarded host/proto
- Result:
  - `external-agent-card` validation returned `200`
  - A2A connection create returned `201`
- Connection id:
  - `019db14c-a5c7-7fd7-b0fc-c65abb8255f8`

### A2A execution

#### A2A consult via General Chat + dropdown
- Conversation: `019db14e-4028-7192-aee9-2cb502d89372`
- Outcome:
  - no A2A runtime hit observed
  - host chat path returned a Gemini internal error on direct `prompt-stream` with `a2aConnectionId`
- Status: FAIL

#### A2A consult via `Care Transitions Command A2A Router Debug`
- Conversation: `019db155-cd4f-7b85-a0cb-0e3151f8ef37`
- Outcome:
  - no A2A runtime hit observed
  - host BYO agent answered directly (`I don't have a patient selected...`)
  - direct `prompt-stream` with `a2aConnectionId` still produced host-agent text instead of external runtime traffic
- Status: FAIL

## A2A conclusion
- Prompt Opinion external-agent registration is now fixed.
- Prompt Opinion external-agent execution from chat is still blocked.
- The narrowest blocker is:
  - Prompt Opinion accepts and stores the external A2A connection, but the chat execution path does not actually route the turn to the external runtime in this workspace setup.

## Current strongest usable workspace path
- Prompt 2 contradiction moment:
  - `Care Transitions Command CI Hidden Risk Debug`
  - canonical or tool-explicit prompt both work
- Prompt 3 transition package:
  - `Care Transitions Command CI Transition Debug`
  - tool-explicit prompt works
- Prompt 1 baseline:
  - prior BYO evidence still shows the deterministic `ready` baseline
  - current dual-tool path remains unstable for a complete 3-prompt one-agent fallback run
