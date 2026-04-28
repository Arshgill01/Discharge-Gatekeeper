# Prompt Opinion Rehearsal Status

Run ID: `20260425T193345Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8-browser-proof-and-go-no-go` |
| Commit | `397fd1990537d8ee664724431ff6d5eb6921ca01` |
| Run folder | `output/prompt-opinion-e2e/runs/20260425T193345Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 19682 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 10745 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 12297 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | GREEN | 183531 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 6716 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 4449 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 1544 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 2871 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 10403 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 7112 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 7774 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | GREEN | 322642 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Prompt Opinion A2A-main workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://jzsxi-38-183-11-105.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://szqzk-38-183-11-105.run.pinggy-free.link/mcp` |
| external A2A orchestrator | GREEN | yes | `https://hlzun-38-183-11-105.run.pinggy-free.link` |

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
| Basis | A2A-main=yellow; Direct-MCP fallback=yellow; A2A blocker=runtime_hit_but_downstream_failure; fallback blocker=runtime_hit_but_downstream_failure |
