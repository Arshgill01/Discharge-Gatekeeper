# Care Transitions Command Prompt Opinion Integration Runbook

This runbook is the operator scaffold for the locked Phase 0 architecture:
`Discharge Gatekeeper MCP` + `Clinical Intelligence MCP` + `external A2A orchestrator`.

If you want the exact manual verification order for re-checking what is already configured in your Prompt Opinion account, use [`docs/prompt-opinion-complete-verification-guide.md`](prompt-opinion-complete-verification-guide.md) first.

Use this document to separate what must be registered, what may be published, and what the demo should do when a layer fails.

Phase 8.5 operating stance:
- primary judged live lane: direct-MCP fallback (separate Prompt Opinion calls to both MCPs)
- architecture proof lane: A2A-main (`external A2A orchestrator`) as a one-turn assembled proof
- promotion rule: use A2A-main as the judged live lane only when the current run folder marks both `A2A-main` and `Direct-MCP fallback` as `green`; otherwise run fallback if it is `green`

Phase 8.5 route-boundary note:
- the stable A2A proof target is one assembled Prompt Opinion turn, not the full 3-prompt judged flow
- Direct-MCP remains the primary judged 3-prompt path unless a current run folder proves otherwise
- treat one-turn A2A proof as architecture evidence: selected external agent, Prompt Opinion POST, runtime acceptance, both MCP hits, and visible assembled answer
- local green checks are not the same as a Google/Gemini-backed Clinical Intelligence proof when `CLINICAL_INTELLIGENCE_LLM_PROVIDER` is unset; the local boot scripts default to the heuristic provider
- a Phase 9 promotion run must explicitly set `CLINICAL_INTELLIGENCE_LLM_PROVIDER=google` with `GOOGLE_API_KEY` or `GEMINI_API_KEY`, or the run folder must mark the Google-backed path as not proven
- 2026-04-30 authenticated Prompt Opinion run status: registration and routing were green, A2A variants B/C reached the external runtime and both MCPs, but the A2A clinical answer remained downgraded because prompt-only A2A requests did not include or hydrate the canonical narrative evidence bundle. Direct-MCP Prompt 2 and Prompt 3 were green on retry, while Prompt 1 remained yellow because it returned only the structured `ready` baseline. Current Phase 9 call remains NO-GO until those two repo-side issues are fixed and rerun.
- Prompt Opinion latency control: avoid allowing the conversation to grow into 400k+ input-token turns before Prompt 3. Prefer compact tool responses, concise transition-package output, and a fresh run-folder retry after any context-size change. A longer harness timeout can prevent false-negative capture, but it cannot prevent Prompt Opinion's own LLM timeout.

## 1. Registration surfaces

### Surface A: `Discharge Gatekeeper MCP`
Role:
- deterministic discharge-readiness spine

Must expose:
- MCP endpoint
- health endpoint
- stable tool metadata
- structured output contract for discharge readiness and next steps

### Surface B: `Clinical Intelligence MCP`
Role:
- hidden-risk, contradiction, and narrative-only signal detection

Must expose:
- MCP endpoint
- health endpoint
- stable tool metadata
- hidden-risk JSON contract with citations
- compact reconciled Prompt 1 contract that preserves DGK structured baseline and returns final hidden-risk posture

### Surface C: `external A2A orchestrator`
Role:
- synchronous orchestration layer that calls both MCPs and applies the decision matrix

Must expose:
- agent registration/discovery surface (`/.well-known/agent-card.json`)
- health endpoint
- synchronous request/response invocation path (`POST /tasks`, `GET /tasks/:taskId`, `GET /tasks`)
- explicit no-streaming behavior

