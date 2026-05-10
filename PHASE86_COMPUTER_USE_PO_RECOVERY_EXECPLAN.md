# PHASE 8.6 COMPUTER USE PROMPT OPINION RECOVERY EXECPLAN

## 2026-05-09 Closeout

This plan is retained as recovery context, but the final accepted baseline proof did not require switching the source of truth to macOS Computer Use.

The completed proof used:

- fresh Prompt Opinion browser proof runs,
- visible Prompt Opinion transcript screenshots,
- Prompt Opinion GoogleFree `gemini-3.1-flash-lite`,
- Direct-MCP and A2A registrations against the current ngrok URL,
- ngrok inspector evidence for MCP/A2A runtime hits.

Final gate artifacts:

- Test 1: `output/prompt-opinion-e2e/runs/20260509T121900Z-test1-googleflashlite-verbatim-scenario-fix/reports/test1-visible-proof-audit.md`
- Test 2: `output/prompt-opinion-e2e/runs/20260509T122600Z-test2-combined-googleflashlite/reports/test2-combined-proof-audit.md`
- Test 3: `output/prompt-opinion-e2e/runs/20260509T123400Z-test3-fresh-repro-googleflashlite/reports/test3-fresh-repro-proof-audit.md`

Use this document only if future Prompt Opinion auth/session instability makes the browser harness insufficient again.

## Purpose

This file replaces the previous final Prompt Opinion recovery plan for the live UI proof.

The backend/runtime proof stays script-driven.

The final Prompt Opinion UI proof now uses **Codex macOS Computer Use controlling the real Chrome or Safari app**, not Playwright as the final source of truth.

Why:

- Prompt Opinion requires real signed-in browser state.
- The in-app browser is not the right surface for auth-heavy/signed-in flows.
- Playwright remains useful for repeatable backend/protocol checks, but it is not allowed to be the final arbiter of the Prompt Opinion visible UI proof.
- Computer Use should use the real browser session where the user is already signed in.
- The proof must combine:
  1. script-level backend truth,
  2. public protocol truth,
  3. real browser visible UI truth,
  4. wire/log correlation.

Do not remove the runtime scripts.
Do not throw away Playwright files.
Do not use Playwright for the final live Prompt Opinion pass unless explicitly requested as a secondary regression harness.

The final live proof must be performed with Computer Use in a real browser.

---

## Core Workflow Change

Old final UI proof:

```text
Script -> Playwright -> Prompt Opinion browser automation -> screenshots/text -> status
```

New final UI proof:

```text
Scripted backend preflight -> public protocol POST -> wire capture -> Computer Use controls Chrome/Safari -> Prompt Opinion visible result -> manual/browser evidence capture -> runtime correlation
```

The scripts still matter.

Use scripts for:

- starting local DGK/CI/A2A runtimes,
- starting public path proxy,
- checking local readiness,
- checking public tunnel readiness,
- checking public `result.task`,
- capturing wire request/response bodies,
- checking logs and runtime correlation.

Use Computer Use for:

- real Prompt Opinion login/session,
- real Prompt Opinion workspace,
- selecting external A2A agent,
- sending the prompt,
- watching the actual UI,
- detecting transient error banners,
- copying visible assistant text,
- saving screenshots/notes.

---

## Worktree and Branch

Run from:

```bash
cd /Users/arshdeepsingh/Developer/ctc-phase8-6-integration
```

Expected branch:

```bash
int/phase8.6-real-green
```

Recommended isolation branch:

```bash
git checkout int/phase8.6-real-green
git pull --ff-only origin int/phase8.6-real-green || true
git checkout -b fix/phase8.6-computer-use-po-proof
```

If the branch already exists, use it.

Do not run from `master`.
Do not run from old Direct/A2A worker worktrees.

---

## Non-Negotiable Rules

1. Do not modify the shared env file:
   `/Users/arshdeepsingh/.config/care-transitions-command/phase8.env`

2. Do not print secrets.

3. Do not commit:
   - `.env.local`
   - browser cookies
   - profile folders
   - screenshots containing passwords/secrets
   - Prompt Opinion session tokens

4. Do not use in-app Browser for the live proof.

5. Use Computer Use with real Chrome or Safari.

6. Prefer Chrome if already signed in to Prompt Opinion; otherwise Safari is fine.

7. Do not rely on Playwright final screenshots for the official proof.

8. Do not run combined proof until A2A-only proof is resolved.

9. Do not change clinical logic unless a direct public protocol preflight proves the clinical output is wrong.

