# Prompt Opinion Rehearsal Status

Run ID: `20260429T175607Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8.5-direct-mcp-green` |
| Commit | `2e1d8152ba3497157b9f786e31dc86a10c8e107c` |
| Run folder | `output/prompt-opinion-e2e/runs/20260429T175607Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 5290 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 2680 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 2748 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | RED | 40258 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 2624 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 2543 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 407 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 665 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2950 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 1360 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 1495 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | GREEN | 727518 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | At least one automated local check failed in this run folder. |
| Prompt Opinion A2A-main workspace lane | RED | Authenticated browser blocker: workspace_ui_unreachable. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://xexwq-38-137-53-117.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://ifyct-38-137-53-117.run.pinggy-free.link/mcp` |
| external A2A orchestrator | GREEN | yes | `https://omvpc-38-137-53-117.run.pinggy-free.link` |

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
| Basis | A2A-main=red; Direct-MCP fallback=yellow; A2A blocker=workspace_ui_unreachable; fallback blocker=runtime_hit_but_downstream_failure |

