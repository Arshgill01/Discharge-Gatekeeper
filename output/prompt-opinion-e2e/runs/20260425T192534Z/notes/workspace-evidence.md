# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-25T19:32:05.745Z`
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61c-951b-7123-8f3f-85345337d80a` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61c-951b-7123-8f3f-85345337d80a` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61c-951b-7123-8f3f-85345337d80a` | cc01742d-1200-4d47-92ed-97526808e0b3, c47b4076-a109-4347-9e15-b87759368195, c47b4076-a109-4347-9e15-b87759368195 | `green` | Prompt Opinion -> external A2A runtime |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61e-56dc-7295-b8c9-6160472fdc25` | fc85b99a-0e0b-4dad-8199-177f1304bfd8, 497fff2c-434a-42ca-864e-7b2e32f9276e, d5b77f13-9280-445c-8c84-cabe06169e1d, f7e8b340-5e0b-4e07-b6c9-d2b75db0f80d, 05f2f312-a0cb-4f90-a470-4a1e43f01b2f, 419cd998-1c6a-4b50-9ddb-e11051bb6dae, fb28c832-9be5-45b1-b3c3-f53ba71d3c39, 4bf42a54-a063-4c48-ad27-2d9c79e66ec0, 871d45c5-58a6-4372-9733-681548f958a1, 6d3d5651-056c-49cd-9e27-b5f8ba7bb7af, 1c6cf561-a8d3-41b9-86dd-b65bcac66e74, 15ee3339-c04e-4034-9c7c-365c8ce5bc29, 5fbce75a-fb16-4663-ba20-e71e29058ae4 | `green` | Prompt Opinion -> both MCPs |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61e-56dc-7295-b8c9-6160472fdc25` | dc4b0ed4-f296-4169-a228-535202d8fd15, 15d4aad3-0982-4f5b-8a7a-d69b99546d07, 5caeb6af-503c-44d2-af49-31e198828ca2, 4ec492db-6118-40e4-9218-a17b18194bce, d09b23ad-63c0-4cde-b89c-24df2cdee4fd, 52da943d-9cec-4d16-bb9e-6ff3a1728e04, 11267f8a-cf5a-4df6-9c31-41a2b5e9ce59, f2683770-b476-4727-a106-56a1f44b3187, 4c4bf61c-aa18-4809-b914-faa0a682773c, b830d460-236e-4ac6-8729-9e5b9648d08c, c1f04550-4c91-41d9-9704-e576b7ef27a6, 160f8795-241d-4ee1-ae0f-e11758b3691b, b95ef96b-3a1d-46c9-8d9d-5a8e7d7e705e | `yellow` | Prompt Opinion -> both MCPs |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc61e-56dc-7295-b8c9-6160472fdc25` | 07a4deee-1720-4805-a564-23f82e944b8d, d337142f-f3ed-41d3-b88f-fac940e3dd63, 71660bcb-7713-497f-9810-8e5080a89bd1, 772250f0-61f0-4036-987c-bf197e299719, 9b2abd8c-71ec-4b5a-93eb-568d8571971d, 8ddb8dfb-c5e9-4cef-9c5b-e9414875dd1d, bf132c8f-9635-4ff7-a8f0-399293f58c64, 40e5c340-68a1-4645-b179-6cfa742647dc, 8e7bed08-58dd-4c72-a7b6-19227afdca7f, d8fb71b2-2d69-447e-8812-5fe696fcab5b, 5fd7168e-e1ed-41e0-bcd2-5b4b2ac09139, 88619536-2d3f-42a0-b295-6db189ff8b35, 91d80ac8-2aab-4ae1-85bf-a2c4278c12ee | `green` | Prompt Opinion -> both MCPs |

## A2A path evidence
- A2A prompt execution result: `yellow`
- Blocker classification if not proven: `runtime_hit_but_downstream_failure`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `notes/request-id-correlation.md`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: yes
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: yes
- FALLBACK-P2-01 function call persisted: no
- FALLBACK-P2-01 tool response persisted: yes
- FALLBACK-P2-01 assistant transcript persisted: yes
- FALLBACK-P3-01 function call persisted: yes
- FALLBACK-P3-01 tool response persisted: yes
- FALLBACK-P3-01 assistant transcript persisted: yes

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `yellow`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
