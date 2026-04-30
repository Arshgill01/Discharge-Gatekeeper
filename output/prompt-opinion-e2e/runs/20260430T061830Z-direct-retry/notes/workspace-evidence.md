# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-30T06:27:13.413Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp`
- `Clinical Intelligence MCP`: `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp`
- `external A2A orchestrator`: `https://underpaid-passion-unloaded.ngrok-free.dev`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp`; after: `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp`; after: `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://underpaid-passion-unloaded.ngrok-free.dev`; after: `https://underpaid-passion-unloaded.ngrok-free.dev`; check: `200` |
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
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddd0a-d76c-72f4-afa3-fbb1ae9129f8` | d7c5093b-a15a-4082-8be1-7aecaf475cb0, 42064f36-1a48-455e-91fa-18b35e51e15b, 5157c099-7d8b-4659-ba47-7f1fb278594b, 2d75c3f5-33ff-45ea-a45e-55b33bd8fe6d, 9b1af88c-c168-4017-ae4a-8d34846c22f5, 5851f5c5-7bfe-4cc0-9620-653c025bc5ae, 3b2202d1-225c-46c3-b197-c767dba07415, c9f013ca-4baf-43b1-bc87-004cbd0e0876, d40c8b2a-900d-4581-9424-933685160e62, 6172f3cc-6728-487e-b0b4-c8f32ca3633a, cd6d825b-5a8a-48e5-af0e-51efc62b0848, 6b82a535-bc34-4c28-9507-642c38c14b47, 40484d7e-fd14-42d3-8fc2-bb34fa7c7733 | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddd0a-d76c-72f4-afa3-fbb1ae9129f8` | 72e67726-21b6-411a-b849-41d3b0d7e2eb, 4a552126-208d-4aba-bfae-2ef5ac8706b2, b68cb0fe-f8dc-46e2-b57e-b0a684650c12, 7b521ba7-de78-468e-a454-de1b02cc686a, a5da8889-f992-42a2-bf16-9de4d7136864, 76cbf1b4-81f0-4175-ad50-1225bf0acd9d, ff2fff3a-b825-4e80-ad2c-595671e5d7fd, b43589e1-7533-4e71-8fec-4c61b818c5ec, 80527867-4caf-444e-8196-5b612a090095, 4c886dda-e5e3-4f66-8105-16321d36bca6, d7b4aac8-c191-4bb0-beb8-43385ae52652, 17fa0ede-56b6-4796-85d3-a01f8a2d7ba8, def7d8c8-7598-4716-8fd1-7eca9088940a | `green` | Prompt Opinion -> both MCPs; settle=`settled_with_runtime`; anchors=pass |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddd0a-d76c-72f4-afa3-fbb1ae9129f8` | 15900c32-8c6d-434f-aa54-75c26e926e77, ec17bceb-054b-491d-8f68-7de2cdd89a51, d988dcae-b1f8-4b95-93d8-539cf5376238, 6fe6eb80-fc30-476b-9062-437c4aa40689, 2c6706ee-d1fc-4fab-aeef-9c688ad5dbfe, 27afdb6b-4f4e-410d-951a-55c2d5b9fa62, 52369957-5789-4fa5-a886-0748854f0a12, 3ce314ba-df2f-4d6e-9d03-ed7fc8977d41, dd2ee773-e5ae-4fce-85a5-548aff4898e4, c7fb1860-5898-4b08-9326-bc08bd9b8de6, 86293a6f-02db-4516-8ae6-0631819ccce3, 4143c598-2737-467e-8096-2fb2fbd8f2c9, a7f29add-3af8-4d81-a973-610111b91029 | `green` | Prompt Opinion -> both MCPs; settle=`settled_with_runtime`; anchors=pass |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `workspace_ui_unreachable`
- Route-lock matrix: `reports/a2a-route-lock-matrix.json`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `reports/a2a-runtime-correlation-summary.json`, `notes/request-id-correlation.md`
- Downstream MCP hit summary: `reports/a2a-downstream-mcp-hit-summary.json`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: yes
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: no
- FALLBACK-P1-01 semantic anchors passed: no
- FALLBACK-P1-01 settle reason: timeout
- FALLBACK-P2-01 function call persisted: no
- FALLBACK-P2-01 tool response persisted: yes
- FALLBACK-P2-01 assistant transcript persisted: yes
- FALLBACK-P2-01 semantic anchors passed: yes
- FALLBACK-P2-01 settle reason: settled_with_runtime
- FALLBACK-P3-01 function call persisted: yes
- FALLBACK-P3-01 tool response persisted: yes
- FALLBACK-P3-01 assistant transcript persisted: yes
- FALLBACK-P3-01 semantic anchors passed: yes
- FALLBACK-P3-01 settle reason: settled_with_runtime

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
