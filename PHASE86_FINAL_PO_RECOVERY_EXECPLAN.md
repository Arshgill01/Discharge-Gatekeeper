# PHASE 8.6 FINAL PROMPT OPINION RECOVERY EXECUTION SPEC

## 2026-05-09 Baseline Gate Closeout

Final baseline proof status:

- Precheck: passed in the fresh Google Flash Lite proof runs.
- Test 1 Direct-MCP Prompt Opinion proof: passed under the visible transcript standard.
- Test 2 combined Direct-MCP plus A2A proof: passed.
- Test 3 fresh reproducibility proof: passed.
- Phase 9: unblocked after branch cleanup and clean commits.

Final proof artifacts:

- Test 1: `output/prompt-opinion-e2e/runs/20260509T121900Z-test1-googleflashlite-verbatim-scenario-fix/reports/test1-visible-proof-audit.md`
- Test 2: `output/prompt-opinion-e2e/runs/20260509T122600Z-test2-combined-googleflashlite/reports/test2-combined-proof-audit.md`
- Test 3: `output/prompt-opinion-e2e/runs/20260509T123400Z-test3-fresh-repro-googleflashlite/reports/test3-fresh-repro-proof-audit.md`
- Completion audit: `output/prompt-opinion-e2e/baseline-goal-completion-audit.md`

Provider/workspace closeout:

- GitHubFree recovery was attempted and blocked by a Prompt Opinion GitHub Models free-tier content filter.
- GoogleFree `gemini-3.1-flash-lite` passed the no-tool, minimal tool, canonical Prompt 1, full Test 1, combined Test 2, and fresh Test 3 path.
- The failure was not fixed by changing clinical logic, MCP logic, or A2A logic.
- Prompt Opinion visible screenshots plus ngrok inspector evidence are the accepted proof, not FunctionResponse persistence alone.

Historical failed-gate context follows for traceability.

## 2026-05-09 Earlier Baseline Gate Update

Current formal gate status:

- Precheck: passed in `output/prompt-opinion-e2e/runs/20260509T103730Z-test1-ci-focused-visible/reports/precheck-report.md`
- Test 1 Direct-MCP Prompt Opinion proof: failed
- Test 2 combined baseline proof: not run, correctly blocked by Test 1
- Test 3 fresh reproducibility proof: not run, correctly blocked by Test 1
- Phase 9: not entered

Current branch and commit tested:

- Branch: `fix/phase8.6-a2a-latency-recovery`
- Commit: `72168df963d0a486c6bd12bb1d38475ce9eee713`

Current Test 1 evidence:

- Run folder: `output/prompt-opinion-e2e/runs/20260509T103730Z-test1-ci-focused-visible`
- Failure report: `reports/test1-ci-focused-visible-failure-report.md`
- Direct-MCP status: `reports/direct-mcp-status.json`
- Network evidence: `reports/browser-network-events.json`
- Prompt 1 screenshot text: `screenshots/fallback-p1-01-result.txt`
- Prompt 2 screenshot text: `screenshots/fallback-p2-01-result.txt`

Observed failure:

- Prompt Opinion reached the current public Clinical Intelligence MCP.
- Prompt 1 called `assess_reconciled_discharge_readiness`.
- The Prompt Opinion network stream received a compact FunctionResponse containing:
  - `Final verdict: not_ready`
  - `Structured baseline posture: ready`
  - `Hidden-risk result: hidden_risk_present`
  - `Nursing Note 2026-04-18 20:40`
  - `Case Management Addendum 2026-04-18 20:55`
- Prompt Opinion did not persist a final assistant transcript for Prompt 1.
- The same stream emitted a Google-side error after the valid FunctionResponse.
- Prompt 2/3 showed timeout/cancelled behavior.

Current failure classification:

- Primary: `model/provider error`
- Primary: `browser transcript not persisted`
- Secondary: `timeout/cancelled after valid response`

This is not currently supported by evidence as:

- stale branch
- stale public URL
- stale process
- MCP registration failure
- MCP reachability failure
- wrong clinical output from the CI tool

Smallest evidence-backed recovery plan:

1. Do not run Test 2 or Test 3 while Test 1 remains red.
2. Do not make additional clinical prompt/output changes unless new evidence shows the returned tool payload is clinically wrong. It is already compact and contains the required verdict, baseline, hidden-risk result, and anchors.
3. Treat the next recovery as a Prompt Opinion workspace/provider recovery, not a runtime clinical-code recovery.
4. Before another formal Test 1 attempt, choose one of:
   - configure a stable Prompt Opinion model provider with owner approval, then rerun Test 1 from a fresh run folder; or
   - obtain explicit acceptance that the persisted/expanded FunctionResponse text can count as the visible Direct-MCP result when Prompt Opinion post-tool assistant synthesis fails.
5. After a provider/workspace recovery, rerun only Test 1 first, with the full precheck and current registrations.
6. Enter Test 2 only if Test 1 has an accepted visible transcript for all three prompts, required anchors, no timeout/cancelled banner, and runtime/MCP logs proving expected calls.

## Purpose

This file is the single source of truth for the final Phase 8.6 recovery run.

The objective is not to do another vague browser-proof loop.

The objective is to identify the exact remaining cause of the Prompt Opinion live proof failure and fix it if it is under repo/runtime control.

Current known truth:

- Local DGK/CI/A2A services can run.
- Public tunnel/path proxy can map:
  - `/dgk/*` -> local DGK on 5055
  - `/ci/*` -> local CI on 5056
  - `/*` -> local A2A on 5057
- Public readiness can be green.
- Public A2A protocol POST can return JSON-RPC `result.task`.
- Public A2A protocol POST can return `not_ready`, structured baseline `ready`, hidden-risk result, and evidence anchors.
- Prompt Opinion browser proof still fails to surface the completed runtime clinical payload reliably.
- Latest A2A browser proof reached runtime POST, received 2xx, hit both MCPs, but did not show the clinical payload in the browser transcript.
- Latest Direct browser proof is secondary and unstable; do not start with Direct.

The most important current hypothesis:

> Prompt Opinion receives the external A2A task, but either rejects, times out, or fails to render/synthesize it because the returned task is still not sufficiently Prompt Opinion-compatible at the **wire payload/rendering level**.

Likely causes to investigate and fix:

1. The response envelope is valid but the task payload is too large.
2. The response includes huge diagnostics/custom JSON in artifacts or metadata.
3. The answer text is present but buried after JSON diagnostics.
4. Content-Type / A2A binding mismatch causes PO to parse differently.
5. PO expects `$.result.task`, but also tolerates/needs top-level `task` for HTTP+JSON path; our runtime may need a dual-compatible response for `/message:send`.
6. PO gets a completed task but then its own LLM synthesis times out due to payload volume or task structure.
7. Browser harness is missing the exact response body that PO received.
8. The selected external agent call may use a different endpoint/method/header than local manual probes.
9. Direct-MCP is failing separately and must not distract from A2A until A2A has a final call.

Do not fine-tune.
Do not rewrite clinical logic.
Do not change shared env.
Do not run endless full combined proofs.
Do not treat static screenshots as source of truth.
Do not call the run green unless current evidence proves it.

---

## Branch and Worktree

Run from:

```bash
cd /Users/arshdeepsingh/Developer/ctc-phase8-6-integration
```

Expected branch:

```bash
int/phase8.6-real-green
```

If you want isolation, create a child branch from the current integration branch:

```bash
git checkout int/phase8.6-real-green
git pull --ff-only origin int/phase8.6-real-green || true
git checkout -b fix/phase8.6-final-po-surface-recovery
```

If the branch already exists, use it.

Do not run from `master`.
Do not run from old A2A/Direct worktrees.

---

## Non-negotiable Constraints

1. Never print or commit secret values.
2. Never modify `/Users/arshdeepsingh/.config/care-transitions-command/phase8.env`.
3. Never commit `.env.local`.
4. Never call heuristic output Google-backed proof.
5. Never mark Prompt Opinion browser proof green if:
   - timeout/cancelled/error banner appears,
   - no runtime POST occurred,
   - no 2xx response occurred,
   - both MCPs were not hit,
   - visible task payload lacks final `not_ready`,
   - visible transcript does not persist after settle.
6. Never run combined proof before A2A-only is resolved.
7. If failure happens after runtime POST and public `result.task` is valid, investigate PO response parsing/rendering payload before touching clinical logic.

No-secret guard before every commit:

```bash
git restore --staged .env.local 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git diff --cached --name-only | grep -E '\.env|phase8.env' && echo "STOP: secret file staged" && exit 1 || echo "OK: no env secret staged"
git check-ignore -v .env.local || true
```