10. If Computer Use proves Prompt Opinion received a valid completed A2A task but still fails to render it, record platform-blocked proof and stop backend coding.

---

## Required Reading

Read first:

```bash
AGENTS.md
PLAN.md
docs/prompt-opinion-integration-runbook.md
docs/phase8-6-a2a-protocol-conformance.md
output/prompt-opinion-e2e/runs/20260507T-direct-mcp-browser-proof/notes/final-live-proof-status.md
po-community-mcp-main/scripts/run-live-a2a-po-proof.sh
po-community-mcp-main/scripts/start-public-path-proxy-local.sh
po-community-mcp-main/scripts/stop-public-path-proxy-local.sh
po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
po-community-mcp-main/external-a2a-orchestrator-typescript/index.ts
po-community-mcp-main/external-a2a-orchestrator-typescript/agent-card.ts
```

Important current facts from repo:

- A2A response shape has been fixed to JSON-RPC `result.task`.
- Public protocol POST has passed.
- Public path proxy has been added.
- Public endpoint readiness has passed previously.
- A2A browser proof still failed because Prompt Opinion did not surface the completed clinical payload reliably.
- Latest browser proof showed:
  - Prompt Opinion selected A2A,
  - runtime POST observed,
  - 2xx observed,
  - both MCPs hit,
  - visible clinical payload false.

This means the next investigation is **UI/rendering/wire payload**, not basic backend viability.

---

## Setup for Codex macOS Computer Use

Before launching the agent:

1. Open the macOS Codex app.
2. Enable Computer Use permissions:
   - Screen Recording
   - Accessibility
   - permission to control Chrome or Safari
3. Open Chrome or Safari manually.
4. Confirm you are signed in to Prompt Opinion:
   - `https://app.promptopinion.ai/`
5. Keep only the necessary windows open if possible:
   - terminal
   - Chrome/Safari with Prompt Opinion
   - maybe Finder for screenshots
6. Do not open unrelated sensitive tabs.
7. If Prompt Opinion is not logged in, log in manually before allowing the agent to proceed.
8. If a CAPTCHA/2FA/manual approval appears, the agent must stop and ask operator assistance rather than guessing.

Recommended real browser:

```text
Chrome
```

Fallback:

```text
Safari
```

Do not use Codex in-app Browser for this.

---

## Evidence Folder

Use a run id:

```bash
RUN_ID=20260507T-computer-use-a2a-proof
RUN_DIR="output/prompt-opinion-e2e/runs/$RUN_ID"
mkdir -p "$RUN_DIR/reports" "$RUN_DIR/logs" "$RUN_DIR/notes" "$RUN_DIR/screenshots" "$RUN_DIR/wire"
```

All evidence from this Computer Use run must go into that folder.

Required final files:

```text
$RUN_DIR/reports/computer-use-preflight-summary.md
$RUN_DIR/reports/public-a2a-protocol-response.json
$RUN_DIR/reports/public-a2a-response-shape.json
$RUN_DIR/notes/computer-use-a2a-proof-notes.md
$RUN_DIR/notes/final-computer-use-proof-status.md
$RUN_DIR/wire/*
$RUN_DIR/screenshots/*
```

If screenshots are captured manually by macOS, move them into:

```text
$RUN_DIR/screenshots/
```

---

## Phase 1 — Backend Preflight

Run this in terminal, not in browser:

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

Expected:

- provider is `google`
- model is `gemma-4-31b-it`
- key present
- local DGK ready
- local CI ready
- local A2A ready
- path proxy ready

If anything fails here, fix local/runtime setup only.

Do not open Prompt Opinion until this passes.

---

## Phase 2 — Public Endpoint Preflight

Public host:

```text
https://underpaid-passion-unloaded.ngrok-free.dev
```

Run:

```bash
curl -sS -o "$RUN_DIR/reports/public-dgk-readyz.json" -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/dgk/readyz
curl -sS -o "$RUN_DIR/reports/public-ci-readyz.json" -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/ci/readyz
curl -sS -o "$RUN_DIR/reports/public-a2a-readyz.json" -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/readyz
curl -sS -o "$RUN_DIR/reports/public-a2a-agent-card.json" -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/.well-known/agent-card.json
curl -sS -o "$RUN_DIR/reports/public-a2a-tasks.json" -w "%{http_code}\n" https://underpaid-passion-unloaded.ngrok-free.dev/tasks
```

All must be HTTP 200.

If any public endpoint is not 200:

- do not use Computer Use yet,
- fix path proxy/ngrok,
- document exact failing endpoint/status/body preview.

---

## Phase 3 — Public A2A Protocol Proof

Run:

```bash
curl -sS \
  -H 'content-type: application/json' \
  -H 'x-request-id: computer-use-public-a2a-proof' \
  -H 'x-correlation-id: computer-use-public-a2a-proof-corr' \
  -d '{"id":"computer-use-public-a2a-proof","message":{"role":"ROLE_USER","parts":[{"text":"Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?"}]}}' \
  https://underpaid-passion-unloaded.ngrok-free.dev/message:send/v1/message:send \
  > "$RUN_DIR/reports/public-a2a-protocol-response.json"
```

Analyze:

```bash
node - "$RUN_DIR/reports/public-a2a-protocol-response.json" "$RUN_DIR/reports/public-a2a-response-shape.json" <<'NODE'
const fs = require("fs");
const input = process.argv[2];
const output = process.argv[3];
const raw = fs.readFileSync(input, "utf8");
const p = JSON.parse(raw);
const text = JSON.stringify(p);
const task = p?.result?.task || p?.task;
const statusParts = Array.isArray(task?.status?.message?.parts) ? task.status.message.parts : [];
const artifactParts = Array.isArray(task?.artifacts)
  ? task.artifacts.flatMap((a) => Array.isArray(a?.parts) ? a.parts : [])
  : [];
const textParts = [...statusParts, ...artifactParts]
  .map((part) => part?.text)
  .filter((value) => typeof value === "string" && value.trim());
const shape = {
  bytes_total: Buffer.byteLength(raw, "utf8"),
  has_jsonrpc_2: p?.jsonrpc === "2.0",
  has_result_task: Boolean(p?.result?.task),
  has_top_level_task: Boolean(p?.task),
  task_id: task?.id || null,
  contextId: task?.contextId || null,
  status_state: task?.status?.state || null,
  text_part_count: textParts.length,
  visible_text_preview: textParts.join("\n").slice(0, 3000),
  includes_not_ready: text.includes("not_ready"),
  includes_ready_baseline: text.includes("Structured baseline: ready"),
  includes_hidden_risk_present: text.includes("hidden_risk_present"),
  includes_nursing_anchor: text.includes("Nursing Note 2026-04-18 20:40"),
  includes_case_management_anchor: text.includes("Case Management Addendum 2026-04-18 20:55"),
};
fs.writeFileSync(output, JSON.stringify(shape, null, 2) + "\n");
console.log(JSON.stringify(shape, null, 2));
if (!shape.has_result_task) throw new Error("missing result.task");
if (shape.status_state !== "TASK_STATE_COMPLETED") throw new Error("task not completed");
if (!shape.includes_not_ready) throw new Error("missing not_ready");
if (!shape.includes_nursing_anchor) throw new Error("missing nursing anchor");
if (!shape.includes_case_management_anchor) throw new Error("missing case-management anchor");
NODE
```

If this fails, fix A2A protocol/payload before using browser.

If response is > 15 KB, slim response before using browser.

---

## Phase 4 — Wire Capture Setup

The final Computer Use browser pass must have wire/log correlation.

Ensure the path proxy can capture wire bodies.

If current `start-public-path-proxy-local.sh` does not support wire capture, patch it to support:

```bash
PATH_PROXY_CAPTURE_BODIES=1
PATH_PROXY_WIRE_CAPTURE_DIR="$RUN_DIR/wire"
```

Requirements:

- Capture A2A request/response for `/message:send`, `/rpc`, and `/tasks`.
- Redact sensitive headers:
  - cookie
  - authorization
  - set-cookie
  - x-csrf-token
  - any bearer/token values
- Store:
  - timestamp
  - path
  - method
  - status code
  - request body preview
  - response body preview
  - request/response byte counts
- Do not store Prompt Opinion password or full cookies.

Restart path proxy with capture enabled:

```bash
./po-community-mcp-main/scripts/stop-public-path-proxy-local.sh || true

PATH_PROXY_CAPTURE_BODIES=1 \
PATH_PROXY_WIRE_CAPTURE_DIR="$RUN_DIR/wire" \
./po-community-mcp-main/scripts/start-public-path-proxy-local.sh
```

Then rerun public protocol proof and confirm wire files are created.

---

## Phase 5 — Computer Use A2A Browser Proof

Use Computer Use to control real Chrome/Safari.

Computer Use steps:

