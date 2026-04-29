# Prompt Opinion Rehearsal Status

Run ID: `20260428T085924Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Commit | `9f50850101618ea174156a57b3a4043866a1997f` |
| Run folder | `output/prompt-opinion-e2e/runs/20260428T085924Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Full system validation | GREEN | 41844 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1608 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 485 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 455 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 971 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2631 | `logs/06-smoke-prompt-opinion-rehearsal.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Prompt Opinion A2A-main workspace lane | YELLOW | Manual Prompt Opinion execution evidence is still required. |
| Prompt Opinion Direct-MCP fallback workspace lane | YELLOW | Manual Prompt Opinion transcript evidence is still required. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Not captured | YELLOW | no | `reports/registration-verification.json` missing |

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
| Basis | A2A-main=yellow; Direct-MCP fallback=yellow; A2A blocker=manual_browser_proof_required; fallback blocker=manual_browser_proof_required |