---

## Required Reading

Read these before changing anything:

```bash
AGENTS.md
PLAN.md
docs/prompt-opinion-integration-runbook.md
docs/phase8-6-a2a-protocol-conformance.md
output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/notes/final-live-proof-status.md
po-community-mcp-main/scripts/run-live-a2a-po-proof.sh
po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
po-community-mcp-main/scripts/prompt-opinion-browser-proof.mjs
po-community-mcp-main/scripts/prompt-opinion-browser-proof-harness-lib.mjs
po-community-mcp-main/scripts/start-public-path-proxy-local.sh
po-community-mcp-main/external-a2a-orchestrator-typescript/index.ts
po-community-mcp-main/external-a2a-orchestrator-typescript/agent-card.ts
po-community-mcp-main/external-a2a-orchestrator-typescript/types.ts
po-community-mcp-main/external-a2a-orchestrator-typescript/smoke/prompt-opinion-compatibility-smoke.ts
```

Also review recent commits:

```bash
git log --oneline -20
git show --stat 9d0c609924eea4f15f4e1f9738dc3f565cf4648f
git show --stat 5c46d93
git show --stat 42ddcc5
git show --stat 7897814
```

---

## Current Architecture

The system is:

```text
Prompt Opinion
  -> External A2A agent
    -> Discharge Gatekeeper MCP
    -> Clinical Intelligence MCP
    -> reconciled not_ready task
```

Primary live proof lane is now **A2A one-turn**.

Direct-MCP is secondary only. Do not spend the first pass on Direct.

---

## Official A2A / Prompt Opinion Compatibility Targets

The Prompt Opinion manager reply said:

- PO uses A2A v1.
- PO checks for `$.result.task`.
- They follow A2A spec and do not support custom SDK-style messages.
- External agents selected in chat use A2A; linked BYO/orchestrator agents do not use the same A2A path.

Therefore, for the actual PO-facing external A2A response, the safest compatibility target is:

```json
{
  "jsonrpc": "2.0",
  "id": "<same request id or stable id>",
  "result": {
    "task": {
      "id": "<task id>",
      "contextId": "<context id>",
      "status": {
        "state": "TASK_STATE_COMPLETED",
        "message": {
          "role": "ROLE_AGENT",
          "parts": [
            {
              "text": "Final verdict: not_ready. ..."
            }
          ]
        }
      },
      "artifacts": [
        {
          "artifactId": "<artifact id>",
          "name": "Care Transitions Command fused response",
          "parts": [
            {
              "text": "Final verdict: not_ready. Structured baseline: ready. Hidden-risk result: hidden_risk_present. Evidence anchors: Nursing Note 2026-04-18 20:40; Case Management Addendum 2026-04-18 20:55."
            }
          ]
        }
      ]
    }
  }
}
```

Important:
- The clinical answer must live in simple text parts.
- Diagnostics must not be the only place where the answer exists.
- Avoid huge diagnostic JSON inside the `message:send` result.
- Use `/tasks/:id` or local logs for full diagnostics, not the primary PO response.

---

## Critical New Hypothesis: Payload Size / Diagnostics Are Killing PO Rendering

Inspect `buildA2ATaskPayload`.

If the task currently includes both:
- compact clinical text,
- and a huge `JSON.stringify(task.output)` artifact,
- and `metadata.diagnostics` with full downstream calls / HTTP exchange details,

then the task may be technically valid but too heavy for Prompt Opinion to parse/render/synthesize.

This can produce the exact symptom:

```text
Runtime POST observed.
Runtime 2xx observed.
Both MCPs hit.
Prompt Opinion does not surface the clinical payload.
Prompt Opinion eventually shows timeout/cancelled behavior.
```

Therefore, the highest-value fix is likely:

> Make the immediate `message:send` task response slim, boring, and PO-renderable.

Keep full diagnostics available in:
- local logs,
- run reports,
- `/tasks/:id`,
- optional `A2A_INCLUDE_VERBOSE_DIAGNOSTICS=1`,
- but not in the default PO-facing `message:send` response.

Target PO-facing response size:

```text
<= 8 KB ideal
<= 15 KB maximum
```

Target visible clinical answer text:

```text
300-700 words maximum
```

---

## Phase 1 — Baseline and Service Proof

Run:

```bash
git branch --show-current
git rev-parse HEAD
git status --short

./po-community-mcp-main/scripts/link-shared-env.sh
./po-community-mcp-main/scripts/check-runtime-provider-config.sh

./po-community-mcp-main/scripts/start-two-mcp-local.sh
./po-community-mcp-main/scripts/check-two-mcp-readiness.sh

./po-community-mcp-main/scripts/start-a2a-local.sh
./po-community-mcp-main/scripts/check-a2a-readiness.sh

./po-community-mcp-main/scripts/start-public-path-proxy-local.sh
```

Ensure the tmux service session is still alive if it is used:

```bash
tmux ls || true
tmux capture-pane -t ctc_phase86_services -p | tail -80 || true
```

Public host currently used:

```text
https://underpaid-passion-unloaded.ngrok-free.dev
```

Verify public endpoints:

```bash
curl -sS -o /tmp/public-dgk-readyz.json -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/dgk/readyz
curl -sS -o /tmp/public-ci-readyz.json -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/ci/readyz
curl -sS -o /tmp/public-a2a-readyz.json -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/readyz
curl -sS -o /tmp/public-a2a-card.json -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/.well-known/agent-card.json
curl -sS -o /tmp/public-a2a-tasks.json -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/tasks
```

All must be 200.

If any is not 200, fix routing only. Do not touch product logic.

---

## Phase 2 — Capture Actual Public A2A Response Size and Shape

Create a new run id:

```bash
RUN_ID=20260507T-final-po-surface-recovery
RUN_DIR="output/prompt-opinion-e2e/runs/$RUN_ID"
mkdir -p "$RUN_DIR/reports" "$RUN_DIR/logs" "$RUN_DIR/notes"
```

Manual public A2A POST:

```bash
curl -sS \
  -H 'content-type: application/json' \
  -H 'x-request-id: final-surface-public-probe' \
  -H 'x-correlation-id: final-surface-public-probe-corr' \
  -d '{"id":"final-surface-public-probe","message":{"role":"ROLE_USER","parts":[{"text":"Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?"}]}}' \
  https://underpaid-passion-unloaded.ngrok-free.dev/message:send/v1/message:send \
  > "$RUN_DIR/reports/public-a2a-response-before-slimming.json"
```

Analyze:

```bash
node - "$RUN_DIR/reports/public-a2a-response-before-slimming.json" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const p = JSON.parse(raw);
const text = JSON.stringify(p);
const task = p?.result?.task;
function size(value) { return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8"); }
console.log({
  bytes_total: Buffer.byteLength(raw, "utf8"),
  has_jsonrpc: p?.jsonrpc === "2.0",
  has_result_task: Boolean(task),
  status_state: task?.status?.state,
  has_status_message_parts: Array.isArray(task?.status?.message?.parts),
  artifacts_count: Array.isArray(task?.artifacts) ? task.artifacts.length : 0,
  artifact_parts_count: Array.isArray(task?.artifacts) ? task.artifacts.flatMap(a => a?.parts || []).length : 0,
  metadata_bytes: size(task?.metadata || {}),
  artifacts_bytes: size(task?.artifacts || []),
  status_message_bytes: size(task?.status?.message || {}),
  includes_not_ready: text.includes("not_ready"),
  includes_nursing: text.includes("Nursing Note 2026-04-18 20:40"),
  includes_case_management: text.includes("Case Management Addendum 2026-04-18 20:55"),
});
NODE
```

If `bytes_total > 15000`, treat payload size as a primary suspect.

If `metadata_bytes > 3000` or `artifacts_bytes > 8000`, slim the task.

---

## Phase 3 — Add Raw Wire Capture to Path Proxy

Patch `start-public-path-proxy-local.sh` or add a companion proxy mode so the proxy can record exact request/response bodies for A2A calls.

Required behavior:

- Capture only for paths containing:
  - `/message:send`
  - `/rpc`
  - `/tasks`
- Save redacted request/response files under:
  - `output/prompt-opinion-e2e/runs/<run-id>/wire/`
- Include:
  - timestamp
  - method
  - path
  - route label
  - status code
  - request headers redacted
  - request body redacted
  - response headers redacted
  - response body redacted
  - byte counts
- Do not log secrets.
- Do not log Prompt Opinion password/cookies.
- Keep size limits: truncate body captures to 100 KB per file, but preserve byte counts.

Env controls:

```bash
PATH_PROXY_WIRE_CAPTURE_DIR="output/prompt-opinion-e2e/runs/$RUN_ID/wire"
PATH_PROXY_CAPTURE_BODIES=1
```

If patching the proxy is too risky, add a separate `scripts/start-public-path-proxy-capture-local.sh`.

Validation:

```bash
bash -n po-community-mcp-main/scripts/start-public-path-proxy-local.sh
./po-community-mcp-main/scripts/stop-public-path-proxy-local.sh || true
PATH_PROXY_WIRE_CAPTURE_DIR="$RUN_DIR/wire" PATH_PROXY_CAPTURE_BODIES=1 ./po-community-mcp-main/scripts/start-public-path-proxy-local.sh
```

Run a manual public POST and verify files appear in `$RUN_DIR/wire`.

---

## Phase 4 — Slim the PO-Facing A2A Task Response

Patch the A2A task payload builder.

Goal:

Default `/message:send` response should be a compact task that PO can render quickly.

Keep this in the immediate task:

- `id`
- `contextId`
- `status.state`
- `status.message` with one simple text part
- `artifacts` with one simple text artifact
- minimal `metadata`, such as:
  - `runtime_summary`
  - `request_id`
  - `task_id`
  - `final_verdict`
  - `hidden_risk_result`
  - `narrative_source_count`
  - `both_mcps_hit`
  - `diagnostics_available_via`: `/tasks/<id>` or logs

Remove or gate behind env var from immediate `message:send` result:

- full `JSON.stringify(task.output)` artifact part
- full `runtime_diagnostics`
- full downstream `http_exchanges`
- giant prompt payload JSON
- full note text
- repeated patient context
- raw schemas

Introduce env var:

```bash
A2A_PO_RESPONSE_MODE=compact
A2A_INCLUDE_VERBOSE_DIAGNOSTICS=0
```

Default should be compact.

If someone sets:

```bash
A2A_INCLUDE_VERBOSE_DIAGNOSTICS=1
```

then `/tasks/:id` may include full diagnostics, but the default `message:send` response should stay compact unless explicitly requested.

Target compact answer text:

```text
Care Transitions Command result:
Final verdict: not_ready.
Structured baseline: ready.
Hidden-risk result: hidden_risk_present.

Why the answer changed:
The structured chart looked discharge-ready at rest, but narrative evidence shows exertional oxygen desaturation and unsafe home setup tonight.

Evidence:
- Nursing Note 2026-04-18 20:40: SpO2 dropped to 82% after walking/stairs with dyspnea.
- Case Management Addendum 2026-04-18 20:55: home oxygen delivery delayed until tomorrow; daughter cannot stay overnight.

Immediate blockers:
- clinical_stability
- equipment_and_transport
- home_support_and_services

Required before discharge:
Hold discharge today; reassess exertional oxygen needs; confirm oxygen delivery; confirm overnight support/transport plan; update clinician handoff.
```

Target raw response size after slimming:

```text
<= 8 KB ideal
<= 15 KB max
```

Add tests to assert this.

---

## Phase 5 — Dual Compatibility Response for HTTP+JSON

Because PO’s actual path has been `/message:send/v1/message:send`, and A2A REST examples may use top-level `{ task }` while PO manager says they check `$.result.task`, make the HTTP+JSON response dual-compatible unless this breaks smoke tests.

