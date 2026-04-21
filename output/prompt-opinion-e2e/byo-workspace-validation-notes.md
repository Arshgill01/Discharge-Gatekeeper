# BYO Workspace Validation Notes

## Workspace
- Org: `Arshgill's org`
- Agent: `Care Transitions Command BYO Fallback`
- MCP URLs:
  - `Discharge Gatekeeper MCP`: `https://xcstk-112-196-95-14.run.pinggy-free.link/mcp`
  - `Clinical Intelligence MCP`: `https://gwqfe-112-196-95-14.run.pinggy-free.link/mcp`

## Conversation evidence

### Conversation 1
- Conversation id: `019daf51-4e61-7c6f-a0bc-8fa9ef412ed6`
- Prompt 1 user message: `2026-04-21T09:18:23.781836+00:00`
- Prompt 1 function call persisted:
  - `assess_discharge_readiness`
  - `2026-04-21T09:18:32.998474+00:00`
- Prompt 1 tool response persisted:
  - `2026-04-21T09:18:36.937543+00:00`
  - verdict: `ready`
- Prompt 2 user message persisted:
  - `2026-04-21T09:20:35.605677+00:00`
- Prompt 2 did not produce persisted assistant/tool messages.

### Conversation 2
- Conversation id: `019daf5b-572b-7829-aa2b-0d8e7a171afb`
- Prompt 2 fresh-session user message persisted:
  - `2026-04-21T09:25:29.649281+00:00`
- No persisted assistant/tool messages followed.

### Conversation 3
- Conversation id: `019daf5f-02c0-7206-9951-c80a8d90eff0`
- Prompt 3 fresh-session user message persisted:
  - `2026-04-21T09:29:34.888816+00:00`
- No persisted assistant/tool messages followed.

## MCP log findings

### Prompt 2 same-session
- `Discharge Gatekeeper MCP` received requests at:
  - `09:20:36.548Z`
  - `09:20:37.130Z`
  - `09:20:38.606Z`
- `Clinical Intelligence MCP` received requests at:
  - `09:20:37.541Z`
  - `09:20:38.303Z`
  - `09:20:39.178Z`

Interpretation:
- the hidden-risk path reached both MCP runtimes
- Prompt Opinion did not persist/render the resulting conversation artifacts

### Prompt 3 fresh-session
- `Discharge Gatekeeper MCP` received requests at:
  - `09:29:35.767Z`
  - `09:29:36.524Z`
- `Clinical Intelligence MCP` did not show corresponding Prompt 3 traffic in the observed window

Interpretation:
- the required `synthesize_transition_narrative` path was not proven from the real workspace

## Prompt-stream findings
- Prompt Opinion returned `POST .../prompt-stream => 200 OK` for Prompt 1, same-session Prompt 2, and fresh-session Prompt 2.
- A successful `prompt-stream` response alone was not sufficient to guarantee visible/persisted assistant output in the workspace transcript.

## Working conclusion
- Visible real-workspace proof exists for:
  - workspace auth
  - MCP registration
  - BYO tool binding
  - Prompt 1 deterministic baseline
- Visible real-workspace proof does not yet exist for:
  - Prompt 2 contradiction output
  - Prompt 3 transition package output
  - a repeatable 3-prompt BYO fallback demo in one session