## 2. Common prerequisites
- Prompt Opinion workspace access with permission to register external tools/agents
- authenticated Prompt Opinion browser session at `https://app.promptopinion.ai/`
- one reachable public URL per component being registered
- one trap-patient bundle available for demo fallback
- one operator note that maps each public URL to the correct identity
- local two-MCP boot path prepared via [`docs/phase2-two-mcp-operator-runbook.md`](phase2-two-mcp-operator-runbook.md)
- Node.js 20+ with dependencies installed via `npm ci` in:
  - `po-community-mcp-main/typescript`
  - `po-community-mcp-main/clinical-intelligence-typescript`
  - `po-community-mcp-main/external-a2a-orchestrator-typescript`

### Shared env setup for every worktree
Ignored `.env.local` files do not follow parallel worktrees. Before booting any runtime in a fresh worktree, link the shared env file:

```bash
./po-community-mcp-main/scripts/link-shared-env.sh
./po-community-mcp-main/scripts/check-runtime-provider-config.sh
```

`link-shared-env.sh` reads `CTC_SHARED_ENV_PATH`, defaulting to `~/.config/care-transitions-command/phase8.env`, and creates `.env.local` as a symlink. It prints only key presence/absence and never secret values.

Provider status rules:
- `GREEN`: `CLINICAL_INTELLIGENCE_LLM_PROVIDER=google` and `GOOGLE_API_KEY` or `GEMINI_API_KEY` is present.
- `YELLOW`: heuristic mode; acceptable only for deterministic local regression and release-gate stability.
- `RED`: Google provider requested without a Google/Gemini key; do not continue to Google/Gemini proof.
- default model: `gemma-4-31B-it` unless `CLINICAL_INTELLIGENCE_GOOGLE_MODEL` is explicitly set.

For browser proof that claims Google/Gemini, run:

```bash
PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER=1 ./po-community-mcp-main/scripts/run-prompt-opinion-browser-proof.sh
```

No report may claim Google/Gemini backing when provider evidence says `heuristic`.

Before registration, verify for every component:
- identity string matches the frozen name
- health check passes
- logs show requests clearly enough to debug discovery failures
- Clinical Intelligence logs/config identify whether hidden-risk output came from `google` or `heuristic`; do not use heuristic output as evidence for the real Google-backed path

Observed browser gate from the Phase 4 validation pass:
- an unauthenticated browser reaches `https://app.promptopinion.ai/` but stops at the login screen
- do not claim Prompt Opinion registration validation unless the workspace UI itself was reached after login

### Validated local boot order

Run this from repo root before any Prompt Opinion registration work:

