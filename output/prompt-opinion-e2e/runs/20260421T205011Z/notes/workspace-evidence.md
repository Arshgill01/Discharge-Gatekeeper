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

## Prompt-by-prompt evidence
| Prompt | Expected tool path | Conversation ID | Result (`green`/`yellow`/`red`) | Notes |
| --- | --- | --- | --- | --- |
| Prompt 1: `Is this patient safe to discharge today?` | `assess_discharge_readiness` |  |  |  |
| Prompt 2: `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` |  |  |  |
| Prompt 3: `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` |  |  |  |

## A2A path evidence
- Agent-card validation result:
- A2A connection create result:
- A2A prompt execution result:
- External runtime logs:

## Dual-tool BYO path evidence
- Prompt 2 function call persisted:
- Prompt 2 tool response persisted:
- Prompt 2 assistant transcript persisted:
- Prompt 3 function call persisted:
- Prompt 3 tool response persisted:
- Prompt 3 assistant transcript persisted:

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`):
- Direct-MCP fallback lane (`green`/`yellow`/`red`):
