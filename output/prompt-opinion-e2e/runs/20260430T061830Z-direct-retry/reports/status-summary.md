# Prompt Opinion Rehearsal Status

Run ID: `20260430T061830Z-direct-retry`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Commit | `1d45fcf9eb1304794d93a134ab5cbd50c0f505de` |
| Run folder | `output/prompt-opinion-e2e/runs/20260430T061830Z-direct-retry` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Browser proof only | YELLOW |  | `reports/browser-proof-summary.json` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | One or more automated local checks failed. |
| Prompt Opinion A2A-main workspace lane | RED | Blocker: workspace_ui_unreachable. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Blocker: runtime_hit_but_downstream_failure. |

## Registration Endpoint Check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp` |
| external A2A orchestrator | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev` |

## Browser/network evidence
| Artifact | Purpose |
| --- | --- |
| `reports/direct-mcp-status.json` | Direct-MCP lane status, blocker, and per-prompt settle results |
| `reports/a2a-route-lock-matrix.json` | one-turn A2A experiment matrix with best variant and skipped Variant E rationale |
| `reports/a2a-runtime-correlation-summary.json` | request/task/message correlation summary for A2A route-lock attempts |
| `reports/a2a-downstream-mcp-hit-summary.json` | downstream MCP hit summary for each A2A route-lock variant |
| `reports/a2a-one-turn-status.json` | final A2A one-turn assembled proof status board |
| `reports/browser-network-events.json` | sanitized browser request/response event log |
| `reports/browser-network-summary.json` | endpoint and request-shape summary |
| `reports/runtime-log-delta.json` | A2A/MCP runtime log deltas captured during browser attempts |
| `screenshots/` | authenticated workspace screenshots and prompt attempts |

## Phase 9 call
| Call | NO-GO |
| --- | --- |
| Basis | A2A-main=red; Direct-MCP fallback=yellow; A2A blocker=workspace_ui_unreachable; fallback blocker=runtime_hit_but_downstream_failure |