For HTTP+JSON endpoints only, consider returning:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "task": { "...": "..." }
  },
  "task": { "...same task..." }
}
```

This satisfies:
- `$.result.task`
- top-level `$.task`

If adding top-level `task` causes tests to fail, do not force it. But test whether PO renders better with it.

Add smoke assertions for both:

```text
payload.result.task exists
payload.task exists OR explicitly explain why not
payload.result.task.id == payload.task.id when top-level alias exists
```

Do not remove `result.task`.

---

## Phase 6 — Content-Type Compatibility

For `/message:send`, `/v1/message:send`, and `/message:send/v1/message:send`, ensure response headers are compatible.

Current local/proxy response should ideally include:

```text
Content-Type: application/a2a+json; charset=utf-8
```

or at minimum:

```text
application/json; charset=utf-8
```

Test both if needed.

If Express currently uses `application/json`, add explicit response content type for A2A endpoints:

```ts
res.type("application/a2a+json").status(200).json(...)
```

But if Prompt Opinion behaves worse with `application/a2a+json`, revert to `application/json`.

Use wire capture to know.

Document exact result.

---

## Phase 7 — A2A Method/Endpoint Matrix

Run local and public probes for all A2A surfaces:

- `/message:send`
- `/v1/message:send`
- `/message:send/v1/message:send`
- `/rpc` with method `SendMessage`
- `/rpc` with method `message/send`
- `/rpc` with method `message:send`

Save responses under:

```text
$RUN_DIR/reports/a2a-endpoint-matrix/
```

Each response must report:

- HTTP status
- content type
- has top-level task
- has result.task
- task status
- response bytes
- text includes not_ready
- text includes anchors

Create matrix report:

```text
$RUN_DIR/reports/a2a-endpoint-matrix.md
```

If one surface is more compatible with PO’s actual request shape, optimize that one first.

---

## Phase 8 — A2A Browser Proof with Wire Capture

Only after:

- local endpoints healthy,
- public endpoints healthy,
- public protocol compact response <= 15 KB,
- wire capture enabled,
- A2A endpoint matrix green,

run A2A-only browser proof.

Use:

```bash
RUN_ID=20260507T-final-a2a-po-wire-proof
RUN_DIR="output/prompt-opinion-e2e/runs/$RUN_ID"

PATH_PROXY_WIRE_CAPTURE_DIR="$RUN_DIR/wire" \
PATH_PROXY_CAPTURE_BODIES=1 \
PROMPT_OPINION_E2E_RUN_ID="$RUN_ID" \
PROMPT_OPINION_E2E_RUN_DIR="$RUN_DIR" \
PROMPT_OPINION_BROWSER_PROFILE_DIR="/tmp/ctc-po-profile-$RUN_ID" \
PROMPT_OPINION_BROWSER_LANES=a2a_main \
PROMPT_OPINION_A2A_VARIANTS=vc \
PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER=1 \
./po-community-mcp-main/scripts/run-live-a2a-po-proof.sh
```

After it runs, analyze:

```bash
grep -R "message:send\|result.task\|Final verdict\|LLM took too long\|operation was cancelled\|Error from Google Gemini" "$RUN_DIR" || true
```

Create:

```text
$RUN_DIR/notes/a2a-wire-rendering-analysis.md
```

This note must answer:

1. Did PO hit public A2A runtime?
2. Which exact endpoint did PO hit?
3. What was the request body shape?
4. What was the response body shape?
5. What was response byte size?
6. Did the response contain `result.task`?
7. Did the response contain visible clinical answer text?
8. Did PO browser render any part of it?
9. Did timeout happen before or after runtime response?
10. Is failure under our control or platform-side?

---

## Phase 9 — If A2A Still Fails After Runtime 2xx

If wire capture proves all of these:

- PO selected external A2A,
- PO POSTed to our runtime,
- our runtime returned HTTP 200,
- response has `result.task`,
- response task is compact <= 15 KB,
- task has text parts with `not_ready`,
- both MCPs hit,
- browser still times out or does not render,

then classify as:

```text
Prompt Opinion platform/rendering blocked after valid completed A2A task.
```

Do not keep coding backend randomly.

Instead, create a judge/submission evidence pack:

```text
docs/phase8-6-platform-blocked-proof.md
```

Must include:

- public endpoint readiness table,
- public A2A protocol response shape,
- screenshot or file path proving PO selected external A2A,
- wire-captured PO request,
- wire-captured HTTP 200 response,
- runtime correlation,
- both MCP hits,
- final task content,
- browser timeout after runtime response,
- clear statement: runtime/protocol is green; PO browser rendering is platform-limited.

This is not giving up. It is evidence discipline.

---

## Phase 10 — If A2A Browser Turns Green

If A2A turns green:

1. Commit the fix and evidence.
2. Do not touch A2A again.
3. Run Direct-MCP separately only once.

Direct command:

```bash
RUN_ID=20260507T-final-direct-mcp-proof
PROMPT_OPINION_E2E_RUN_ID="$RUN_ID" \
PROMPT_OPINION_E2E_RUN_DIR="output/prompt-opinion-e2e/runs/$RUN_ID" \
PROMPT_OPINION_BROWSER_PROFILE_DIR="/tmp/ctc-po-profile-$RUN_ID" \
PROMPT_OPINION_BROWSER_LANES=direct-mcp \
PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER=1 \
./po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
```

If Direct fails with timeout/no transcript, classify Direct as secondary/yellow. Do not block A2A progress.

Run combined proof only if both individual lanes are green.

---

## Phase 11 — Validation Commands

Before commit:

```bash
git diff --check
bash -n po-community-mcp-main/scripts/run-live-a2a-po-proof.sh
bash -n po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
bash -n po-community-mcp-main/scripts/start-public-path-proxy-local.sh
bash -n po-community-mcp-main/scripts/stop-public-path-proxy-local.sh
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-compatibility
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:release-gate
```

If A2A code changed, also run:

```bash
./po-community-mcp-main/scripts/check-a2a-readiness.sh
```

If shared runtime scripts changed, run:

```bash
./po-community-mcp-main/scripts/check-two-mcp-readiness.sh
./po-community-mcp-main/scripts/check-a2a-readiness.sh
```

---

## Phase 12 — Final Commit

Commit useful changes even if PO browser remains platform-blocked, but be honest.

No-secret guard:

```bash
git restore --staged .env.local 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git diff --cached --name-only | grep -E '\.env|phase8.env' && echo "STOP: secret file staged" && exit 1 || echo "OK: no env secret staged"
git check-ignore -v .env.local || true
```

If you fixed payload/rendering compatibility:

```bash
git add po-community-mcp-main/external-a2a-orchestrator-typescript po-community-mcp-main/scripts docs output/prompt-opinion-e2e/runs/*/notes
git commit -m "fix: slim prompt opinion a2a task rendering"
```

If the only result is platform-blocked evidence:

```bash
git add docs output/prompt-opinion-e2e/runs/*/notes
git commit -m "docs: record prompt opinion a2a platform-blocked proof"
```

---

## Phase 13 — Final Report Required

Final report must be structured exactly like this:

```text
## Final status

