# A2A Wire Rendering Analysis

Run ID: `20260507T-final-a2a-po-wire-proof-reroute`

## Classification

Prompt Opinion platform/rendering blocked after a valid compact completed A2A task.

The browser lane is not green because Prompt Opinion displayed `The LLM took too long to respond and the operation was cancelled` after the A2A task content rendered. The runtime side is green for this pass.

## Findings

1. Did PO hit public A2A runtime?
   - Yes. Wire capture file: `wire/0003-1778163206186-a2a-POST-message_send_v1_message_send.json`.

2. Which exact endpoint did PO hit?
   - `POST /message:send/v1/message:send`, proxied to `http://127.0.0.1:5057/message:send/v1/message:send`.

3. What was the request body shape?
   - HTTP+JSON A2A-style body with `id` and `message.role=ROLE_USER` plus text part. Prompt Opinion did not send `A2A-Version`; the runtime accepted the request anyway.

4. What was the response body shape?
   - JSON-RPC 2.0 envelope with `result.task`, plus top-level `task` alias for HTTP+JSON compatibility.

5. What was response byte size?
   - `5788` bytes.

6. Did the response contain `result.task`?
   - Yes.

7. Did the response contain visible clinical answer text?
   - Yes. The task text contained `Final verdict: not_ready`, `Structured baseline: ready`, `Hidden-risk result: hidden_risk_present`, `Nursing Note 2026-04-18 20:40`, and `Case Management Addendum 2026-04-18 20:55`.

8. Did PO browser render any part of it?
   - Yes. `screenshots/a2a-vc-01-result.txt` shows `STATUS_MESSAGE` and `ARTIFACT_MESSAGES` with the same `not_ready` clinical payload and evidence anchors.

9. Did timeout happen before or after runtime response?
   - After. Wire capture recorded HTTP 200 at `2026-05-07T14:13:26.186Z`; the browser result text shows the task payload rendered before the Prompt Opinion timeout/cancelled error.

10. Is failure under our control or platform-side?
   - Platform-side after valid completed A2A task. Repo-side fixes resolved endpoint advertisement, response shape, content type, payload size, and compact visible task text.

## Wire Summary

- Endpoint PO hit: `/message:send/v1/message:send`
- HTTP status: `200`
- Response content type: `application/a2a+json; charset=utf-8`
- Response bytes: `5788`
- Has `$.result.task`: `true`
- Has top-level `$.task`: `true`
- Task state: `TASK_STATE_COMPLETED`
- Final verdict: `not_ready`
- Hidden-risk result: `hidden_risk_present`
- Both MCPs hit: `true`
- Evidence anchors present: `true`

Machine-readable summary: `reports/po-wire-post-summary.json`.

## Endpoint Mismatch Note

The prior browser pass `20260507T-final-a2a-po-wire-proof` selected the external A2A agent but did not POST to runtime after the agent card advertised the HTTP+JSON interface URL as the public base URL. The reroute pass restored Prompt Opinion routing by advertising the HTTP+JSON interface URL as `/message:send`, while keeping A2A `protocolVersion: 1.0` and all compact response behavior.
