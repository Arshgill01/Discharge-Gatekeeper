# Prompt Opinion Rehearsal Status

Run ID: `20260430T053710Z`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Commit | `bbed817052ce3cdb7240f61f513f830e6fc60f83` |
| Run folder | `output/prompt-opinion-e2e/runs/20260430T053710Z` |

## Local automated checks
| Check | Status | Duration (ms) | Log |
| --- | --- | --- | --- |
| Full system validation | GREEN | 32255 | `logs/01-run-full-system-validation.log` |
| Boot two MCP runtimes | GREEN | 1467 | `logs/02-start-two-mcp-local.log` |
| Boot external A2A runtime | GREEN | 1346 | `logs/03-start-a2a-local.log` |
| Two-MCP readiness check | GREEN | 405 | `logs/04-check-two-mcp-readiness.log` |
| A2A readiness check | GREEN | 457 | `logs/05-check-a2a-readiness.log` |
| Prompt Opinion rehearsal smoke | GREEN | 2131 | `logs/06-smoke-prompt-opinion-rehearsal.log` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Local automated rehearsal lane | GREEN | All automated local checks passed in this run folder. |
| Direct-MCP 3-prompt lane | YELLOW | Local rehearsal is green, but authenticated Prompt Opinion final visible transcripts were not captured in this run. |
| A2A one-turn assembled proof lane | YELLOW | Local A2A proof is green, but Prompt Opinion selection, runtime POST, downstream MCP hits, and visible assembled transcript were not captured in this run. |
| Full A2A 3-prompt exploratory lane | NOT_RUN | Not tested in this run and must not block or promote Phase 9. |

## Registration endpoint check
| Surface | Status | Current URL verified | Active URL |
| --- | --- | --- | --- |
| Not captured | YELLOW | no | `reports/registration-verification.json` missing |

## Browser/network evidence
| Artifact | Purpose |
| --- | --- |
| `reports/direct-mcp-status.json` | Direct-MCP 3-prompt lane status and missing authenticated evidence |
| `reports/a2a-one-turn-status.json` | A2A one-turn assembled proof status and missing authenticated evidence |
| `reports/a2a-route-lock-matrix.json` | A2A route-lock summary for this run |
| `reports/browser-network-summary.json` | browser capture status and required missing env vars |
| `reports/runtime-correlation-summary.json` | local/runtime/API-path correlation summary |
| `screenshots/README.md` | screenshot index for the run |

## Phase 9 call
| Call | NO-GO |
| --- | --- |
| Basis | Direct-MCP 3-prompt=yellow; A2A one-turn=yellow; full A2A 3-prompt=not_run; authenticated Prompt Opinion browser proof was not run because required credentials and fresh public endpoint env vars were absent. |
