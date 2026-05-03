# Prompt Opinion Rehearsal Status

Run ID: `20260503T135720Z-direct-mcp-reconciled-green`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `unknown` |
| Commit | `unknown` |
| Run folder | `output/prompt-opinion-e2e/runs/20260503T135720Z-direct-mcp-reconciled-green` |

## Provider Evidence
| Field | Value |
| --- | --- |
| Hidden-risk provider | `google` |
| Hidden-risk model | `gemma-4-31B-it` |
| Google/Gemini key present | yes |
| Google-backed proof eligible | yes |

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
| Discharge Gatekeeper MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp` |
| external A2A orchestrator | YELLOW | yes | `https://underpaid-passion-unloaded.ngrok-free.dev` |

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
| Basis | A2A-main=yellow; Direct-MCP fallback=red; A2A blocker=chat_path_not_routed; fallback blocker=chat_path_not_routed |
