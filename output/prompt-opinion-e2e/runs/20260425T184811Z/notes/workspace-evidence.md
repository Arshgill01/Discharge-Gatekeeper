# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-25T18:56:28.838Z`
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
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://bdpdf-38-183-9-227.run.pinggy-free.link/mcp`; after: `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://lfgan-38-183-9-227.run.pinggy-free.link/mcp`; after: `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `external A2A orchestrator` | yes | no | `red` | before: `https://eubwn-61-246-17-219.run.pinggy-free.link`; after: `https://eubwn-61-246-17-219.run.pinggy-free.link`; check: `not-run` |
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc5fc-be4f-78fe-9352-9c68cd40f911` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc5fc-be4f-78fe-9352-9c68cd40f911` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc5fc-be4f-78fe-9352-9c68cd40f911` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc5ff-2387-7fcd-9402-1e4281c19809` | 2b43f232-2e98-45d7-b3b2-26f78e6caa29, 7d1045a3-07ac-450c-8df2-4423526843a8, 45466860-49d6-4dc0-a7d1-9ea3b3da0922, fa1ee771-a85d-4bb0-b6bd-0851a6db6f79, 4b231460-3a02-4f56-a1d4-c79d1276de8b, de1a8f3d-ef3d-462c-8156-c77dab4d0786, 4b111fb2-5c48-4b65-abc5-55e8faac7e0e, 801a3338-01ae-4560-b670-b8b85426374a, 3e9004b0-dd4c-4887-a46c-16b964f1573b, 4248fd5c-8b0c-41ff-942b-cb583485253d, 5f85f0e2-dd6d-443f-bf9b-8e2f788303b4, a4b20cf9-61ff-4a2c-94f8-1511905df64a, 6d083456-ea0b-4407-9b98-b9c781a4d18a | `green` | Prompt Opinion -> both MCPs |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc5ff-2387-7fcd-9402-1e4281c19809` | 6f57e824-2c73-4720-974e-af7a8871427b, 2c9e6f1d-4ad8-4e82-82f4-82ede4f3f215, a6c5068a-37c3-4feb-8d76-548452d1b142, 3248b351-c365-4d76-9370-d08dbd2e6995, 8e3ec93b-e8da-4970-a965-7785f5c060e8, 83629045-c06f-431b-9a69-4376cdde78cf | `yellow` | Prompt Opinion -> both MCPs |

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

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