A2A local runtime:
A2A public protocol:
A2A Prompt Opinion browser:
Direct-MCP browser:
Combined proof:

## Root cause

One paragraph. No vibes. State exact observed cause.

## What changed

- ...

## Commands run

- ...

## Evidence paths

- ...

## Wire capture summary

Endpoint PO hit:
HTTP status:
Response bytes:
Has result.task:
Has visible clinical text:
Both MCPs hit:
Timeout before/after response:

## Pass/fail table

| Surface | Status | Evidence |
| --- | --- | --- |
| Local DGK | ... | ... |
| Local CI | ... | ... |
| Local A2A | ... | ... |
| Public DGK | ... | ... |
| Public CI | ... | ... |
| Public A2A | ... | ... |
| Public result.task | ... | ... |
| PO selected external A2A | ... | ... |
| PO runtime POST | ... | ... |
| PO visible clinical payload | ... | ... |

## Open risks

- ...

## Exact next action

One sentence.
```

---

## Success Definition

The ideal success is:

```text
A2A Browser: GREEN
Prompt Opinion selected external A2A.
Runtime POST observed.
2xx observed.
Both MCPs hit.
Visible transcript contains not_ready and evidence anchors.
No timeout/cancelled banner.
```

Acceptable fallback if PO is truly platform-blocked:

```text
A2A Runtime/Public Protocol: GREEN
PO Browser: PLATFORM-BLOCKED AFTER VALID COMPLETED TASK
Wire capture proves PO received valid compact result.task with not_ready.
```

Unacceptable:

```text
No public endpoint proof.
No public result.task proof.
No wire capture.
No exact failure timing.
Another vague browser red.
Another code patch without measured response body size.
```

---

## Tiny Launcher Prompt for Codex

Use this as the actual chat prompt after placing this file in repo root:

```text
Read PHASE86_FINAL_PO_RECOVERY_EXECPLAN.md completely. Execute it end-to-end from /Users/arshdeepsingh/Developer/ctc-phase8-6-integration on branch int/phase8.6-real-green or a child branch fix/phase8.6-final-po-surface-recovery. Do not stop at the first browser failure. First identify whether the remaining cause is payload size/rendering, response shape, content type, endpoint mismatch, or Prompt Opinion platform failure. Fix anything under repo control. Capture raw wire request/response evidence. If PO still fails after receiving a compact valid result.task with not_ready and both MCP hits, record platform-blocked proof and stop. Follow every validation, no-secret, commit, and final-report requirement in the file.
```
