# Prompt Opinion Rehearsal Status

Run ID: `20260428T090256Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8.5-a2a-one-turn-proof` |
| Commit | `250d290bc625e981c7fa9140cd502de7af6a47dd` |
| Run folder | `output/prompt-opinion-e2e/runs/20260428T090256Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Browser proof only | YELLOW |  | `reports/browser-proof-summary.json` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | One or more automated local checks failed. |
| Prompt Opinion A2A-main workspace lane | YELLOW | Blocker: chat_path_not_routed. |
| Prompt Opinion Direct-MCP fallback workspace lane | RED | Blocker: chat_path_not_routed. |

## Registration Endpoint Check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | RED | no | `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | RED | no | `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp` |
| external A2A orchestrator | YELLOW | yes | `https://kind-ears-talk.loca.lt` |

## Browser/network evidence
| Artifact | Purpose |
| --- | --- |
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
| Basis | A2A-main=yellow; Direct-MCP fallback=red; A2A blocker=chat_path_not_routed; fallback blocker=chat_path_not_routed |
