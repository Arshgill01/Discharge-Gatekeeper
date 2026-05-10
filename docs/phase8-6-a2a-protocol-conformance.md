# Phase 8.6 A2A Protocol Conformance Evidence

Date: 2026-05-07

## Status call

Local A2A protocol conformance is green for the Prompt Opinion manager requirement that `/message:send` responses expose a JSON-RPC 2.0 `result.task`.

Prompt Opinion live browser proof remains yellow/red because workspace retries reported Prompt Opinion chat/model errors before reliable A2A routing could be proven.

## Evidence summary

1. Before the patch, `/message:send` returned a bare top-level task object.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-protocol-response-before-message-send.json`
   - Observed shape: `$.result.task=false`, top-level keys: `task`

2. After the patch, `/message:send` returns a JSON-RPC 2.0 envelope with `result.task`.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-protocol-response-after-message-send.json`
   - Observed shape: `jsonrpc="2.0"`, `$.result.task=true`
   - Task state: `TASK_STATE_COMPLETED`
   - `contextId`: `enc-phase0-trap-001`

3. The task contains visible clinical answer text in Prompt Opinion-compatible task content.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-protocol-response-after-message-send.json`
   - Visible answer includes:
     - `Final verdict: not_ready`
     - `Structured baseline: ready`
     - `Hidden-risk result: hidden_risk_present`

4. The task carries the hidden-risk contradiction evidence anchors needed for the demo.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-protocol-response-after-message-send.json`
   - Evidence anchors include:
     - `Nursing Note 2026-04-18 20:40`
     - `Hospitalist Progress Note 2026-04-18 08:10`
     - `Case Management Addendum 2026-04-18 20:55`

5. Local runtime behavior shows both MCPs were called by the external A2A orchestrator.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-protocol-response-after-message-send.json`
   - Downstream call evidence:
     - `discharge_gatekeeper_mcp` tool `assess_discharge_readiness`, status `ok`
     - `clinical_intelligence_mcp` tool `surface_hidden_risks`, status `ok`

6. The prior tunneled run proved Prompt Opinion can register the live endpoints, but did not prove chat-path routing.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/status-summary.md`
   - Registration endpoint check was green for:
     - Discharge Gatekeeper MCP
     - Clinical Intelligence MCP
     - external A2A orchestrator

7. The latest Prompt Opinion browser retry failed at the platform/model layer rather than proving a malformed local A2A task response.
   - Evidence: `output/prompt-opinion-e2e/runs/20260505T-a2a-protocol-conformance/reports/a2a-status.json`
   - Error signal: `network:Error from Google Gemini (FREE TIER): Internal error encountered.`
   - A2A browser lane status remained red because the workspace chat path did not produce reliable external runtime correlation.

## Current classification

| Surface | Status | Basis |
| --- | --- | --- |
| A2A protocol envelope | GREEN | `/message:send` now returns JSON-RPC 2.0 `result.task` |
| A2A local runtime/product logic | GREEN | task completes with `not_ready`, structured baseline `ready`, hidden-risk result, citations, and downstream MCP calls |
| Prompt Opinion browser proof | YELLOW/RED | workspace retries hit Prompt Opinion chat/model execution errors and did not prove reliable routing |
| Direct-MCP fallback | Secondary | useful fallback lane, not the main evidence target for this protocol conformance note |

## Controlled A2A-only retry

Run ID: `20260505T-a2a-final-po-retry`

Command:

```bash
RUN_ID=20260505T-a2a-final-po-retry
PROMPT_OPINION_BROWSER_PROFILE_DIR="/tmp/ctc-po-profile-$RUN_ID" \
PROMPT_OPINION_E2E_RUN_ID="$RUN_ID" \
PROMPT_OPINION_E2E_RUN_DIR="output/prompt-opinion-e2e/runs/$RUN_ID" \
PROMPT_OPINION_BROWSER_LANES=a2a_main \
PROMPT_OPINION_A2A_VARIANTS=vc \
PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER=1 \
./po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
```

Result:

- Provider preflight: green (`provider=google`, `model=gemma-4-31b-it`, key present)
- Prompt Opinion login/workspace discovery: green
- MCP registration verification: green
- External A2A connection verification: green
- A2A consult selection: green
- A2A-main lane: red
- Blocker: `chat_path_not_routed`
- Runtime POST observed: no
- Runtime 2xx observed: no
- Both MCPs hit from browser attempt: no
- Visible browser error: `The LLM took too long to respond and the operation was cancelled`
- Evidence:
  - `output/prompt-opinion-e2e/runs/20260505T-a2a-final-po-retry/reports/status-summary.md`
  - `output/prompt-opinion-e2e/runs/20260505T-a2a-final-po-retry/reports/a2a-one-turn-status.json`
  - `output/prompt-opinion-e2e/runs/20260505T-a2a-final-po-retry/reports/a2a-runtime-correlation-summary.json`
  - `output/prompt-opinion-e2e/runs/20260505T-a2a-final-po-retry/screenshots/a2a-vc-01-result.txt`

Final classification after this retry:

- A2A runtime/protocol: green locally
- Prompt Opinion live browser proof: blocked by Prompt Opinion chat/model execution before reliable A2A runtime routing
- Do not continue retry loops without a new observed platform/runtime signal

## Operating guidance

Stop changing A2A protocol code unless a new, specific observed bug appears. The next useful work is evidence packaging, one controlled A2A-only Prompt Opinion retry, and then moving back to the differentiator work: the contradiction ledger and scenario pack.
