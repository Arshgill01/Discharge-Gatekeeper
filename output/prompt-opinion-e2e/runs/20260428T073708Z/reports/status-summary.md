# Prompt Opinion Rehearsal Status

Run ID: `20260428T073708Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `master` |
| Commit | `d08f2c78b831327875ce9ca5a262a164cd76c614` |
| Run folder | `output/prompt-opinion-e2e/runs/20260428T073708Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 5077 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 2533 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 2173 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | RED | 20633 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1679 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 1434 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 486 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 1079 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2400 | `logs/06-smoke-prompt-opinion-rehearsal.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | RED | At least one automated local check failed in this run folder. |
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