1. `./po-community-mcp-main/scripts/run-full-system-validation.sh`
2. `./po-community-mcp-main/scripts/start-two-mcp-local.sh`
3. `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
4. `./po-community-mcp-main/scripts/start-a2a-local.sh`
5. `./po-community-mcp-main/scripts/check-a2a-readiness.sh`

### Rehearsal artifact capture (required)
Use the capture wrapper for reproducible local evidence bundles:

1. `./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh`
2. open `output/prompt-opinion-e2e/latest/reports/status-summary.md`
3. complete:
   - `output/prompt-opinion-e2e/latest/notes/validation-notes.md`
   - `output/prompt-opinion-e2e/latest/notes/experiment-matrix.md`
   - `output/prompt-opinion-e2e/latest/notes/request-id-correlation.md`
   - `output/prompt-opinion-e2e/latest/notes/workspace-evidence.md`
4. add Prompt Opinion screenshots into `output/prompt-opinion-e2e/latest/screenshots/`
5. update `output/prompt-opinion-e2e/latest/reports/status-summary.md` after the manual lane verdict is final

Artifact bundle contract:
- one run per folder: `output/prompt-opinion-e2e/runs/<run-id>/`
- command logs in `logs/`
- machine-readable command results in `reports/command-results.json`
- local automated status board in `reports/status-summary.md`
- local A2A request/task correlation in `reports/request-id-correlation.md`
- raw per-prompt local outputs in `raw/`
- workspace attempt matrix in `notes/experiment-matrix.md`
- workspace request/task correlation in `notes/request-id-correlation.md`
- final lane write-up in `notes/validation-notes.md`
- A2A route-lock matrix in `reports/a2a-route-lock-matrix.json`
- A2A runtime correlation summary in `reports/a2a-runtime-correlation-summary.json`
- downstream MCP hit summary in `reports/a2a-downstream-mcp-hit-summary.json`
- final one-turn lane status in `reports/a2a-one-turn-status.json`
- dependency bootstrap via `npm ci` runs automatically for all three runtimes unless `PROMPT_OPINION_SKIP_NPM_CI=1` is set
- supplemental browser retries may be kept in their own run folders, but they must not replace the latest full run unless they exercised all required lanes. If a direct-only retry is used to investigate latency, record it as supplemental evidence and keep the full A2A plus Direct-MCP run as the Phase 8.5 source of truth.

Run-folder operator workflow:
1. use `reports/status-summary.md` to confirm the local prerequisite lane is still green
2. use `reports/request-id-correlation.md` to anchor the local A2A request/task IDs before any workspace attempt
3. record every workspace attempt in `notes/experiment-matrix.md`
4. record every A2A request/task correlation clue, or the exact absence of a runtime hit, in `notes/request-id-correlation.md`
5. update `notes/workspace-evidence.md` with screenshots, registrations, and prompt outcomes
6. write the final lane decision in `notes/validation-notes.md` and mirror it into `reports/status-summary.md`

Status color contract:
- `green`: the current run folder proves the lane end-to-end and the lane is eligible to be primary
- `yellow`: proof is partial or missing a required artifact; the lane cannot be primary
- `red`: a blocking defect, failed required validation, or missing required evidence makes the lane unusable

Local port map:
- `Discharge Gatekeeper MCP`: `http://127.0.0.1:5055/mcp`
- `Clinical Intelligence MCP`: `http://127.0.0.1:5056/mcp`
- `external A2A orchestrator`: `http://127.0.0.1:5057`

Local readiness map:
- `http://127.0.0.1:5055/readyz`
- `http://127.0.0.1:5056/readyz`
- `http://127.0.0.1:5057/readyz`
- `http://127.0.0.1:5057/.well-known/agent-card.json`

Do not run the lifecycle wrappers in parallel:
- `smoke-two-mcp-integration.sh`
- `smoke-a2a-orchestration.sh`
- `run-full-system-validation.sh`

They start and stop shared local runtimes as part of their own cleanup.

## 3. Register `Discharge Gatekeeper MCP`

### Registration checklist
1. add a new MCP server connection in Prompt Opinion
2. set the display name to `Discharge Gatekeeper MCP`
3. point the URL to the public MCP endpoint for the deterministic server
4. save and run connection/discovery
5. confirm the expected structured discharge tools are discoverable

### Discovery pass criteria
- Prompt Opinion shows the MCP as reachable
- tool metadata clearly maps to structured discharge work
- no hidden-risk-only tool descriptions appear on this surface
- a smoke invocation returns parseable structured JSON

### Failure handling
- if discovery fails, do not continue to A2A registration
- fix the deterministic MCP first because the rest of the system depends on it

## 4. Register `Clinical Intelligence MCP`

### Registration checklist
1. add a second MCP server connection in Prompt Opinion
2. set the display name to `Clinical Intelligence MCP`
3. point the URL to the public MCP endpoint for the hidden-risk server
4. save and run connection/discovery
5. confirm the hidden-risk tool surface is separate from the deterministic MCP surface

### Discovery pass criteria
- Prompt Opinion shows the MCP as reachable
- tool metadata clearly maps to hidden-risk and contradiction review
- discovery does not duplicate the deterministic discharge tools
- discovery includes `assess_reconciled_discharge_readiness` for compact Prompt 1 Direct-MCP reconciliation
- a smoke invocation returns the hidden-risk JSON schema with citations
- trap-patient smoke returns `hidden_risk_present` with contradiction-note citations
- control smoke returns explicit `no_hidden_risk` with no fabricated escalation