1. Bring Chrome/Safari to foreground.
2. Open:
   ```text
   https://app.promptopinion.ai/
   ```
3. Verify already signed in.
4. Navigate to the correct workspace.
5. Verify external A2A agent is connected/available.
6. Select the external A2A agent in the chat dropdown if required.
7. Use this prompt exactly:

   ```text
   Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?
   ```

8. Submit.
9. Watch the UI for the entire response.
10. Do not rely on final screenshot only.
11. Record whether any transient banner appears:
    - `The LLM took too long to respond`
    - `operation was cancelled`
    - `Error from Google Gemini`
    - `did not respond with a task`
    - `external agent did not respond`
12. If response appears, select/copy the full visible assistant text and save it to:
    ```text
    $RUN_DIR/screenshots/computer-use-a2a-visible-transcript.txt
    ```
13. Take screenshots and save them to:
    ```text
    $RUN_DIR/screenshots/
    ```
14. If error appears, capture it immediately and save text/screenshot.

Success visible text must include:

```text
not_ready
Structured baseline: ready
hidden_risk_present or hidden risk present
Nursing Note 2026-04-18 20:40
Case Management Addendum 2026-04-18 20:55
```

If the response says `ready_with_caveats`, `ready`, or generic fallback answer, classify as clinical/rendering failure.

If the UI says timeout/cancelled before runtime POST, classify as PO platform pre-route failure.

If the UI says timeout/cancelled after runtime POST and wire response was valid, classify as PO platform rendering/synthesis failure.

---

## Phase 6 — Runtime and Wire Correlation After Browser Pass

Immediately after Computer Use browser proof, run:

```bash
grep -R "message:send\|result.task\|Final verdict\|not_ready\|LLM took too long\|operation was cancelled\|Error from Google Gemini\|did not respond with a task" "$RUN_DIR" || true

tail -200 po-community-mcp-main/.runtime/path-proxy/path-proxy.log > "$RUN_DIR/logs/path-proxy-tail.log" || true
tail -200 po-community-mcp-main/.pids/external-a2a.log > "$RUN_DIR/logs/external-a2a-tail.log" || true
tail -200 po-community-mcp-main/.runtime/two-mcp/discharge-gatekeeper.log > "$RUN_DIR/logs/dgk-tail.log" || true
tail -200 po-community-mcp-main/.runtime/two-mcp/clinical-intelligence.log > "$RUN_DIR/logs/ci-tail.log" || true
```

Then create:

```text
$RUN_DIR/notes/computer-use-a2a-proof-notes.md
```

It must answer:

1. Did Computer Use use Chrome or Safari?
2. Was user already signed in?
3. Was external A2A agent selected?
4. Did PO make a runtime POST?
5. Which exact endpoint did PO hit?
6. Did runtime return HTTP 200?
7. Did response contain `result.task`?
8. Did both MCPs hit?
9. Did visible browser text contain `not_ready`?
10. Did an error banner appear?
11. Did failure happen before or after runtime response?
12. Is the remaining cause repo-controlled or platform/UI-controlled?

---

## Phase 7 — Decision Tree

### Case A — A2A Computer Use green

If visible browser transcript contains the expected clinical payload:

- Mark A2A browser proof GREEN.
- Commit evidence and docs.
- Do not touch A2A again.
- Proceed to Direct-MCP proof only once.

### Case B — PO received valid task but did not render it

If wire capture proves:

- PO hit our runtime,
- endpoint was `/message:send` or `/message:send/v1/message:send`,
- runtime returned HTTP 200,
- response had `result.task`,
- task was completed,
- task text contained `not_ready` and anchors,
- both MCPs hit,

but browser did not render the clinical payload or timed out:

- Mark A2A runtime/protocol GREEN.
- Mark PO browser proof PLATFORM-BLOCKED AFTER VALID TASK.
- Do not keep rewriting backend.
- Create platform-blocked evidence doc:
  ```text
  docs/phase8-6-computer-use-platform-blocked-proof.md
  ```

### Case C — Runtime response missing expected content

If public wire response lacks `not_ready`, anchors, or `result.task`:

- Fix A2A runtime/payload.
- Rerun public protocol proof.
- Only then rerun Computer Use browser proof.

### Case D — No runtime POST from PO

If public endpoints are green but Computer Use browser proof creates no runtime POST:

- Check external A2A selection manually.
- Check Prompt Opinion registration points to the current public hostname.
- Update registration manually via real browser if stale.
- Try exactly once more.
- If still no runtime POST, classify as PO chat routing/platform issue.

