# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-29T06:18:47.210Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://gjfpa-115-244-89-220.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://hjrox-115-244-89-220.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://whswj-115-244-89-220.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | no | `red` | before: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `Clinical Intelligence MCP` | yes | no | `red` | before: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; after: `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp`; check: `not-run` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://kind-ears-talk.loca.lt`; after: `https://whswj-115-244-89-220.run.pinggy-free.link`; check: `200` |
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
| A2A-P1-01 | `A2A-main` | Browser proof harness | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd7d4-c66e-71ff-b154-d06668bd8ba2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |
| A2A-P2-01 | `A2A-main` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd7d4-c66e-71ff-b154-d06668bd8ba2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |
| A2A-P3-01 | `A2A-main` | Browser proof harness | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd7d4-c66e-71ff-b154-d06668bd8ba2` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd7dd-8c4b-77f2-828d-f079c6787315` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |
| FALLBACK-P2-01 | `Direct-MCP fallback` | Browser proof harness | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dd7dd-8c4b-77f2-828d-f079c6787315` | none | `red` | Prompt Opinion prompt-stream without observed external runtime hit; settle=`timeout`; anchors=fail |

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `chat_path_not_routed`
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
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `red`
- Preferred live lane from this run folder: none