### Pre-registration local checks (required)
Run from `po-community-mcp-main/clinical-intelligence-typescript`:
1. `npm run smoke:hidden-risk`
2. `npm run smoke:narrative`
3. `npm run smoke:release-gate`

Do not register in Prompt Opinion until these checks are green in the current branch/runtime.

### Failure handling
- if this MCP fails, the direct deterministic path must still remain available
- log the failure as `clinical_intelligence_unavailable` for demo-day decision making
- if the LLM provider is unavailable, timeout-bound, or unparseable, require a structured `status=error` MCP response with no hidden-risk findings and preserve the deterministic posture

## 4.5 Phase 2 direct two-MCP path (required before A2A)

Run this phase gate before enabling any orchestrator path.
In Phase 2, this path is sufficient for demo-readiness; A2A is preferred architecture but not required to prove the hidden-risk contradiction story.

### Boot + registration sequence
1. boot both MCPs using `./po-community-mcp-main/scripts/start-two-mcp-local.sh`
2. expose each MCP with a separate public URL
3. register `Discharge Gatekeeper MCP` and `Clinical Intelligence MCP` in Prompt Opinion
4. run `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
5. verify both are reachable and tool discovery is clean on both surfaces

### Prompt Opinion manual call sequence
1. Prompt 1 goes to `Discharge Gatekeeper MCP` for the deterministic baseline verdict
2. Prompt 2 goes to `Clinical Intelligence MCP` for hidden-risk contradiction review with citations
3. Prompt 3 goes to `Clinical Intelligence MCP` via `synthesize_transition_narrative` for the fallback transition package grounded in the hidden-risk findings

### Pass criteria
- both MCPs are discoverable in the same Prompt Opinion workspace
- tool surfaces stay separated by role (deterministic vs hidden-risk)
- trap-patient path shows baseline `ready` posture before hidden-risk review
- hidden-risk review shows cited contradiction and disposition impact `not_ready`
- fallback Prompt 3 returns a usable transition package even when deterministic `generate_transition_plan` stays empty on a structured `ready` baseline
- trap contradiction remains note-dependent (removing contradiction notes prevents escalation)
- clean control path remains explicit `no_hidden_risk` with no fabricated escalation

### Required quality checks in this phase
Run from repo root:
1. `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
2. `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
3. `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`

Quality expectations these checks enforce:
- trap-patient contradiction is measurable end-to-end
- no-risk control case stays bounded
- citation traceability and parseability remain inspectable
- deterministic fallback behavior survives Clinical Intelligence `status=error`

### Required fallback behavior in this phase
- if `Clinical Intelligence MCP` returns `status=error`, treat it as `clinical_intelligence_unavailable`
- keep the deterministic verdict and next steps
- disclose hidden-risk review as unavailable
- do not fabricate narrative escalation

## 5. Register `external A2A orchestrator`

Register the A2A layer only after both MCPs are independently reachable.

### Canonical external A2A paths (implementation-grounded)
- runtime entrypoint: `po-community-mcp-main/external-a2a-orchestrator-typescript/index.ts`
- agent card builder: `po-community-mcp-main/external-a2a-orchestrator-typescript/agent-card.ts`
- task input/output schema: `po-community-mcp-main/external-a2a-orchestrator-typescript/types.ts`
- local readiness script: `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- local end-to-end smoke: `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

### Required orchestrator behavior before registration
- synchronous request/response only
- explicit non-streaming agent-card/task-lifecycle surface
- knows the base URLs or registry IDs for both MCPs
- applies the matrix in [phase0-orchestrator-decision-matrix.md](phase0-orchestrator-decision-matrix.md)
- returns a single final response suitable for the 3-prompt demo

### Required env/config assumptions
The A2A runtime assumes these environment variables (see `external-a2a-orchestrator-typescript/.env.example`):
- `DISCHARGE_GATEKEEPER_MCP_URL`
- `CLINICAL_INTELLIGENCE_MCP_URL`
- `PORT` (default `5057`)
- `PO_ENV` (`local|dev|prod`)
- `ALLOWED_HOSTS`
- `DEFAULT_STRUCTURED_SCENARIO_ID`
- `A2A_TASK_TIMEOUT_MS`

### Registration checklist
1. add the external agent integration in Prompt Opinion
2. set the display name to `external A2A orchestrator`
3. provide the public base URL for the A2A runtime and ensure Prompt Opinion can resolve:
   - discovery: `/.well-known/agent-card.json`
   - readiness: `/readyz`
   - task invocation: `/tasks`
4. validate that the orchestrator can reach both MCPs from its runtime environment
5. run one end-to-end prompt from Prompt Opinion through the A2A layer

### Pass criteria
- Prompt Opinion reaches the A2A layer directly
- the A2A layer reaches both MCPs
- the final response includes:
  - final verdict
  - deterministic blocker linkage
  - hidden-risk status
  - citations
  - next steps
- response returns as one synchronous payload

### Pre-registration local checks (required)
Run from repo root:
1. `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:runtime`
2. `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
3. `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`

