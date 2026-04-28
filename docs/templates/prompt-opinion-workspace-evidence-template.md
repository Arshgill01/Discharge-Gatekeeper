# Prompt Opinion Workspace Evidence Template

## Workspace metadata
- Org:
- Session date (UTC):
- Browser:
- Prompt Opinion environment URL:

## Active public endpoints
- `Discharge Gatekeeper MCP`:
- `Clinical Intelligence MCP`:
- `external A2A orchestrator`:

## Registration status
| Surface | Existing entry reused | Current URL verified | Connection or discovery result | Notes |
| --- | --- | --- | --- | --- |
| `Discharge Gatekeeper MCP` |  |  |  |  |
| `Clinical Intelligence MCP` |  |  |  |  |
| `external A2A orchestrator` |  |  |  |  |

## Screenshot checklist
| Screenshot | Captured | File |
| --- | --- | --- |
| Login page |  | `screenshots/01-po-login-page.png` |
| Workspace launchpad |  | `screenshots/02-po-workspace-launchpad.png` |
| MCP registrations |  | `screenshots/03-po-mcp-servers-registered.png` |
| A2A connection status |  | `screenshots/04-po-a2a-connection-status.png` |
| BYO agent config |  | `screenshots/05-po-byo-agent-config.png` |
| Prompt 1 result |  | `screenshots/06-po-prompt1-result.png` |
| Prompt 2 result or stall |  | `screenshots/07-po-prompt2-result-or-stall.png` |
| Prompt 3 result or stall |  | `screenshots/08-po-prompt3-result-or-stall.png` |

Generated browser-proof runs may also include `screenshots/a2a-p*-result.png`,
`screenshots/fallback-p*-result.png`, and matching `.txt` DOM snapshots.

## Prompt-by-prompt evidence
| Attempt ID | Lane | Surface or agent | Prompt | Expected tool path | Conversation ID | Request or task IDs | Result (`green`/`yellow`/`red`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A2A-P1-01 | `A2A-main` |  | `Is this patient safe to discharge today?` | `external A2A orchestrator -> both MCPs` |  |  |  |  |
| A2A-P2-01 | `A2A-main` |  | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `external A2A orchestrator -> both MCPs` |  |  |  |  |
| A2A-P3-01 | `A2A-main` |  | `What exactly must happen before discharge, and prepare the transition package.` | `external A2A orchestrator -> both MCPs` |  |  |  |  |
| FALLBACK-P1-01 | `Direct-MCP fallback` |  | `Is this patient safe to discharge today?` | `assess_discharge_readiness` |  |  |  |  |
| FALLBACK-P2-01 | `Direct-MCP fallback` |  | `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` |  |  |  |  |
| FALLBACK-P3-01 | `Direct-MCP fallback` |  | `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` |  |  |  |  |

## A2A path evidence
- Agent-card validation result:
- A2A connection create result:
- A2A prompt execution result:
- External runtime logs:
- Matching `request_id` / `task_id` evidence:
- Blocker classification if not proven:
- Browser network summary:
- Runtime log delta:

## Dual-tool BYO path evidence
- Prompt 2 function call persisted:
- Prompt 2 tool response persisted:
- Prompt 2 assistant transcript persisted:
- Prompt 3 function call persisted:
- Prompt 3 tool response persisted:
- Prompt 3 assistant transcript persisted:
- Prompt-stream/browser request evidence:
- Runtime MCP log evidence:

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`):
- Direct-MCP fallback lane (`green`/`yellow`/`red`):
- Preferred live lane from this run folder:

Status definitions:
- `green`: the current run folder proves the lane end-to-end and the lane is eligible to be primary.
- `yellow`: proof is partial or missing a required artifact; the lane cannot be primary.
- `red`: a blocking defect, failed required validation, or missing required evidence makes the lane unusable.
