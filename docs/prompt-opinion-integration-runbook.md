# Care Transitions Command Prompt Opinion Integration Runbook

This runbook is the operator scaffold for the locked Phase 0 architecture:
`Discharge Gatekeeper MCP` + `Clinical Intelligence MCP` + `external A2A orchestrator`.

Use this document to separate what must be registered, what may be published, and what the demo should do when a layer fails.

Phase 4 operating stance:
- primary lane: A2A-main (`external A2A orchestrator`)
- required backup lane: direct-MCP fallback (separate Prompt Opinion calls to both MCPs)
- promotion rule: use A2A-main only after same-day clean rehearsal; otherwise run fallback

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
- one reachable public URL per component being registered
- one trap-patient bundle available for demo fallback
- one operator note that maps each public URL to the correct identity
- local two-MCP boot path prepared via [`docs/phase2-two-mcp-operator-runbook.md`](phase2-two-mcp-operator-runbook.md)
- Node.js 20+ with dependencies installed via `npm ci` in:
  - `po-community-mcp-main/typescript`
  - `po-community-mcp-main/clinical-intelligence-typescript`
  - `po-community-mcp-main/external-a2a-orchestrator-typescript`

Before registration, verify for every component:
- identity string matches the frozen name
- health check passes
- logs show requests clearly enough to debug discovery failures

### Validated local boot order

Run this from repo root before any Prompt Opinion registration work:

1. `./po-community-mcp-main/scripts/run-full-system-validation.sh`
2. `./po-community-mcp-main/scripts/start-two-mcp-local.sh`
3. `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
4. `./po-community-mcp-main/scripts/start-a2a-local.sh`
5. `./po-community-mcp-main/scripts/check-a2a-readiness.sh`

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
3. Prompt 3 goes back to `Discharge Gatekeeper MCP` for transition plan output while the operator narrates hidden-risk escalation

### Pass criteria
- both MCPs are discoverable in the same Prompt Opinion workspace
- tool surfaces stay separated by role (deterministic vs hidden-risk)
- trap-patient path shows baseline `ready` posture before hidden-risk review
- hidden-risk review shows cited contradiction and disposition impact `not_ready`
- deterministic transition plan remains callable after hidden-risk escalation
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
- no streaming dependencies
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
Preferred final demo:
1. Prompt Opinion invokes `external A2A orchestrator`
2. orchestrator calls `Discharge Gatekeeper MCP`
3. orchestrator calls `Clinical Intelligence MCP`
4. orchestrator returns one reconciled response

Use this path only if all three components passed a clean-session rehearsal the same day.

### A2A-main operator quick-check
Before going live:
1. run `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
2. run `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
3. run `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
4. confirm trap Prompt 2 still shows contradiction evidence anchors (not transition-package action-list output)

## 7. Fallback direct-MCP demo path

This is the required backup path.
For Phase 3, keep this path rehearsal-ready in case A2A discovery/task invocation regresses.

### Setup
- keep both MCPs registered even when using the A2A path
- prepare one Prompt Opinion workspace view where both MCP tool surfaces are available
- prepare the trap-patient bundle or deterministic synthetic context

### Execution
1. use `Discharge Gatekeeper MCP` for the baseline verdict
2. use `Clinical Intelligence MCP` for the hidden-risk/contradiction follow-up
3. use the deterministic next-step output for the discharge-action prompt

### Acceptable fallback story
- Prompt 1: deterministic readiness answer
- Prompt 2: hidden-risk review with citations
- Prompt 3: final next-step checklist driven by the deterministic spine, verbally noting any hidden-risk escalation if the UI does not merge them

What must be shown on screen in fallback mode:
- Prompt 1: baseline structured posture and final manual two-MCP interpretation
- Prompt 2: contradiction summary plus citation anchors
- Prompt 3: prioritized transition actions with blocker linkage

### Fallback quality checks (required)
Run before recording/live demo when fallback is active:
1. `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
2. `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`

Expected fallback behavior:
- trap path escalates from structured `ready` to final `not_ready` with citation-backed contradiction
- no-risk control path remains explicit `no_hidden_risk` with no fabricated escalation
- inconclusive/unavailable hidden-risk paths stay bounded and explicitly manual-review aligned

### Rules
- do not improvise a fourth step
- do not claim the fallback path is the final architecture
- do state that the system architecture remains `2 MCPs + 1 external A2A`
- rehearse this path in the same session window as the preferred A2A rehearsal

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

Otherwise:
- disable the A2A layer for the live demo
- use the fallback direct-MCP path
- keep the architecture explanation accurate

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
