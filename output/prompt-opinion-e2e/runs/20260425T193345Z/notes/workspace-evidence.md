# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-25T19:43:37.329Z`
- Browser: Playwright Chromium, headless=true
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://hlzun-38-183-11-105.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://fpeim-38-183-11-105.run.pinggy-free.link`; after: `https://hlzun-38-183-11-105.run.pinggy-free.link`; check: `200` |
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc627-1aae-7263-a6a3-95c6960a48cc` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc627-1aae-7263-a6a3-95c6960a48cc` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc627-1aae-7263-a6a3-95c6960a48cc` | 834fad9b-2876-4c08-959e-17c457740fe0, cad57fd1-7c4e-4202-9bdf-2d8a2acc9eaf, cad57fd1-7c4e-4202-9bdf-2d8a2acc9eaf | `green` | Prompt Opinion -> external A2A runtime |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc629-02af-7293-9834-9a90756f4cf4` | f25cd746-de94-413d-be2a-917c4c9519f0, 146458db-0f88-432e-a707-8b84fc750f13, efa981c2-74da-4f34-947d-41a6ba3b6d42, 0db9c29a-2551-4656-8762-9b33be15f931, ffb19581-f19a-496b-b8de-0f35d2cf22ca, 96d3e64c-61e5-4cd7-9cfb-f2401b6e8a54, a67d24c1-3823-4d4e-b4e1-8a1547068067, f2e9baa2-3324-4b7c-af89-49d5f36a0027, e3b17c6f-ee88-4484-b607-ee7a1eadf36c, 6e890715-c744-4283-9696-ae66e044f98d, 482273fc-2d5e-4bba-8101-51d02fcee934, e7ca94b7-c0d0-402d-b9ad-b52a8b6ecaa3, 19296ac6-deca-416f-b66e-a7074e9f7a8d | `green` | Prompt Opinion -> both MCPs |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc629-02af-7293-9834-9a90756f4cf4` | 86b40ca8-f2a5-4d90-8006-7a33482a3b73, 610b27c6-e8f4-4ae4-8a76-64516b53f234, ddc0043f-39dd-4eac-9f22-e50b7d9aa5f0, 73a0b45b-34cb-4abf-9fda-cc4ddce26f4c, 1f3f4cea-d2c5-4221-bf7f-d78c792e7c76, 00bd36ea-a388-48e7-a7a3-43868e23355e, 64aaaf33-a581-45e6-bcc9-840b0d90ee59, 59ffc3e5-885c-4b47-ad04-9363fd5867a1, c32a0acb-9344-4856-84b0-51ae1bf8ca62, 190e1b76-fa36-477e-b809-e0247cc884b1, 1a25f741-105d-40be-95d5-564fd1fe42ab, 6642cdaf-5358-4163-b025-d195e490eb81, 8a782c03-a345-4dff-b3d3-3c79bf8c6bac | `yellow` | Prompt Opinion -> both MCPs |
| FALLBACK-P3-01 | `Direct-MCP fallback` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dc629-02af-7293-9834-9a90756f4cf4` | dc71acd5-8a68-4e3d-b60b-502e33986106, a07d4a2c-3e51-46e0-b464-e761410ee3ae, 1f8c7be3-d1e1-49b2-83c8-5c232d3752f4, bd50382d-a225-4d69-bc56-a3b742a384d3, e188c6dd-8311-42c4-899c-bcce73504ab1, 651f4234-c9b1-4ba5-8360-565b09aad32c, 11db0fe2-2723-428a-84a6-3a22bcf48d3a, ca99654c-dff8-4c68-b131-da18beab5e35, e341928f-64ca-4255-9df9-90d785317779, 2ec89e3d-af8d-4044-aa5d-d2fb316228a2, e23edb12-fe1a-415c-a72e-dab0452a2dc5, 0d9da72e-d0f3-4ea2-be77-91ce0f93ad93, 902ab0ff-c9eb-438e-a741-a935080c784f | `green` | Prompt Opinion -> both MCPs |

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
