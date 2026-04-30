# Prompt Opinion Rehearsal Status

Run ID: `20260428T085321Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8.5-direct-mcp-green` |
| Commit | `2e1d8152ba3497157b9f786e31dc86a10c8e107c` |
| Run folder | `output/prompt-opinion-e2e/runs/20260428T085321Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 5389 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 2408 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 2180 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | GREEN | 44328 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 602 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 654 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 853 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 956 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 1771 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 437 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 845 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | RED | 814913 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Prompt Opinion A2A-main workspace lane | RED | Authenticated browser blocker: runtime_hit_but_no_transcript. |
| Prompt Opinion Direct-MCP fallback workspace lane | RED | Authenticated browser blocker: chat_path_not_routed. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | RED | no | `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | RED | no | `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp` |
| external A2A orchestrator | RED | no | `https://hlzun-38-183-11-105.run.pinggy-free.link` |

## Browser/network evidence
| Artifact | Purpose |
| --- | --- |
| `reports/browser-proof-summary.json` | lane statuses, blockers, and prompt attempt summaries |
| `reports/browser-network-events.json` | sanitized browser request/response event log |
| `reports/browser-network-summary.json` | endpoint and request-shape summary |
| `reports/runtime-log-delta.json` | A2A/MCP runtime log deltas captured during browser attempts |
| `screenshots/` | authenticated workspace screenshots and prompt attempts |

## Phase 9 call
| Call | NO-GO |
| --- | --- |
| Basis | A2A-main=red; Direct-MCP fallback=red; A2A blocker=runtime_hit_but_no_transcript; fallback blocker=chat_path_not_routed |

