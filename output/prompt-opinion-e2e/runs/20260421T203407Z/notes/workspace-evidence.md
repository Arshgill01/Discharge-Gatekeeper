# Prompt Opinion Workspace Evidence Template

## Workspace metadata
- Org: `Arshgill's org` (from prior authenticated pass)
- Session date (UTC): `pending fresh manual session for run 20260421T203407Z`
- Browser: `pending`
- Prompt Opinion environment URL: `https://app.promptopinion.ai/`

## Active public endpoints
- `Discharge Gatekeeper MCP`: `pending new tunnel for this run`
- `Clinical Intelligence MCP`: `pending new tunnel for this run`
- `external A2A orchestrator`: `pending new tunnel for this run`

## Screenshot checklist
| Screenshot | Captured | File |
| --- | --- | --- |
| Login page | `no` | `screenshots/01-po-login-page.png` |
| Workspace launchpad | `no` | `screenshots/02-po-workspace-launchpad.png` |
| MCP registrations | `no` | `screenshots/03-po-mcp-servers-registered.png` |
| A2A connection status | `no` | `screenshots/04-po-a2a-connection-status.png` |
| BYO agent config | `no` | `screenshots/05-po-byo-agent-config.png` |
| Prompt 1 result | `no` | `screenshots/06-po-prompt1-result.png` |
| Prompt 2 result or stall | `no` | `screenshots/07-po-prompt2-result-or-stall.png` |
| Prompt 3 result or stall | `no` | `screenshots/08-po-prompt3-result-or-stall.png` |

## Prompt-by-prompt evidence
| Prompt | Expected tool path | Conversation ID | Result (`green`/`yellow`/`red`) | Notes |
| --- | --- | --- | --- | --- |
| Prompt 1: `Is this patient safe to discharge today?` | `assess_discharge_readiness` | `019daf51-4e61-7c6f-a0bc-8fa9ef412ed6` | `green` | Proven in prior authenticated run; not re-captured in this local-only run. |
| Prompt 2: `What hidden risk changed that answer? Show me the contradiction and the evidence.` | `surface_hidden_risks` | `019db143-9db4-72a9-8153-5226c92ba83e` (single-tool CI) | `red` | Dual-tool BYO transcript persistence remains blocked. |
| Prompt 3: `What exactly must happen before discharge, and prepare the transition package.` | `synthesize_transition_narrative` | `019db137-2e45-75be-93db-9999af708be2` (tool-explicit single-tool CI) | `red` | Dual-tool BYO canonical Prompt 3 remains unproven. |

## A2A path evidence
- Agent-card validation result: `pass` (`200`) in prior authenticated pass.
- A2A connection create result: `pass` (`201`) in prior authenticated pass.
- A2A prompt execution result: `yellow` (chat path execution still unproven).
- External runtime logs: see `output/prompt-opinion-e2e/final-transcript-debug-notes.md`.

## Dual-tool BYO path evidence
- Prompt 2 function call persisted: `yes`
- Prompt 2 tool response persisted: `yes`
- Prompt 2 assistant transcript persisted: `no`
- Prompt 3 function call persisted: `partial/unstable`
- Prompt 3 tool response persisted: `not consistently`
- Prompt 3 assistant transcript persisted: `no`

## Final lane statuses
- A2A-main lane (`green`/`yellow`/`red`): `yellow`
- Direct-MCP fallback lane (`green`/`yellow`/`red`): `red` for one-agent dual-tool BYO path (`yellow` only with split-agent workaround)