Do not register A2A in Prompt Opinion until these checks are green.

### Post-registration checks (required)
1. Prompt 1 (`Is this patient safe to discharge today?`) returns one reconciled payload with baseline deterministic posture and final verdict.
2. Prompt 2 contradiction follow-up returns cited narrative contradiction evidence.
3. Prompt 3 transition-package follow-up returns prioritized actionable next steps.
4. clean control check returns bounded `no_hidden_risk` behavior.
5. Prompt Opinion workspace is already authenticated before rehearsal starts; login is not a live-demo step.

### Failure handling
- if A2A registration or invocation fails, stop using it for the judge path
- switch the workspace to the fallback direct-MCP path
- do not attempt live debugging on camera

If agent card discovery fails:
1. verify `GET /.well-known/agent-card.json` returns `schema_version=a2a_card_v1`
2. verify `agent_identity.name=external A2A orchestrator`
3. verify `task_lifecycle.streaming=false` and endpoints include `/tasks`
4. rerun `./po-community-mcp-main/scripts/check-a2a-readiness.sh`

If task invocation fails:
1. verify `POST /tasks` succeeds locally with trap fixture via `smoke:orchestrator`
2. verify runtime can reach both MCP URLs from its environment
3. if unresolved before demo window, cut to direct two-MCP fallback

## 6. Preferred demo path
Architecture proof demo:
1. Prompt Opinion invokes `external A2A orchestrator`
2. orchestrator calls `Discharge Gatekeeper MCP`
3. orchestrator calls `Clinical Intelligence MCP`
4. orchestrator returns one reconciled response

Use this path only if all three components passed a clean-session rehearsal the same day.
Use this path only if the current run folder also marks both `A2A-main` and `Direct-MCP fallback` as `green`.
Otherwise keep it as architecture proof only and run the judged 3-prompt story through the direct-MCP lane.

### A2A-main operator quick-check
Before going live:
1. run `./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh`
2. confirm all automated checks are `GREEN` in `output/prompt-opinion-e2e/latest/reports/status-summary.md`
3. confirm trap Prompt 2 still shows contradiction evidence anchors (not transition-package action-list output)
4. confirm `output/prompt-opinion-e2e/latest/reports/request-id-correlation.md` shows the expected local request/task propagation
5. update:
   - `output/prompt-opinion-e2e/latest/notes/experiment-matrix.md`
   - `output/prompt-opinion-e2e/latest/notes/request-id-correlation.md`
   - `output/prompt-opinion-e2e/latest/notes/workspace-evidence.md`
6. promote A2A-main only if the current run folder records:
   - `A2A-main lane: green`
   - `Direct-MCP fallback lane: green`
7. if A2A-main is not green, the request-id correlation note must say whether the blocker was:
   - `registration_only`
   - `chat_path_not_routed`
   - `runtime_hit_but_no_transcript`
   - `runtime_hit_but_downstream_failure`

