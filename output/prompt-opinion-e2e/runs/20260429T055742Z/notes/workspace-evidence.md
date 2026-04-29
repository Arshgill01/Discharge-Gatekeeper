# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-29T06:00:41.638Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `not discovered`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://frtmq-115-244-89-220.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://ajvuq-115-244-89-220.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://cljcy-115-244-89-220.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | see screenshot | see screenshot/text | browser-captured | `03-po-mcp-servers-registered.png` |
| `Clinical Intelligence MCP` | see screenshot | see screenshot/text | browser-captured | `03-po-mcp-servers-registered.png` |
| `external A2A orchestrator` | see screenshot | see screenshot/text | browser-captured | `04-po-a2a-connection-status.png` |
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

## A2A path evidence
- A2A prompt execution result: `red`
- Blocker classification if not proven: `workspace_ui_unreachable`
- Route-lock matrix: `reports/a2a-route-lock-matrix.json`
- External runtime logs: `reports/runtime-log-delta.json`
- Matching request/task evidence: `reports/a2a-runtime-correlation-summary.json`, `notes/request-id-correlation.md`
- Downstream MCP hit summary: `reports/a2a-downstream-mcp-hit-summary.json`

## Dual-tool BYO path evidence

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `red`
- Preferred live lane from this run folder: none
