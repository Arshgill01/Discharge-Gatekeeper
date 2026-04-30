# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-30T06:11:36.322Z`
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
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://lamud-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://bdych-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://jzglm-38-137-53-117.run.pinggy-free.link`; after: `https://underpaid-passion-unloaded.ngrok-free.dev`; check: `200` |
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
| A2A-VA-01 | `A2A-main` | Browser proof harness (A) | `Consult Care Transitions Command and ask: Is this patient safe to discharge today? Reconcile the structured discharge posture with hidden narrative risks from the notes.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfb-e1e2-70c4-b303-e5333d4adcc0` | none | `yellow` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`settled_transcript_runtime_missing`; anchors=pass |
| A2A-VB-01 | `A2A-main` | Browser proof harness (B) | `Ask Care Transitions Command to reconcile structured discharge readiness with Clinical Intelligence hidden-risk findings for the canonical trap patient.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfb-e1e2-70c4-b303-e5333d4adcc0` | 5ebd0c05-f6d5-4dd7-8e6e-8cf4a159c29f, d83e1f95-de2e-4a63-b310-c494bc39b0e4, d83e1f95-de2e-4a63-b310-c494bc39b0e4 | `green` | Prompt Opinion -> external A2A runtime; settle=`settled_with_runtime`; anchors=pass |
| A2A-VC-01 | `A2A-main` | Browser proof harness (C) | `Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfb-e1e2-70c4-b303-e5333d4adcc0` | 668e5d40-9e30-42bf-be72-a3bd591f2e1f, 304def47-0e04-4d69-84c1-5cbe319e4833, 304def47-0e04-4d69-84c1-5cbe319e4833 | `green` | Prompt Opinion -> external A2A runtime; settle=`settled_with_runtime`; anchors=pass |
| A2A-VD-01 | `A2A-main` | Browser proof harness (D) | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfb-e1e2-70c4-b303-e5333d4adcc0` | d1529768-ed4d-487d-b8cc-a1dff4e99e96, 55acdc8e-6054-443e-86a9-530485eb470a | `yellow` | Prompt Opinion -> external A2A runtime; settle=`settled_with_runtime`; anchors=pass |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfe-94ad-7ca6-8724-f5f4c0185093` | 612114e8-77e7-4921-a871-7849debbf074, 41c16487-24c1-42e5-aaa4-b698325d969b, 58b5c359-6d4c-4621-bc63-32373600b7e5, fb42e390-0730-410d-8536-32ee057dd9cb, 3d10bd41-7049-4535-ab92-be1cd0f5b42d, fae857f4-ae80-46aa-b171-e4cbf64efd2e, 45da3856-26a2-44f6-a06d-06830104cbb9, 261eaac1-fb1a-4fe8-9f2d-b411be944ae8, c2a8ff9d-cf98-4b3e-afe4-0dd8866c1b3b, 183568ac-661b-477b-839d-5f449d3bd92c, ec485edb-e5c8-466b-8a48-5ffdae35f871, 123eb2ba-fab1-4596-9653-196116469421, 46ead4c2-6264-4fc0-bf5f-6791d2c5b7dc | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfe-94ad-7ca6-8724-f5f4c0185093` | 127617bf-ff21-45a9-a222-a3d1bf39e6cb, 9f56d2a5-3831-45d3-82ad-f68d588e51dc, 977da387-7563-4dc1-bf3c-9b3ea444a0b4, 16595cb5-6d89-4cca-8b6c-5549c4940d24, 5835755c-5bb1-441a-9d5e-a31730d13a76, 8c06a003-3781-4861-a742-1e14162798ab, e08187e1-dcf3-48c1-b50f-f7e73b3a11ac, aaf3dd1d-a598-4c4b-b596-bb3756d6aa6f, 70388c14-0403-4a23-9928-6f7805d1f79e, 5861b14b-1561-4e44-81d7-f26a709d6464, 4392aa89-48e8-45a6-b904-671c1a99b80f, 04c007ba-69d4-43e0-8e5e-cfc6602953fc, d556db9c-4e81-451a-8eb5-67ad9be0edde | `green` | Prompt Opinion -> both MCPs; settle=`settled_with_runtime`; anchors=pass |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019ddcfe-94ad-7ca6-8724-f5f4c0185093` | 84af1682-2034-4bfd-9161-374d893726f1, 851e6457-067c-469f-b0f2-3e63ff23f6c1, def133f5-8923-49cc-a99c-00861d8ff4f3, 4230d728-b064-42c0-90b8-717635367afc, f600f43f-0b7a-48e1-a120-9ce918bc371e, 1dcc88cb-2008-49c9-b508-c23de9345def, 87029606-85ed-44f1-9f6c-f701192f2d96, c37b50fa-3617-4c69-893e-6079a09e84ea, 9b7876d1-258f-4053-8c12-2eab58faa280, 83ed6be8-05ec-448d-b860-2cd633f48455, eeae1103-219a-4933-bdef-8ff84b8defc8, 36401104-2d94-4442-ae2c-4ffcb1d6a93f, 7b9b78a5-8165-4e4b-b4ab-99b19fd31695 | `green` | Prompt Opinion -> both MCPs; settle=`settled_with_runtime`; anchors=pass |

## A2A path evidence
- A2A prompt execution result: `yellow`
- Blocker classification if not proven: `runtime_hit_but_downstream_failure`
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
- A2A-main lane (`green`/`yellow`/`red`): `yellow`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
