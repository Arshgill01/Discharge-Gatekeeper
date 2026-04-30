# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-28T09:06:44.662Z`
- Browser: Playwright Chromium, headless=true
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `not provided`
- `Clinical Intelligence MCP`: `not provided`
- `external A2A orchestrator`: `https://kind-ears-talk.loca.lt`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | no | `red` | before: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `Clinical Intelligence MCP` | yes | no | `red` | before: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `external A2A orchestrator` | yes | yes | `yellow` | before: `https://kind-ears-talk.loca.lt`; after: `https://kind-ears-talk.loca.lt`; check: `422` |
- Registration update mode: `enabled`
- Exact registration API evidence: `reports/registration-verification.json`

## Screenshot checklist
| Screenshot | Captured | File |
| --- | --- | --- |
| Login page | yes | `screenshots/01-po-login-page.png` |
| Workspace launchpad | yes | `screenshots/02-po-workspace-launchpad.png` |
| MCP registrations | yes | `screenshots/03-po-mcp-servers-registered.png` |
| A2A connection status | yes | `screenshots/04-po-a2a-connection-status.png` |
| BYO agent config | yes | `screenshots/05-po-byo-agent-config.png` |
| Selected external A2A agent | yes | `screenshots/a2a-consult-selected.png` |
| A2A route-lock variants | see attempt screenshots | `screenshots/a2a-v*-result.png` |
| Prompt 1 result | see attempt screenshots | `screenshots/*p1*result.png` |
| Prompt 2 result or stall | see attempt screenshots | `screenshots/*p2*result.png` |
| Prompt 3 result or stall | see attempt screenshots | `screenshots/*p3*result.png` |

## Prompt-by-prompt evidence
| Attempt ID | Lane | Surface or agent | Prompt | Expected tool path | Conversation ID | Request or task IDs | Result (`green`/`yellow`/`red`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A2A-VA-01 | `A2A-main` | Browser proof harness (A) | `Consult Care Transitions Command and ask: Is this patient safe to discharge today? Reconcile the structured discharge posture with hidden narrative risks from the notes.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd354-3797-77fb-911e-0b7d100aade6` | none | `yellow` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-VB-01 | `A2A-main` | Browser proof harness (B) | `Ask Care Transitions Command to reconcile structured discharge readiness with Clinical Intelligence hidden-risk findings for the canonical trap patient.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd354-3797-77fb-911e-0b7d100aade6` | none | `yellow` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-VC-01 | `A2A-main` | Browser proof harness (C) | `Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd354-3797-77fb-911e-0b7d100aade6` | none | `yellow` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-VD-01 | `A2A-main` | Browser proof harness (D) | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd354-3797-77fb-911e-0b7d100aade6` | none | `yellow` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd356-0059-7cc8-8add-0ca442468a8c` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd356-0059-7cc8-8add-0ca442468a8c` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd356-0059-7cc8-8add-0ca442468a8c` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |

## A2A path evidence
- A2A prompt execution result: `yellow`
- Blocker classification if not proven: `chat_path_not_routed`
- Route-lock matrix: `reports/a2a-route-lock-matrix.json`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `reports/a2a-runtime-correlation-summary.json`, `notes/request-id-correlation.md`
- Downstream MCP hit summary: `reports/a2a-downstream-mcp-hit-summary.json`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: no
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: no
- FALLBACK-P2-01 function call persisted: no
- FALLBACK-P2-01 tool response persisted: yes
- FALLBACK-P2-01 assistant transcript persisted: yes
- FALLBACK-P3-01 function call persisted: no
- FALLBACK-P3-01 tool response persisted: yes
- FALLBACK-P3-01 assistant transcript persisted: yes

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `yellow`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `red`
- Preferred live lane from this run folder: none
