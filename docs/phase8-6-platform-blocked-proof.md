# Phase 8.6 Prompt Opinion Platform-Blocked Proof

Date: 2026-05-07

## Status

Runtime/protocol is green. Prompt Opinion browser proof remains blocked by a Prompt Opinion-side timeout/cancelled banner after it receives and renders a valid compact completed A2A task.

Do not classify the A2A browser lane as green because the browser transcript includes:

```text
The LLM took too long to respond and the operation was cancelled
```

## Task-rendering recovery addendum

Evidence run: `output/prompt-opinion-e2e/runs/20260507T-po-task-rendering-recovery`

The remaining failure is not the immediate A2A task payload shape or size. Wire capture for `wire/0010-1778168819333-a2a-POST-message_send_v1_message_send.json` proves Prompt Opinion POSTed to `/message:send/v1/message:send` and received HTTP 200 with a `5356` byte `application/json; charset=utf-8` response. The response includes JSON-RPC 2.0, `result.task`, a top-level `task` alias, `TASK_STATE_COMPLETED`, `status.message.parts` text, artifact text, `not_ready`, both required note anchors, and `both_mcps_hit=true`.

The browser transcript rendered the compact task payload under `STATUS_MESSAGE` and `ARTIFACT_MESSAGES`; see `screenshots/a2a-vc-01-result.txt`. Browser network evidence still records `The LLM took too long to respond and the operation was cancelled` after the `SendA2AMessage` function-call path; see `reports/browser-network-events.json`. This classifies the remaining blocker as Prompt Opinion platform/post-tool LLM synthesis behavior after a valid compact completed A2A task.

## Public Endpoint Readiness

Evidence run: `output/prompt-opinion-e2e/runs/20260507T-final-a2a-po-wire-proof-reroute`

| Surface | Status | Evidence |
| --- | --- | --- |
| Public DGK `/dgk/readyz` | 200 | `reports/public-dgk-readyz.json` |
| Public CI `/ci/readyz` | 200 | `reports/public-ci-readyz.json` |
| Public A2A `/readyz` | 200 | `reports/public-a2a-readyz.json` |
| Public A2A `/.well-known/agent-card.json` | 200 | `reports/public-a2a-agent-card.json` |
| Public A2A `/tasks` | 200 | `reports/public-a2a-tasks.json` |

## A2A v1 Compatibility

The runtime now advertises Prompt Opinion-compatible A2A v1 routing:

- `supportedInterfaces[].protocolVersion`: `1.0`
- preferred transport: `HTTP+JSON`
- preferred HTTP+JSON interface URI: `https://underpaid-passion-unloaded.ngrok-free.dev/message:send`
- no stale top-level agent-card `protocolVersion: 0.2.6`
- message response content type: `application/json; charset=utf-8` for HTTP+JSON message endpoints
- message response shape includes both `$.result.task` and top-level `$.task`

The HTTP+JSON interface URL intentionally ends in `/message:send` because Prompt Opinion did not route to the external runtime when the interface URI was advertised as the public base URL. The runtime still accepts root HTTP+JSON, `/message:send`, `/v1/message:send`, `/message:send/v1/message:send`, and JSON-RPC `/rpc`.

Endpoint matrix evidence:

- `output/prompt-opinion-e2e/runs/20260507T-final-po-surface-recovery/reports/a2a-endpoint-matrix.md`

## Public Protocol Response Shape

Evidence:

- `output/prompt-opinion-e2e/runs/20260507T-final-po-surface-recovery/reports/public-a2a-response-current-compact.json`
- `output/prompt-opinion-e2e/runs/20260507T-final-po-surface-recovery/reports/public-a2a-response-current-compact.json.shape-summary.json`

Measured result:

- response bytes: `5738`
- `jsonrpc`: `2.0`
- has `$.result.task`: `true`
- has top-level `$.task`: `true`
- task state: `TASK_STATE_COMPLETED`
- final verdict: `not_ready`
- hidden-risk result: `hidden_risk_present`
- both MCPs hit: `true`
- diagnostics omitted from immediate message response: `true`

## Prompt Opinion Browser Evidence

Evidence run:

- `output/prompt-opinion-e2e/runs/20260507T-final-a2a-po-wire-proof-reroute`

Prompt Opinion selected external A2A:

- screenshot: `screenshots/a2a-consult-selected.png`
- text: `screenshots/a2a-consult-selected.txt`

Prompt Opinion POSTed to runtime:

- raw wire file: `wire/0003-1778163206186-a2a-POST-message_send_v1_message_send.json`
- summary: `reports/po-wire-post-summary.json`

Observed wire response:

- endpoint: `/message:send/v1/message:send`
- HTTP status: `200`
- response bytes: `5788`
- content type: `application/a2a+json; charset=utf-8`
- has `$.result.task`: `true`
- has top-level `$.task`: `true`
- task state: `TASK_STATE_COMPLETED`
- final verdict: `not_ready`
- hidden-risk result: `hidden_risk_present`
- both MCPs hit: `true`
- evidence anchors present: `true`

Prompt Opinion rendered the task content:

- screenshot: `screenshots/a2a-vc-01-result.png`
- text: `screenshots/a2a-vc-01-result.txt`

Visible rendered payload includes:

- `STATUS_MESSAGE: Final verdict: not_ready`
- `Structured baseline: ready`
- `Hidden-risk result: hidden_risk_present`
- `Nursing Note 2026-04-18 20:40`
- `Case Management Addendum 2026-04-18 20:55`

Then Prompt Opinion displayed:

```text
Error
The LLM took too long to respond and the operation was cancelled
```

## Root Cause Call

Repo-side causes were fixed or ruled out:

- Payload size/rendering: fixed. The PO-facing task is under 6 KB and clinical text is in simple text parts.
- Response shape: fixed. The response includes `$.result.task` and a top-level `task` alias.
- Content type: fixed. A2A message responses use `application/a2a+json`.
- Endpoint mismatch: fixed. The card advertises Prompt Opinion-routable `/message:send` while retaining all compatibility endpoints.
- Both MCP hits: proven by `reports/po-wire-post-summary.json`.

Remaining cause:

Prompt Opinion platform/rendering timeout after receiving and rendering a valid compact completed A2A task. This is platform-blocked, not a remaining repo-side runtime bug.

## Run Notes

- Detailed analysis: `output/prompt-opinion-e2e/runs/20260507T-final-a2a-po-wire-proof-reroute/notes/a2a-wire-rendering-analysis.md`
- Do not run combined proof from this state because A2A browser proof is not green due to the timeout/cancelled banner.