## 7. Fallback direct-MCP demo path

This is the required backup path.
For Phase 3, keep this path rehearsal-ready in case A2A discovery/task invocation regresses.

### Setup
- keep both MCPs registered even when using the A2A path
- use a BYO agent, not `General Chat Agent`, because the default workspace agent does not automatically expose newly registered MCP tools
- prepare one Prompt Opinion workspace view where both MCP tool surfaces are available
- prepare the trap-patient bundle or deterministic synthetic context
- keep the workspace logged in before starting the rehearsal or recording

### BYO agent configuration path
1. open `Agents -> BYO Agents`
2. create or edit `Care Transitions Command BYO Fallback`
3. bind only:
   - `Discharge Gatekeeper MCP`
   - `Clinical Intelligence MCP`
4. disable embedded/community tools so the demo stays on the direct-MCP lane
5. use a system prompt that locks:
   - Prompt 1 -> `assess_discharge_readiness`
   - Prompt 2 -> `surface_hidden_risks`
   - Prompt 3 -> `synthesize_transition_narrative`
   - structured `scenario_id=third_synthetic_discharge_slice_ready_v1`

### Execution
1. use `Discharge Gatekeeper MCP` for the baseline verdict
2. use `Clinical Intelligence MCP` for the hidden-risk/contradiction follow-up
3. use `Clinical Intelligence MCP.synthesize_transition_narrative` for the discharge-action prompt

### Acceptable fallback story
- Prompt 1: deterministic readiness answer
- Prompt 2: hidden-risk review with citations
- Prompt 3: final transition package from `synthesize_transition_narrative`, grounded in the hidden-risk findings and proposed disposition

What must be shown on screen in fallback mode:
- Prompt 1: baseline structured posture and final manual two-MCP interpretation
- Prompt 2: contradiction summary plus citation anchors
- Prompt 3: prioritized transition actions with blocker linkage

