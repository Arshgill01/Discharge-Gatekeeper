# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-28T09:07:57.878Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `not provided`
- `Clinical Intelligence MCP`: `not provided`
- `external A2A orchestrator`: `not provided`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | no | `red` | before: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `Clinical Intelligence MCP` | yes | no | `red` | before: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `external A2A orchestrator` | yes | no | `red` | before: `https://hlzun-38-183-11-105.run.pinggy-free.link`; after: `https://hlzun-38-183-11-105.run.pinggy-free.link`; check: `not-run` |
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd34c-8e14-77c2-849a-b80fea9fd4d5` | 21a713a0-97cd-4623-bb6d-ce6a62488320, e9b8af67-146e-4661-88d0-01e45e61b98d, 54f829a4-8005-4398-a19a-d629001fac14, b18bf8ca-5efc-4a95-93b2-eeea7051c71f, 1aaa965f-8f83-490b-b3db-511d71451394, 632523d7-bb3d-46fe-bd4a-e9d898c3dc0d, 95f5dc78-8620-4f0e-bae1-27783989fb1d, 405507d3-aca3-42a8-8308-7dc2f6661239, b403b06a-4ca0-4969-9810-aa57873e14dd, 3012e64a-9cf9-43c1-ae01-d0e35fc059c8, fbee22b0-c757-43cc-997c-ff07d27a24c3, 6e7e37f4-540c-4221-814a-51bc886c5b93, 4396bbee-4ccb-4a51-bb57-73ff6c1be554, 388ce36c-78c3-447f-9840-b17b61eb0f9f, 4370c0cb-36cf-413d-82c0-2d081ef2cda6, b287a66a-6b10-419d-b5c0-3822bee0e6a6, 9484d579-9c55-4ad1-8ce5-445d5271ae0e, 4d340d52-f688-486c-a080-3955c2eefca0, 99e8d969-1b6e-4a02-8d08-4a8285af4a1c, 0fa4756d-258d-4bef-9ede-0a100090ac20, 96e0710f-aef4-4898-ad71-34472d9eba1c, f0ae00e1-2273-4eaa-ab65-44af426eaee0, ba37c32e-29d3-4642-89c7-f3aecb37b8ba, 8420b982-6451-49e2-92d2-72f8308ce4ff, a29f941b-14f1-49db-b6da-4ec988838ac3, 547e740b-c70b-4865-8728-4930f49f517e, 9f53498b-42d7-48a8-91b6-0e92b9bc585e, a2c41b8e-5929-47f3-8f72-ed1784137062, f5bd4cdd-453c-429f-87fb-8d72bb3efed9, 94eb1cf8-e757-4422-a100-f08ab393c6ea, dd75c814-3fab-4027-870a-cc7bf3faa966, fa79929f-3b34-4b9b-8d04-6d2cb8e7a65f, 28665cdc-7e64-430b-a32e-8d159857346b, d56873f3-6fc3-45fb-8dd3-3abf966b1428, 261d6da8-8591-42c5-9efe-7e814b3482e2, b980d1ab-0f04-4501-b969-855b0f51dc93, 43880f30-0a4c-47f0-808b-fadcf8f05077, d0d0b9ef-c675-45bd-b82c-9df212af1af3, e4fb2ced-534f-40b2-ac7e-1ec351f448e3, a8f8c267-0f15-4734-b12a-56941b0b7220, da12bcff-201e-4bca-a32d-d1aab871308f, 81efc5f0-4d37-4fb3-83f3-d19a3b625955, 78f10989-bfe7-483b-94d3-e8623a5e91a2, 084e7de6-46da-462a-a205-495400a7b103, 90b34e68-845d-4b57-94dc-59d78c7cf2ae, e970b0a0-14ba-42db-bd86-16b807e6c1b1, 395ff7a4-4c94-4334-a876-25d26b8ab683 | `yellow` | Prompt Opinion -> external A2A runtime; settle=`timeout`; anchors=fail |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd34c-8e14-77c2-849a-b80fea9fd4d5` | 6f02f319-5ee6-4aa0-84db-12f480e9e50e, 4e48019c-ea97-44ec-b607-d6579e12f20f, 9a3aa9a2-4ae2-4f0d-9bda-4bbdd6eb6f61, 52cf91e0-4aad-42a8-afa4-1bcaea93be28, 57cb82ca-4a1d-4557-a5dc-e1d0e01b7e8d, 12eb4b47-b404-44cc-a004-b9d11382f07c, a7015644-9f5b-4fbb-97b7-cf4a677051ab, da07301b-ade5-4117-8ad9-edc8b8845ab7, 2d94c4c6-60e9-4cd4-8a48-f841cb1bbdc3, 3fcef2fa-ed0d-4861-b7d7-aadc273cfba5, 04bc94b3-793d-4b6c-b5da-ae2d037302fc, bb17ce28-b3dc-45b7-824a-08416f7be137, 6d19abb6-c7b4-4979-8d08-2b97ddfc52ab, b5d28849-28be-4ccd-a30a-5461c8dc4a4f, 82fc22c9-edc2-405a-b7d9-24b733688c47, b29abddd-73fe-4e27-9c6f-fa30560996ed, f32dae16-5f16-48cb-a55e-a340489381cf, 6b4222d6-b53f-43f7-8a09-a4c3b3bec938, 5ffe8dd2-0d7a-415d-9785-8ddaf00f23e0, cfc2687e-f801-42a3-9b11-558413580efe, b07d9395-a6eb-4702-b520-a46366236afe, fa5e47ce-2d73-4d17-83f6-0e66e4bd1e9b, ce25712f-59e0-464e-86d8-691eb009e729, d27729eb-3f7c-449e-a19c-e948012e02d3, 1ec3a4d1-e582-4e0d-a25d-9b45a23761a8, 82206122-5c37-4fb2-a71c-310b7a443c1e, aeca846b-9424-4ef6-a42b-1d01ce88899d, 2e159821-5d01-42d9-86d9-2d765e4d56ef, 41941b90-4ad4-40c8-8158-658bebd38e10, 37fb3205-37b5-4fc3-bfc1-a474233f3e20, f461050e-5a27-4b9a-80bd-29df8813a8e1, e104359c-2502-40f0-afc0-d19f68fd81b1, 2f2a52ed-c7fe-4cc8-905a-24b0cc0568d5, 82936205-6dd2-47b0-ba54-cafdd5bda2e0, ec500c55-3d6b-4826-ba5e-d65b235d7066, 6a6ee389-3b09-4e93-88e4-89bf98d600a4, c5e64e2a-cf40-4fd3-b0d9-7f41afb24aab, a60f4473-a05b-4052-8614-e32cc3891bec, 9c8c73db-cb8a-496e-9ac5-5b1c94066bb4, 8f66595e-4122-4135-86de-46e3de2851ef, ef71f801-bb55-4aaa-b68e-4d7d15c38875, 179c61bf-21ee-4a73-a7ad-578c50ffd5a3, c7c00933-0477-4cec-861d-17e56247ffc6, 04d462c5-ca43-4dae-bd2a-a329206cdec1, e974bc03-3b19-4bc0-b952-6c8edcf601df, d4a597c0-1aa4-4ca1-9098-77d23ac80259, c7d65fed-875d-44ed-9e80-55fff4a3ca2b, af408813-0494-4933-aab1-b7a2a3ba5360, 95fa12e6-b924-4a4b-a9c1-fa1244aaf695, b69a9337-8933-44d8-8cc8-6d04bc963b07, 697ccf1c-bd6f-44cd-b5f2-0695eff7e735, 66948d85-d0c9-43b6-8d04-4bab132e7f4f, f498ae06-4f57-4b7c-9585-17b1cd4c614b, 99bdb555-7f4a-48ce-b489-ef6ac8756681, 4589c204-03ab-48b4-8c40-c387694e66d3, c92eb762-2ccd-4933-8760-2bdc59e11466, d3545d11-9ebd-4284-a7c4-08083cab0453, 8ad3c3a1-2fab-4f1f-becc-6ee5bd8cae4b, 93f7b810-fd57-4fb0-8871-e4004a0f694f, da660282-3bcf-43cd-9163-d94faf8524d6, 58582e6c-e231-42a7-b971-ae7d6cab67d7, 083c2cd7-196b-4c73-a658-51e51791da53, 4007f2fc-66cf-4f3a-b86f-fd6844349674, fbaf2484-562a-4cb0-8d00-fea6d1560f25 | `yellow` | Prompt Opinion -> external A2A runtime; settle=`timeout`; anchors=fail |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd34c-8e14-77c2-849a-b80fea9fd4d5` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd355-58cb-7337-9c73-728253b51dbf` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `runtime_hit_but_no_transcript`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `notes/request-id-correlation.md`

## Dual-tool BYO path evidence
- FALLBACK-P1-01 function call persisted: no
- FALLBACK-P1-01 tool response persisted: yes
- FALLBACK-P1-01 assistant transcript persisted: no
- FALLBACK-P1-01 semantic anchors passed: no
- FALLBACK-P1-01 settle reason: timeout

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `red`
- Preferred live lane from this run folder: none
