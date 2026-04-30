# Prompt Opinion Rehearsal Status

Run ID: `20260430T060135Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Commit | `1d45fcf9eb1304794d93a134ab5cbd50c0f505de` |
| Run folder | `output/prompt-opinion-e2e/runs/20260430T060135Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Full system validation | GREEN | 32661 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1485 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 1364 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 467 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 463 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2370 | `logs/06-smoke-prompt-opinion-rehearsal.log` |
| Boot two MCP runtimes for browser proof | GREEN | 1379 | `logs/07-start-two-mcp-browser-proof.log` |
| Boot external A2A runtime for browser proof | GREEN | 1361 | `logs/08-start-a2a-browser-proof.log` |
| Authenticated Prompt Opinion browser proof | GREEN | 559472 | `logs/09-prompt-opinion-browser-proof.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Prompt Opinion A2A-main workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Authenticated browser blocker: runtime_hit_but_downstream_failure. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Discharge Gatekeeper MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/mcp` |
| Clinical Intelligence MCP | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev/ci/mcp` |
| external A2A orchestrator | GREEN | yes | `https://underpaid-passion-unloaded.ngrok-free.dev` |

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
