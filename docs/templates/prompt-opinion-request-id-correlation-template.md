# Prompt Opinion Request-ID Correlation Template

Use this file only for request/task correlation evidence.
If Prompt Opinion does not hit the external runtime, record the exact evidence that proves the absence of a runtime hit instead of leaving this blank.

## Correlation rules
- `A2A-main` can be `green` only when the same workspace attempt shows:
  - a Prompt Opinion execution attempt
  - an external A2A runtime request or task
  - matching `request_id` or `task_id` evidence in runtime output or logs
  - downstream MCP calls carrying the propagated headers
- If the workspace attempt never hits the external runtime, mark the blocker precisely:
  - `registration_only`
  - `chat_path_not_routed`
  - `runtime_hit_but_no_transcript`
  - `runtime_hit_but_downstream_failure`

## Local automated baseline
Reference the machine-generated report at `reports/request-id-correlation.md` before filling the workspace rows.

## Workspace A2A correlation
| Attempt ID | Prompt | Prompt Opinion conversation ID | Browser or host request clue | A2A `request_id` | A2A `task_id` | Downstream header evidence | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A2A-P1-01 | `Is this patient safe to discharge today?` |  |  |  |  |  |  |  |
| A2A-P2-01 | `What hidden risk changed that answer? Show me the contradiction and the evidence.` |  |  |  |  |  |  |  |
| A2A-P3-01 | `What exactly must happen before discharge, and prepare the transition package.` |  |  |  |  |  |  |  |

## Direct-MCP fallback correlation
Use this section to record function-call IDs, tool-response IDs, or transcript IDs when the fallback lane is the primary proof path.

| Attempt ID | Prompt | Conversation ID | Tool path | Function call persisted | Tool response persisted | Final assistant transcript persisted | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FALLBACK-P1-01 | `Is this patient safe to discharge today?` |  | `assess_discharge_readiness` |  |  |  |  |  |
| FALLBACK-P2-01 | `What hidden risk changed that answer? Show me the contradiction and the evidence.` |  | `surface_hidden_risks` |  |  |  |  |  |
| FALLBACK-P3-01 | `What exactly must happen before discharge, and prepare the transition package.` |  | `synthesize_transition_narrative` |  |  |  |  |  |

## Blocker classification
- Current A2A blocker:
- Current fallback blocker:
- Exact evidence files:
