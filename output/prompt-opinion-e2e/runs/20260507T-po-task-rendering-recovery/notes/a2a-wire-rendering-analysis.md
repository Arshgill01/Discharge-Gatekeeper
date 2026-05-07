# A2A wire rendering analysis

Run ID: `20260507T-po-task-rendering-recovery`

1. Did Prompt Opinion select external A2A?
   Yes. Browser proof selected `external A2A orchestrator`; evidence: `screenshots/a2a-vc-01-result.txt` and `reports/a2a-runtime-correlation-summary.json` from the successful routed attempt.

2. Did Prompt Opinion POST to our public runtime?
   Yes. Wire capture `wire/0010-1778168819333-a2a-POST-message_send_v1_message_send.json` records a Prompt Opinion POST.

3. Which exact endpoint did it hit?
   `/message:send/v1/message:send`.

4. What was the request body shape?
   A compact A2A message body: `{ "message": { "role": "ROLE_USER", "parts": [{ "text": "is this patient safe to discharge today?" }], "messageId": "..." } }`.

5. What was the response body shape?
   JSON-RPC 2.0 envelope with `result.task` and a top-level `task` alias. The task contains `status.state`, `status.message.parts[0].text`, one artifact with `parts[0].text`, and compact metadata.

6. What was response byte size?
   `5356` bytes for the browser POST wire capture; public manual compact response was `5281` bytes.

7. Did response include result.task?
   Yes.

8. Did response include top-level task alias?
   Yes.

9. Did response include status.message.parts text?
   Yes. It included the compact Care Transitions Command result text.

10. Did response include artifact text?
   Yes. The artifact text mirrored the compact clinical answer.

11. Did response include not_ready?
   Yes.

12. Did both MCPs hit?
   Yes. `task.metadata.both_mcps_hit=true`; runtime correlation also shows both DGK and CI request IDs.

13. Did browser render the clinical payload?
   Yes. `screenshots/a2a-vc-01-result.txt` shows `STATUS_MESSAGE` and `ARTIFACT_MESSAGES` with `Final verdict: not_ready`, the nursing note anchor, and the case management anchor.

14. Did timeout happen before or after runtime response?
   After runtime response. Browser network evidence contains `FunctionCall` for `SendA2AMessage`, then a Prompt Opinion error `The LLM took too long to respond and the operation was cancelled`; wire capture proves the runtime response had already returned HTTP 200.

15. Is the remaining failure under repo control or platform-side?
   Platform-side for Prompt Opinion's post-tool LLM synthesis path. Repo-side runtime now returns a compact valid completed A2A task and Prompt Opinion visibly renders the task payload, but the Prompt Opinion chat stream still reports its own LLM timeout/cancelled error.
