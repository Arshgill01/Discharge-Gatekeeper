# Prompt Opinion Rehearsal Status

Run ID: `20260429T181905Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8.5-direct-mcp-green` |
| Commit | `2e1d8152ba3497157b9f786e31dc86a10c8e107c` |
| Run folder | `output/prompt-opinion-e2e/runs/20260429T181905Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Browser proof only | YELLOW |  | `reports/browser-proof-summary.json` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | One or more automated local checks failed. |
| Prompt Opinion A2A-main workspace lane | RED | Blocker: workspace_ui_unreachable. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Blocker: runtime_hit_but_no_transcript. |

## Registration Endpoint Check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://lamud-38-137-53-117.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://bdych-38-137-53-117.run.pinggy-free.link/mcp` |
| external A2A orchestrator | GREEN | yes | `https://jzglm-38-137-53-117.run.pinggy-free.link` |

## Browser/network evidence
| Artifact | Purpose |
| --- | --- |
| `reports/direct-mcp-status.json` | Direct-MCP lane status, blocker, and per-prompt settle results |
| `reports/browser-network-events.json` | sanitized browser request/response event log |
| `reports/browser-network-summary.json` | endpoint and request-shape summary |
| `reports/runtime-log-delta.json` | A2A/MCP runtime log deltas captured during browser attempts |
| `screenshots/` | authenticated workspace screenshots and prompt attempts |

## Phase 9 call
| Call | NO-GO |
| --- | --- |
| Basis | A2A-main=red; Direct-MCP fallback=yellow; A2A blocker=workspace_ui_unreachable; fallback blocker=runtime_hit_but_no_transcript |
