# Prompt Opinion Rehearsal Status

Run ID: `20260425T192534Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `feat/phase8-browser-proof-and-go-no-go` |
| Commit | `397fd1990537d8ee664724431ff6d5eb6921ca01` |
| Run folder | `output/prompt-opinion-e2e/runs/20260425T192534Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 6100 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 2795 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 3091 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | GREEN | 52215 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 2913 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 2719 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 1167 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 1221 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 6358 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 2984 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 2815 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | GREEN | 306506 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Prompt Opinion A2A-main workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://zxnzx-38-183-11-105.run.pinggy-free.link/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://rvyfm-38-183-11-105.run.pinggy-free.link/mcp` |
| external A2A orchestrator | GREEN | yes | `https://fpeim-38-183-11-105.run.pinggy-free.link` |

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

