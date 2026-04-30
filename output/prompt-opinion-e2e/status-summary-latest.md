# Phase 8.5 Integration Status

Run ID: `phase8.5-integration-prevalidation`

## Run metadata
| Field | Value |
| --- | --- |
| Branch | `int/phase8.5-route-lock-freeze` |
| Direct-MCP source run | `output/prompt-opinion-e2e/runs/20260429T181905Z` |
| A2A one-turn source run | `output/prompt-opinion-e2e/runs/20260428T090256Z` |

## Lane status board
| Lane | Status | Reason |
| --- | --- | --- |
| Direct-MCP 3-prompt lane | YELLOW | Worker A evidence recorded runtime hits but no final visible transcript. |
| A2A one-turn proof lane | YELLOW | Worker B evidence recorded route-lock attempts but Prompt Opinion chat routing was inconsistent. |
| Full A2A 3-prompt lane | NOT_RUN | Exploratory only; not a Phase 9 blocker unless later proven green. |

## Evidence separation
| Lane | Primary artifacts |
| --- | --- |
| Direct-MCP 3-prompt lane | `runs/20260429T181905Z/reports/direct-mcp-status.json`, `runs/20260429T181905Z/reports/browser-proof-summary.json`, `runs/20260429T181905Z/screenshots/` |
| A2A one-turn proof lane | `runs/20260428T090256Z/reports/a2a-one-turn-status.json`, `runs/20260428T090256Z/reports/a2a-route-lock-matrix.json`, `runs/20260428T090256Z/reports/a2a-runtime-correlation-summary.json`, `runs/20260428T090256Z/screenshots/` |

## Phase 9 call
| Call | NO-GO |
| --- | --- |
| Basis | Neither worker run proves the required GREEN target lanes. Direct-MCP remains YELLOW and A2A one-turn remains YELLOW, so this integration cannot be promoted as a clean Phase 9 baseline without further fixes and a decisive authenticated run. |
