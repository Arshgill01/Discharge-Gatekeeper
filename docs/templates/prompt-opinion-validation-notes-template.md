# Prompt Opinion Validation Notes Template

## Run metadata
- Run ID:
- Date (UTC):
- Branch:
- Commit:
- Operator:

## Automated check status board
| Check | Command | Status (`green`/`yellow`/`red`) | Duration (ms) | Evidence log |
| --- | --- | --- | --- | --- |
| Full system validation | `./po-community-mcp-main/scripts/run-full-system-validation.sh` |  |  |  |
| Two-MCP readiness check | `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh` |  |  |  |
| A2A readiness check | `./po-community-mcp-main/scripts/check-a2a-readiness.sh` |  |  |  |
| Prompt Opinion rehearsal smoke | `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal` |  |  |  |

## Local timing summary
- Prompt 1:
- Prompt 2:
- Prompt 3:
- Total run time:

## Local automated verdict
- Overall local lane status (`green`/`yellow`/`red`):
- Blocking failures:

## Manual workspace lane status
| Lane | Status (`green`/`yellow`/`red`) | Evidence |
| --- | --- | --- |
| Prompt Opinion A2A chat execution |  |  |
| Dual-tool BYO Prompt 2 transcript persistence |  |  |
| Dual-tool BYO Prompt 3 transcript persistence |  |  |

## Green/yellow/red rationale
- Green: the current run folder proves the lane end-to-end and the lane is eligible to be primary.
- Yellow: proof is partial or missing a required artifact; the lane cannot be primary.
- Red: a blocking defect, failed required validation, or missing required evidence makes the lane unusable.

## Open risks
1.
