# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-29T17:55:43.442Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://xexwq-38-137-53-117.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://ifyct-38-137-53-117.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://omvpc-38-137-53-117.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://xexwq-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://xexwq-38-137-53-117.run.pinggy-free.link/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://ifyct-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://ifyct-38-137-53-117.run.pinggy-free.link/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://omvpc-38-137-53-117.run.pinggy-free.link`; after: `https://omvpc-38-137-53-117.run.pinggy-free.link`; check: `200` |
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
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda59-c22f-73ee-bebc-8d8422bb1f7b` | b744f7fd-4528-494e-aa56-641241545fde, d125183a-fef6-471e-b457-2f3627e8c3bc, eb9bf748-c89e-48c7-9969-830f4d47a967, 8f7a81e9-4d73-4cf5-81a5-11b837c6053f, a801f5be-ad7b-4b8d-8eb3-50fc5338618c, 82f2fdd8-db82-4c74-8af4-6aca3e9b9d8b | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda59-c22f-73ee-bebc-8d8422bb1f7b` | 91c32b74-1685-409c-890c-280b0d103327, 0e05a297-008b-4ec8-841c-66d1d472bdb2, 7b3e579e-56a1-4211-9561-b5a767144804, 4178f0b0-5342-4749-a900-e56e521e4cc7, 3729a2f4-7548-40b9-8a7e-b4b9cbdd5f4b, e5213ecc-f0e5-4155-b7e9-dff1930dbdb0, a941d395-5ad2-4056-9962-6e5418c913be, 84fde9f4-e489-4d63-9d83-ac587d5a60e0, 8721d475-b68c-4042-8d5a-a9c85acc9110, e621e1df-c062-494b-aaa6-a672e9b3f0c0, 6ba19e94-0fbe-4fd2-a631-c60289c3df15, 648c8717-43c0-47b9-9e14-58ecdeaf1fef, fa1de27a-d497-4795-aea3-f6ca934ea6dd, 67458a59-4350-4ca5-9b4d-4e98add439f2, 39d940f0-f3f9-425d-b869-aedd3473d846, 102fc360-96e0-42bf-852a-5f97b41c26ec | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `workspace_ui_unreachable`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `notes/request-id-correlation.md`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: no
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: no
- FALLBACK-P1-01 semantic anchors passed: no
- FALLBACK-P1-01 settle reason: timeout
- FALLBACK-P2-01 function call persisted: no
- FALLBACK-P2-01 tool response persisted: yes
- FALLBACK-P2-01 assistant transcript persisted: no
- FALLBACK-P2-01 semantic anchors passed: no
- FALLBACK-P2-01 settle reason: timeout

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
