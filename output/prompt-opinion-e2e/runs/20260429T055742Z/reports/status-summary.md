# Prompt Opinion Rehearsal Status

Run ID: `20260429T055742Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Commit | `9f50850101618ea174156a57b3a4043866a1997f` |
| Run folder | `output/prompt-opinion-e2e/runs/20260429T055742Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Full system validation | RED | 31774 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1392 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 1346 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 348 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 449 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2143 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 1319 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 1359 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | RED | 17034 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | One or more automated local checks failed. |
| Prompt Opinion A2A-main workspace lane | RED | Blocker: workspace_ui_unreachable. |
| Prompt Opinion Direct-MCP fallback workspace lane | RED | Blocker: workspace_ui_unreachable. |

## Registration Endpoint Check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Not captured | YELLOW | no | `reports/registration-verification.json` missing |

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
| Basis | A2A-main=red; Direct-MCP fallback=red; A2A blocker=workspace_ui_unreachable; fallback blocker=workspace_ui_unreachable |
