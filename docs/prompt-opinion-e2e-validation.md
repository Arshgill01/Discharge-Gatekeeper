# Prompt Opinion E2E Validation

## Scope
This note captures the Phase 4 Prompt Opinion-facing validation pass run from this repo checkout on `2026-04-21`.

It is meant to answer one question:
- is `Care Transitions Command` demo-ready on the preferred A2A path, and what blocks a true in-product Prompt Opinion rehearsal on this machine?

## Browser/UI status
- Public Prompt Opinion entrypoint reached: `https://app.promptopinion.ai/`
- Observed browser state: unauthenticated login screen (`Login | Prompt Opinion`)
- Result: true workspace-level registration/invocation inside Prompt Opinion could not be completed from this environment because no authenticated Prompt Opinion session was available

Captured local artifact:
- login screenshot: `output/playwright/prompt-opinion-login.png`

This means the browser pass proved the real platform entrypoint and the current auth gate, but did not prove in-workspace tool registration from this machine.

## Runtime registration status
- `Discharge Gatekeeper MCP`: reachable on `http://127.0.0.1:5055/mcp`, `readyz` shows expected identity and 5 tools
- `Clinical Intelligence MCP`: reachable on `http://127.0.0.1:5056/mcp`, `readyz` shows expected identity and 2 tools
- `external A2A orchestrator`: reachable on `http://127.0.0.1:5057`, `readyz` and `/.well-known/agent-card.json` show expected identity, dependencies, and `streaming=false`
- direct-MCP fallback surfaces: reachable and callable through both MCP endpoints

## Timed A2A rehearsal
Source artifact:
- `output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json`

Observed results:
- Run 1 total: `204 ms`
- Run 2 total: `50 ms`
- Prompt 1 stayed `ready -> not_ready` with `decision_matrix_row=3`
- Prompt 2 remained the strongest moment after synthesis cleanup, with both the nursing contradiction note and the case-management addendum visible
- Prompt 3 returned a concrete transition package and preserved `not_ready`

Operator friction observed:
- a cold first call is noticeably slower than the warm run, though still demo-safe locally
- without an authenticated Prompt Opinion workspace, registration UX and selector-level drift cannot be validated here

## Direct-MCP fallback validation
Source artifact:
- `output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json`

Validated fallback behavior:
- deterministic `Discharge Gatekeeper MCP` call stays `ready` on the trap patient baseline
- `Clinical Intelligence MCP.surface_hidden_risks` escalates the trap patient to hidden-risk `not_ready`
- `Clinical Intelligence MCP.synthesize_transition_narrative` returns the usable Prompt 3 transition package for fallback
- no-risk control remains bounded at `no_hidden_risk`

Important finding:
- the previous fallback runbook pointed Prompt 3 to deterministic `generate_transition_plan`, but that returns no actionable steps when the structured baseline remains `ready`
- the workable Prompt 3 fallback surface is `Clinical Intelligence MCP.synthesize_transition_narrative`

## Current go/no-go read
- Backend/runtime readiness: `PASS`
- Preferred A2A demo path from local runtime surfaces: `PASS`
- Direct-MCP fallback from local runtime surfaces: `PASS`, after using `synthesize_transition_narrative` for Prompt 3
- True Prompt Opinion in-workspace rehearsal on this machine: `BLOCKED BY AUTH`

## Next operator step
Run one authenticated Prompt Opinion workspace rehearsal using the exact public URLs that will be used on demo day.
Until that happens, the system is runtime-demo-ready but not fully Prompt Opinion-UI-verified from this environment.
