# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-25T19:06:58.264Z`
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
| `external A2A orchestrator` | yes | yes | `green` | before: `https://eubwn-61-246-17-219.run.pinggy-free.link`; after: `https://fpeim-38-183-11-105.run.pinggy-free.link`; check: `200` |
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc606-38ec-7e69-b005-b28ebeba2cf2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc606-38ec-7e69-b005-b28ebeba2cf2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc606-38ec-7e69-b005-b28ebeba2cf2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc608-bd0f-7e19-a496-47e260e31159` | e01d7948-04aa-4ee0-8701-347c486e396b, e63a2dc8-8336-467f-9eb3-5338dbbb1aaa, badaf627-2f7a-4883-b6b2-e2640956226f, 7a125507-5474-4545-b71c-13bec3182473, 5ec25a96-8dbe-4aa9-aee5-d0e7eb1510d7, fb688ea4-75bc-4cb8-97ff-eb599f5cda54, a58e4ae4-707e-48d8-bb42-043b380da627, cb2ff3fb-460b-4498-aa26-22ff45b33182, 136f8aa6-a9df-48ac-9b30-f6b4a896ab44, 146e4718-5ddb-4cb2-9572-ca2c503a26a7, d7ee9c32-11b3-4adf-b440-f9a360c3cba5, 5499e348-0230-4692-aaa2-ec60b53318f6, 23525290-ddd0-4c8d-bc00-190c2ea9f69c | `green` | Prompt Opinion -> both MCPs |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc608-bd0f-7e19-a496-47e260e31159` | 9b97715b-8ed1-4239-b341-7afe9547b1cb, 98ea1451-7955-4d4a-93f3-c00e49d8cad9, 2cfed1a6-f1e4-4f82-a3cd-68054052b4db, 00c41615-5312-42a3-8eea-5c2b8904f143, 1fb3f37a-f946-4e33-a9a7-4e481fc85dc6, e23c9b4c-a726-43b5-a62f-b12fdc40ae0b | `yellow` | Prompt Opinion -> both MCPs |
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
