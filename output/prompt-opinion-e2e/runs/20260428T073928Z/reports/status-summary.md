# Prompt Opinion Rehearsal Status

Run ID: `20260428T073928Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `master` |
| Commit | `d08f2c78b831327875ce9ca5a262a164cd76c614` |
| Run folder | `output/prompt-opinion-e2e/runs/20260428T073928Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Install dependencies (Discharge Gatekeeper MCP) | GREEN | 3945 | `logs/00-npm-ci-typescript.log` |
| Install dependencies (Clinical Intelligence MCP) | GREEN | 2259 | `logs/00-npm-ci-clinical-intelligence.log` |
| Install dependencies (external A2A orchestrator) | GREEN | 2177 | `logs/00-npm-ci-external-a2a.log` |
| Full system validation | GREEN | 30714 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1457 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 1360 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 442 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 447 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2186 | `logs/06-smoke-prompt-opinion-rehearsal.log` |

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

