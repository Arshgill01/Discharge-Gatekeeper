# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-29T18:09:18.751Z`
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
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda63-ce48-7ecf-8538-a9d02176203d` | fe620491-a0d3-4d80-b52a-a2c1a110f5d5, 27682fbe-77a1-4954-98b7-728fcff80112, fd31990b-b301-4531-a55a-87b869ed9de9, f3b7edc1-f086-4e24-8a69-908d434a7716, 56bd53d3-f545-48bb-a4e5-80f09ce7ef77, a8c29973-be61-4558-a80b-bd8779977efb, d4066b7b-3902-4016-ba2c-60aff6e3d320, df556112-925c-4719-900d-9463f276e163, 68a8edc2-fb9a-4b3b-89ee-a0ddb1d83916, 9c0959cd-f89a-4b59-8393-e01aa86bb130, 290af6dc-98c9-4eb5-b21c-403fa048643e, 818ccaca-9bc3-4f04-bb97-b45b606cbba2, 729afadd-1521-4a45-8f5b-27b5146a8a9b | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda63-ce48-7ecf-8538-a9d02176203d` | ec0dc6bd-d1bb-4323-b148-a4dcd5f300a2, d3a74053-a8be-4254-b6c9-8f2f97f5015a, 0c0d4b3d-48e9-4fbe-85e2-2100021a819d, 07588672-82e5-4da5-b4a2-cc20401317d1, 76c971d9-1a7f-42a8-803e-8cd9d1633e50, 522f8e26-3707-4809-83c8-db781579b828, 3fd7c089-df95-45d1-998b-a8032c704811, 51683a4f-8f5b-48c9-b65d-7de0459e123b, 1587f4c2-15d3-4d80-80de-2ac3d4fb53e0, 8114ce25-94fe-4c4e-b0d0-66488e2c6574, bacdd777-547c-4473-bca1-81686487dbcd, 532448cc-5044-4c23-a65e-67f3009d81f1, e7f6f924-ef12-4be9-ac3e-67885355a34b, 9f817027-7fa5-460c-97be-b612130de04c, 3aff8041-4397-40e1-948c-cafd35d1657b, 9a6df4d0-4465-4635-bb27-fad1607cdc67, e690f166-a26a-465c-92ff-617534dcd36b, d68c0155-6811-4014-9095-3fc67e9dd171, ea59a967-b1c4-4542-8a04-caa4881873ab, 1ff8460b-3eef-41cd-845c-a0c1462a0241, 21909aec-a61f-4370-acda-9e03b5adff71, a33677f8-0e1d-43c5-bc2d-d03ca6db0e4c, e53c9501-1da6-43ae-81f6-fc29084d7a17, 6f20236a-b53e-4361-81b4-547bd707d7eb, 2170645c-259b-4457-802e-100b2ce4b487, 722f850e-5858-4acf-9892-027a30e5b9cf | `green` | Prompt Opinion -> both MCPs; settle=`settled_with_runtime`; anchors=pass |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda63-ce48-7ecf-8538-a9d02176203d` | 4a25e145-04e9-4f82-a960-f8ae3fdb30fe, cc8de9d0-bd59-43f1-b1fa-f3c6787e6c17, 6be2ba82-dc85-4a55-bc3e-9161901bd50c, 38a3369d-615d-4302-bc55-f590b8ddcf51, a1e23442-cb1a-4010-a683-7c7a2656e1e3, f942096b-d606-4c35-989a-dbacce0ca1a4, d82c8512-14b5-4482-9cce-77ef082b5d69, a1884215-9d89-4c5d-a344-46968643ac1e, 446a3a8b-bdb7-4245-aabf-c828ca0a60f7, 36010020-19e2-495c-8fdc-b9f23a01b755, e5383106-6069-4cd1-a159-037d43157941, 987689b3-76b1-452b-81c4-494156713601, a2334a69-5f45-4149-862e-730ab73648c5 | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `workspace_ui_unreachable`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `notes/request-id-correlation.md`

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
- FALLBACK-P3-01 function call persisted: no
- FALLBACK-P3-01 tool response persisted: yes
- FALLBACK-P3-01 assistant transcript persisted: no
- FALLBACK-P3-01 semantic anchors passed: no
- FALLBACK-P3-01 settle reason: timeout

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
