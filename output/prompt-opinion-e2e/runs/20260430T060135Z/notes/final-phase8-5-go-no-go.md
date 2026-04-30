# Phase 8.5 Final Go/No-Go Evidence

Run folder: `output/prompt-opinion-e2e/runs/20260430T060135Z`

Supplemental retry: `output/prompt-opinion-e2e/runs/20260430T061830Z-direct-retry`

## Status board

| Lane | Status | Evidence | Classification |
| --- | --- | --- | --- |
| Registration and public routing | GREEN | `reports/registration-verification.json`; public ngrok endpoints verified for DGK, CI, and A2A | Prompt Opinion can reach all registered surfaces |
| Local validation/rehearsal | GREEN | `reports/status-summary.md` command table | Local release/rehearsal prerequisites passed |
| Direct-MCP Prompt 1 | YELLOW | `reports/direct-mcp-status.json`; `screenshots/fallback-p1-01-result.txt` | Returns structured baseline `ready`; does not produce final reconciled `not_ready` |
| Direct-MCP Prompt 2 | GREEN | `reports/direct-mcp-status.json`; `screenshots/fallback-p2-01-result.txt` | Hidden-risk contradiction and citations visible |
| Direct-MCP Prompt 3 | GREEN with latency risk | `reports/direct-mcp-status.json`; `screenshots/fallback-p3-01-result.txt`; supplemental retry | Transition package visible; full run showed a Prompt Opinion timeout after partial output, direct retry completed without the timeout banner |
| Direct-MCP 3-prompt lane | YELLOW | Prompt 1 remains yellow | Not primary-demo green yet |
| A2A route/transport proof | GREEN for variants B/C | `reports/a2a-route-lock-matrix.json`; `reports/runtime-log-delta.json` | Prompt Opinion selected external A2A, runtime returned 2xx, both MCPs were invoked, assembled answer was visible |
| A2A clinical assembled proof | YELLOW | `reports/a2a-one-turn-status.json`; `screenshots/a2a-vb-01-result.txt` | Runtime accepted the turn, but the answer was clinically downgraded because hidden-risk review had no narrative sources |
| Full A2A 3-prompt lane | NOT RUN as primary | route-lock matrix only | Does not block Phase 9 by itself, but target lanes are not green |

## Root cause

The current blocker is no longer Prompt Opinion auth, registration, ngrok routing, or basic external A2A reachability.

Two repo-side defects remain:

1. Prompt-only A2A requests from Prompt Opinion do not carry `patient_context`, and the external A2A runtime does not hydrate the canonical trap-patient narrative bundle before calling Clinical Intelligence. The runtime therefore reports `hidden_risk_run_status=unavailable`/insufficient context and returns a downgraded `ready_with_caveats` answer instead of the required `not_ready` contradiction result.
2. Direct-MCP Prompt 1 still behaves as a structured-baseline call. It shows `ready` from Discharge Gatekeeper, but the Phase 8.5 green definition requires a final visible transcript that also reconciles Clinical Intelligence hidden-risk evidence into `not_ready`.

## Latency finding

The full run produced a visible Prompt Opinion error on Prompt 3: `The LLM took too long to respond and the operation was cancelled`.

The supplemental direct-only retry, `20260430T061830Z-direct-retry`, did not reproduce that timeout banner for Prompt 3 after extending the harness wait. This points to variable Prompt Opinion/model latency plus very large conversation context as the operational risk. Prompt 3 reached about 480k displayed input tokens in the retry. The durable fix is to reduce context/tool-response size and cap transition-package verbosity, not only to increase harness timeouts.

## Phase 9 call

NO-GO.

Reason: Direct-MCP 3-prompt is not fully green because Prompt 1 remains yellow, and A2A one-turn clinical assembled proof is not green because prompt-only A2A calls lack hydrated narrative evidence. Route transport is proven for A2A variants B/C, but clinical correctness is not.
