# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-25T19:16:02.596Z`
- Browser: Playwright Chromium, headless=true
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://fpeim-38-183-11-105.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://fpeim-38-183-11-105.run.pinggy-free.link`; after: `https://fpeim-38-183-11-105.run.pinggy-free.link`; check: `200` |
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
| Prompt 1 result | see attempt screenshots | `screenshots/*p1*result.png` |
| Prompt 2 result or stall | see attempt screenshots | `screenshots/*p2*result.png` |
| Prompt 3 result or stall | see attempt screenshots | `screenshots/*p3*result.png` |

## Prompt-by-prompt evidence
| Attempt ID | Lane | Surface or agent | Prompt | Expected tool path | Conversation ID | Request or task IDs | Result (`green`/`yellow`/`red`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc60e-982e-7b00-93e8-0c730da09534` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc60e-982e-7b00-93e8-0c730da09534` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc60e-982e-7b00-93e8-0c730da09534` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc611-1d05-7f0b-8f33-47247a6fa269` | 90d55da0-e999-44cb-ba37-5b6badefde75, 9f2de1b0-550c-4b58-a336-498917945873, 307d0a1d-4265-4336-ae6f-3cf651f4527e, dcd67ced-b276-4b84-a361-5a69633a9860, 90aa8c03-3713-4c5d-b15d-dd206967236c, fce11e30-2973-4587-8e1b-20c64edc0aaa, 2325401a-ccb2-4f49-b43d-5ffd13c7feda, 44093a13-3f67-42be-b026-04b97fa57b13, feae88cc-a1a1-4719-88c1-3907eaa24919, 7f93f305-0ef4-4326-b49b-19541321b9ec, 0395da48-330a-45c4-879b-62d962043572, 2b7fba3e-220a-41c4-b3ca-71028b350fb5, f68da100-84af-44eb-b8c3-56997cca92b6 | `green` | Prompt Opinion -> both MCPs |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc611-1d05-7f0b-8f33-47247a6fa269` | 955f7fe5-3442-42d4-b998-0225e56466cf, 2acbef2a-f4a9-4e2a-8dbb-e25e1ebc8435, 9f65ed8b-d586-4ccd-a278-df68351b7dea, d13ea6df-c94e-4dc1-8c02-86217fb9a9c3, 33eb4df8-d3fe-4402-a95d-1ac154dbb8f1, 8de02456-f7b1-460f-ac68-5b5a3a075eab | `yellow` | Prompt Opinion -> both MCPs |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `undefined` | none | `red` | prompt input disabled before send; prior turn likely still streaming or transcript persistence is blocked |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `chat_path_not_routed`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `notes/request-id-correlation.md`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: yes
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: yes
- FALLBACK-P2-01 function call persisted: no
- FALLBACK-P2-01 tool response persisted: yes
- FALLBACK-P2-01 assistant transcript persisted: yes
- FALLBACK-P3-01 function call persisted: no
- FALLBACK-P3-01 tool response persisted: no
- FALLBACK-P3-01 assistant transcript persisted: no

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