### Fallback quality checks (required)
Run before recording/live demo when fallback is active:
1. `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
2. `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`
3. `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal`

Expected fallback behavior:
- trap path escalates from structured `ready` to final `not_ready` with citation-backed contradiction
- no-risk control path remains explicit `no_hidden_risk` with no fabricated escalation
- inconclusive/unavailable hidden-risk paths stay bounded and explicitly manual-review aligned

### Rules
- do not improvise a fourth step
- do not claim the fallback path is the final architecture
- do state that the system architecture remains `2 MCPs + 1 external A2A`
- rehearse this path in the same session window as the preferred A2A rehearsal

### Real workspace status as of 2026-04-21
- Prompt 1 is visibly proven in a real BYO agent and returns the correct structured `ready` baseline.
- Prompt Opinion accepts both MCP registrations and now accepts the external A2A connection after the runtime card fix.
- Single-tool `Clinical Intelligence MCP` BYO agents can complete Prompt 2 and tool-explicit Prompt 3 in the real workspace.
- A single BYO agent bound to both MCP servers still does not reliably complete Prompt 2/3 into a final assistant transcript artifact.
- The registered external A2A connection is not yet proven to execute from the Prompt Opinion chat path.
- Until those gaps are fixed, do not claim the original one-agent dual-MCP fallback or the A2A chat path are fully demo-ready inside Prompt Opinion.

## 8. Marketplace and publish implications

### Publish baseline
- publish the two MCPs as first-class assets if marketplace timing is tight
- keep names exactly:
  - `Discharge Gatekeeper MCP`
  - `Clinical Intelligence MCP`

### Orchestrator publishing
- treat `external A2A orchestrator` as a distinct surface with explicit dependencies
- if the event workflow does not support publishing the A2A layer cleanly, document it in submission materials instead of forcing an unstable publish path

### Listing guidance
- deterministic MCP listing should emphasize structured discharge readiness
- intelligence MCP listing should emphasize hidden-risk detection with citations
- top-level narration and deck copy should use `Care Transitions Command`

## 9. Operator go/no-go decision

Use the preferred A2A path only when all are true:
- `Discharge Gatekeeper MCP` discovery passes
- `Clinical Intelligence MCP` discovery passes
- `external A2A orchestrator` end-to-end invocation passes
- A2A agent-card discovery passes on the exact public URL used by Prompt Opinion
- the 3-prompt rehearsal finishes cleanly in one session
- the current run folder marks `A2A-main` and `Direct-MCP fallback` as `green`

Otherwise:
- disable the A2A layer for the live demo
- use the fallback direct-MCP path
- keep the architecture explanation accurate

Do not use a `yellow` lane as the live primary path.
If both lanes are not `green`, do not treat the repo as demo-lock complete.

### Phase 4 consistency lock
Keep these docs aligned with runtime smoke behavior:
- `docs/phase4-end-to-end-expected-output-matrix.md`
- `docs/demo-script.md`
- `docs/evals.md`
- `docs/submission-checklist.md`

### MCP transport note
Both MCP runtimes use the Streamable HTTP transport from `@modelcontextprotocol/sdk`.
Prompt Opinion and any direct client must send `Accept: application/json, text/event-stream` in the request headers.
Requests without that header receive a `Not Acceptable` error.
This is standard MCP SDK behavior and does not require a code change.

### Public URL / tunnel expectations

Keep a one-to-one mapping between local ports and public URLs:
- `5055` -> `Discharge Gatekeeper MCP`
- `5056` -> `Clinical Intelligence MCP`
- `5057` -> `external A2A orchestrator`

If you tunnel locally, use one tunnel per surface and keep the hostnames in the corresponding allowlists before registration:

```bash
DISCHARGE_GATEKEEPER_ALLOWED_HOSTS="localhost,127.0.0.1,<gatekeeper-host>" \
CLINICAL_INTELLIGENCE_ALLOWED_HOSTS="localhost,127.0.0.1,<clinical-host>" \
./po-community-mcp-main/scripts/start-two-mcp-local.sh

ALLOWED_HOSTS="localhost,127.0.0.1,<a2a-host>" \
./po-community-mcp-main/scripts/start-a2a-local.sh
```

Use only the hostname portion of each public URL inside the allowlist entries.

Phase 2 release note:
- do not block phase completion on A2A readiness
- block phase completion if two-MCP contradiction quality gates fail

## 10. Phase 2 handoff dependencies
Phase 2 (`two-MCP integration`) should assume the following from Phase 1:
- `Clinical Intelligence MCP` returns parseable `phase0_hidden_risk_v1` payloads
- trap patient and no-risk control behavior are enforced by smoke checks, not only by docs
- hidden-risk findings keep citation ids resolvable to `citations[]`
- provider failure is represented as structured `status=error`, enabling deterministic fallback handling
- Prompt 1 and Prompt 2 demo expectations are already explicit in [demo-script.md](demo-script.md)
- operator can boot and stop both MCPs from one command surface:
  - `./po-community-mcp-main/scripts/start-two-mcp-local.sh`
  - `./po-community-mcp-main/scripts/stop-two-mcp-local.sh`

## 11. Exact fallback actions

When `external A2A orchestrator` is unavailable:
1. stop using the A2A integration immediately
2. keep both MCPs running on `5055` and `5056`
3. confirm `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh` passes
4. continue in Prompt Opinion with the direct-MCP sequence from [`docs/phase2-two-mcp-operator-runbook.md`](phase2-two-mcp-operator-runbook.md)

When `Clinical Intelligence MCP` is reachable but hidden-risk review is unavailable:
1. treat the result as `clinical_intelligence_unavailable`
2. keep the deterministic verdict, blockers, and next steps from `Discharge Gatekeeper MCP`
3. surface hidden-risk review as unavailable or manual-review required
4. do not narrate a hidden-risk escalation that the runtime did not return
