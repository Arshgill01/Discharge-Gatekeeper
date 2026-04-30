# Prompt Opinion Workspace Evidence

## Workspace metadata
- Org: captured from authenticated browser if visible in screenshots
- Session date (UTC): `2026-04-29T18:27:09.458Z`
- Browser: Playwright Chromium, headless=false
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`
- Workspace ID: `019da8ef-cb09-71b0-9d7e-4e11591d55db`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `https://lamud-38-137-53-117.run.pinggy-free.link/mcp`
- `Clinical Intelligence MCP`: `https://bdych-38-137-53-117.run.pinggy-free.link/mcp`
- `external A2A orchestrator`: `https://jzglm-38-137-53-117.run.pinggy-free.link`

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` | yes | yes | `green` | before: `https://xexwq-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://lamud-38-137-53-117.run.pinggy-free.link/mcp`; check: `200` |
| `Clinical Intelligence MCP` | yes | yes | `green` | before: `https://ifyct-38-137-53-117.run.pinggy-free.link/mcp`; after: `https://bdych-38-137-53-117.run.pinggy-free.link/mcp`; check: `200` |
| `external A2A orchestrator` | yes | yes | `green` | before: `https://omvpc-38-137-53-117.run.pinggy-free.link`; after: `https://jzglm-38-137-53-117.run.pinggy-free.link`; check: `200` |
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
| FALLBACK-P1-01 | `Direct-MCP fallback` | Browser proof harness | `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `https://app.promptopinion.ai/workspaces/019da8ef-cb09-71b0-9d7e-4e11591d55db/conversations/019dda78-95a2-7e9c-82ee-40ea9da5d057` | a17dadb2-9dc6-40f3-aa47-e006fc804675, 8360ee9d-54a9-421f-ab1e-0f680ce22006, a691f2fd-2d4d-4000-8e73-3805c370dbd4, 69c1afb2-7c1e-4406-b36f-fbac27be2b54, 80160b85-646a-431d-bdd1-dad298d056cb, 30b6ef8c-226c-4662-a8c2-3e931abe652a, dd0aaf08-8455-44e1-ae1f-f2a8938f5570, 8baef688-e4b5-49e0-bb61-0a3f159e2f69, b74cb693-f29b-4677-acc1-c11fe3853a3e, fb89529f-4b85-4530-ba6b-9c23c0bce19a, 2cad4914-b894-4db7-ada1-e05a97f1061c, f4ac32b8-3b70-4303-a810-e03b39d1bd95, 33f9f259-221d-4808-acbf-ce6654c82532 | `yellow` | Prompt Opinion -> both MCPs; settle=`timeout`; anchors=fail |

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

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `red`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `yellow`
- Preferred live lane from this run folder: none