---

## Phase 8 — Direct-MCP Proof, Only After A2A

Only run Direct-MCP if either:

- A2A Computer Use is green, or
- A2A is conclusively platform-blocked after valid completed task.

Direct should use Computer Use as well, not Playwright.

Procedure:

1. Use real Chrome/Safari.
2. Open the Direct/BYO agent in Prompt Opinion.
3. Send prompt 1:
   ```text
   Is this patient safe to discharge today?
   ```
4. Copy visible transcript to:
   ```text
   $RUN_DIR/screenshots/computer-use-direct-p1-visible-transcript.txt
   ```
5. Prompt 1 must include:
   - structured baseline ready
   - final not_ready
   - hidden-risk status
   - evidence anchors
6. Send prompt 2:
   ```text
   What hidden risk changed that answer? Show me the contradiction and the evidence.
   ```
7. Send prompt 3:
   ```text
   What exactly must happen before discharge, and prepare the transition package.
   ```
8. If Prompt Opinion times out, do not loop. Mark Direct as secondary/yellow.

---

## Phase 9 — Combined Proof

Only run combined proof if:

- A2A Computer Use green,
- Direct Computer Use green.

If either is not green, do not burn time on combined proof.

---

## Phase 10 — Validation Before Commit

Run:

```bash
git diff --check
bash -n po-community-mcp-main/scripts/start-public-path-proxy-local.sh
bash -n po-community-mcp-main/scripts/stop-public-path-proxy-local.sh
bash -n po-community-mcp-main/scripts/run-live-a2a-po-proof.sh
bash -n po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-compatibility
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:release-gate
```

No-secret guard:

```bash
git restore --staged .env.local 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git diff --cached --name-only | grep -E '\.env|phase8.env' && echo "STOP: secret file staged" && exit 1 || echo "OK: no env secret staged"
git check-ignore -v .env.local || true
```

---

## Phase 11 — Final Commit

If you changed scripts/runtime:

```bash
git add po-community-mcp-main/scripts po-community-mcp-main/external-a2a-orchestrator-typescript docs output/prompt-opinion-e2e/runs/*/notes
git restore --staged .env.local 2>/dev/null || true
git diff --cached --name-only | grep -E '\.env|phase8.env' && echo "STOP: secret file staged" && exit 1 || true
git commit -m "fix: switch prompt opinion proof to computer use workflow"
```

If only docs/evidence changed:

```bash
git add docs output/prompt-opinion-e2e/runs/*/notes
git restore --staged .env.local 2>/dev/null || true
git diff --cached --name-only | grep -E '\.env|phase8.env' && echo "STOP: secret file staged" && exit 1 || true
git commit -m "docs: record computer use prompt opinion proof"
```

---

## Final Report Format

Final report must be:

```text
## Final status

A2A local runtime:
A2A public protocol:
A2A Computer Use browser:
Direct Computer Use browser:
Combined proof:

## Root cause

Exact root cause. No vibes.

## What changed

- ...

## Commands run

- ...

## Evidence paths

- ...

## Computer Use evidence

Browser used:
Already signed in:
External A2A selected:
Runtime POST observed:
Endpoint hit:
HTTP status:
Has result.task:
Visible transcript status:
Error banner observed:
Failure timing:

## Wire capture summary

Request path:
Response bytes:
Has result.task:
Has task text:
Both MCPs hit:

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
| Computer Use selected external A2A | ... | ... |
| Runtime POST | ... | ... |
| Visible clinical payload | ... | ... |

## Open risks

- ...

## Exact next action

One sentence.
```

---

## Tiny Launcher Prompt

Use this prompt in Codex macOS app with Computer Use enabled:

```text
Read PHASE86_COMPUTER_USE_PO_RECOVERY_EXECPLAN.md completely. Execute it end-to-end from /Users/arshdeepsingh/Developer/ctc-phase8-6-integration on branch int/phase8.6-real-green or child branch fix/phase8.6-computer-use-po-proof. Replace Playwright as the final live UI proof with macOS Computer Use controlling my real Chrome or Safari session. Keep scripts for backend preflight, public protocol POST, and wire capture. Do not use the in-app browser. Do not stop at the first UI failure: classify whether the failure is before runtime POST, after valid result.task, or visible rendering. Fix anything under repo control; if Prompt Opinion fails after receiving a compact valid completed A2A task with not_ready and both MCP hits, record platform-blocked proof and stop. Follow every validation, no-secret, commit, and final-report requirement in the file.
```
