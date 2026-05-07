# Phase 8.6 final live proof status

- Branch: `int/phase8.6-real-green`
- Commit at run start: `42ddcc54799d01a33ccf36dbd374b362e07f3b3a`
- Generated at: `2026-05-07T11:09Z`

## Local service readiness

PASS.

- `http://127.0.0.1:5055/readyz`: HTTP 200
- `http://127.0.0.1:5056/readyz`: HTTP 200
- `http://127.0.0.1:5057/readyz`: HTTP 200
- `http://127.0.0.1:5057/.well-known/agent-card.json`: HTTP 200
- `http://127.0.0.1:5057/tasks`: HTTP 200

Services were kept alive for the proof through an open launcher session because this execution environment reaped background child processes when the launcher command exited.

## Public tunnel readiness

PASS after starting a local path proxy on `127.0.0.1:5080` and exposing that port with ngrok reserved host `https://underpaid-passion-unloaded.ngrok-free.dev`.

- `https://underpaid-passion-unloaded.ngrok-free.dev/dgk/readyz`: HTTP 200
- `https://underpaid-passion-unloaded.ngrok-free.dev/ci/readyz`: HTTP 200
- `https://underpaid-passion-unloaded.ngrok-free.dev/readyz`: HTTP 200
- `https://underpaid-passion-unloaded.ngrok-free.dev/.well-known/agent-card.json`: HTTP 200
- `https://underpaid-passion-unloaded.ngrok-free.dev/tasks`: HTTP 200

Routing used:

- `/dgk/*` -> `http://127.0.0.1:5055/*`
- `/ci/*` -> `http://127.0.0.1:5056/*`
- `/*` -> `http://127.0.0.1:5057/*`

## Public protocol POST

PASS.

Manual POST to `https://underpaid-passion-unloaded.ngrok-free.dev/message:send/v1/message:send` returned JSON-RPC `2.0` with `result.task`, `TASK_STATE_COMPLETED`, final verdict `not_ready`, structured baseline `ready`, hidden-risk result `hidden_risk_present`, and the required `Nursing Note 2026-04-18 20:40` and `Case Management Addendum 2026-04-18 20:55` evidence anchors.

Manual response file: `/tmp/public-a2a-message-send.json`

## A2A browser proof status

YELLOW / platform-blocked after runtime POST.

Run folder: `output/prompt-opinion-e2e/runs/20260507T-real-a2a-browser-proof`

Evidence:

- Public preflight passed: `reports/live-a2a-proof-preflight-summary.md`
- Local `result.task`: true
- Public `result.task`: true
- Prompt Opinion selected external A2A: true
- Runtime POST observed: true
- Runtime 2xx observed: true
- Both MCPs hit: true
- Browser visible clinical payload: false
- Failure timing: after runtime POST

Prompt Opinion showed timeout/cancelled behavior after the runtime hit. The run status file marks A2A red because the visible browser transcript did not expose the clinical payload even though the runtime was reached and both MCPs were called.

Key evidence paths:

- `output/prompt-opinion-e2e/runs/20260507T-real-a2a-browser-proof/reports/a2a-one-turn-status.json`
- `output/prompt-opinion-e2e/runs/20260507T-real-a2a-browser-proof/reports/a2a-runtime-correlation-summary.json`
- `output/prompt-opinion-e2e/runs/20260507T-real-a2a-browser-proof/reports/a2a-downstream-mcp-hit-summary.json`
- `output/prompt-opinion-e2e/runs/20260507T-real-a2a-browser-proof/screenshots/a2a-vc-01-result.txt`

## Direct browser proof status

RED / secondary lane failed after runtime evidence.

Run folder: `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof`

Evidence:

- Prompt Opinion login/workspace/registration checks passed.
- Direct-MCP session started.
- Both MCPs were hit from runtime logs.
- Browser transcript did not persist assistant clinical output.
- Prompt 1 recorded `network:Error from Google Gemini (FREE TIER): Internal error encountered.`
- Prompt 3 did not produce a visible transition package.
- Failure timing: after runtime evidence; no usable browser transcript.

Key evidence paths:

- `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/reports/direct-mcp-status.json`
- `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/reports/runtime-log-delta.json`
- `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/screenshots/fallback-p1-01-result.txt`
- `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/screenshots/fallback-p2-01-result.txt`
- `output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/screenshots/fallback-p3-01-result.txt`

## Combined proof status

NOT RUN.

Reason: A2A and Direct individual browser proofs were not both green.

## Exact next action

Keep the path proxy/ngrok routing fix. Use the public A2A protocol response and runtime correlation as green runtime evidence, but classify Prompt Opinion browser proof as platform-blocked until the workspace surfaces the A2A task content without timeout/cancelled behavior. Do not change clinical logic or fine-tune based on this run.
