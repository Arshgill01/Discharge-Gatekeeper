# Prompt Opinion Complete Verification Guide

This is the manual operator guide for verifying the full Prompt Opinion path for:
- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

Use this guide when you want to validate what is already set up in your Prompt Opinion account, what still needs to be re-registered, and what is currently broken.

## How this lines up with the getting-started video

The video `Agents Assemble Challenge Getting Started [Qvs_QK4meHc].webm` is useful, but treat it as a setup-pattern reference, not as an exact required sequence for this repo.

What the video confirms:
- Prompt Opinion treats these as separate integration surfaces:
  - BYO agent
  - MCP server
  - custom A2A agent
- MCP server setup uses:
  - a friendly name
  - an endpoint
  - `Streamable HTTP`
  - `No Authentication (Open)`
- a BYO agent may optionally use a workspace collection/content source
- a BYO agent is distinct from MCP registration
- A2A is a separate surface from both BYO and MCP setup

What you should **not** infer from the video for this repo:
- that you must always create new MCP server entries for every run
- that you must always create a new BYO agent from scratch
- that collections/content are required for the Care Transitions Command fallback verification
- that a successful MCP setup automatically proves the A2A path

For this repo's current verification pass:
- re-check existing MCP registrations before creating new ones
- reuse the existing BYO fallback agent if it is still correctly configured
- treat collection/content binding as optional
- treat A2A registration as its own verification step

## Current known state from the last pass

These are the repo-grounded and workspace-grounded facts from the last validation pass:

### Already done in your Prompt Opinion workspace
- `Discharge Gatekeeper MCP` was registered successfully.
- `Clinical Intelligence MCP` was registered successfully.
- A BYO fallback agent was created successfully:
  - `Care Transitions Command BYO Fallback`
- That BYO agent was configured to use:
  - `Discharge Gatekeeper MCP`
  - `Clinical Intelligence MCP`

### Not successfully completed
- `external A2A orchestrator` registration was fixed, but in-workspace chat execution remains unproven.
- The BYO fallback path was only partially proven:
  - Prompt 1 worked visibly.
  - Prompt 2 did not persist/render a visible result in Prompt Opinion even though both MCPs were hit.
  - Prompt 3 did not visibly complete and did not prove the required `Clinical Intelligence MCP.synthesize_transition_narrative` workspace path.

### Important operator interpretation
- MCP registration is not permanently one-off if your public tunnel URLs change.
- If the existing MCP registrations still point at valid public URLs and Prompt Opinion connection tests pass, reuse them.
- If the tunnel hostnames changed, edit the existing MCP registrations rather than assuming you need new entries.
- The getting-started video shows MCP creation from scratch, but for your account this should be treated as a fallback action, not the default first move.

## Step 1: Run local prerequisite validation

From repo root:

```bash
./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh
```

Expected result:
- the wrapper runs and records:
  - `./po-community-mcp-main/scripts/run-full-system-validation.sh`
  - `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
  - `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
  - `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal`
- all automated checks are `GREEN` in `output/prompt-opinion-e2e/latest/reports/status-summary.md`
- a local request/task propagation report exists at `output/prompt-opinion-e2e/latest/reports/request-id-correlation.md`
- both MCPs are healthy locally
- the external A2A orchestrator is healthy locally
- by default the wrapper performs `npm ci` in all three runtime packages; set `PROMPT_OPINION_SKIP_NPM_CI=1` only when dependencies are already known-good

If these fail, do not continue into Prompt Opinion yet.

## Step 2: Start local runtimes

From repo root, boot the two MCPs and the A2A runtime:

```bash
./po-community-mcp-main/scripts/start-two-mcp-local.sh
./po-community-mcp-main/scripts/start-a2a-local.sh
```

Expected local surfaces:
- `Discharge Gatekeeper MCP`: `http://127.0.0.1:5055/mcp`
- `Clinical Intelligence MCP`: `http://127.0.0.1:5056/mcp`
- `external A2A orchestrator`: `http://127.0.0.1:5057`

Expected readiness:
- `http://127.0.0.1:5055/readyz`
- `http://127.0.0.1:5056/readyz`
- `http://127.0.0.1:5057/readyz`
- `http://127.0.0.1:5057/.well-known/agent-card.json`

## Step 3: Expose public URLs

You need stable public URLs for Prompt Opinion to reach the local services.

Use one tunnel per surface:
- one for `5055`
- one for `5056`
- one for `5057`

Then make sure the public hostnames are allowlisted for the corresponding services before retrying Prompt Opinion connection tests.

Do not assume old tunnel hostnames still work.

## Step 4: Verify existing MCP registrations before creating anything new

Inside Prompt Opinion:
1. Go to `Configuration -> MCP Servers`.
2. Look for:
   - `Discharge Gatekeeper MCP`
   - `Clinical Intelligence MCP`
3. Open each one and inspect the stored URL.
4. Run the built-in connection/tool discovery test for each one.

Decision rule:
- If the existing server entry is present and the connection test passes, keep it.
- If the entry is present but the URL is stale, edit the URL and re-test.
- Only create a brand-new MCP server entry if the old one is missing or unusable.

Use these MCP settings, matching the video unless the Prompt Opinion UI wording changed:
- transport: `Streamable HTTP`
- authentication: `No Authentication (Open)`

Expected tools for `Discharge Gatekeeper MCP`:
- `assess_discharge_readiness`
- `extract_discharge_blockers`
- `generate_transition_plan`
- `build_clinician_handoff_brief`
- `draft_patient_discharge_instructions`

Expected tools for `Clinical Intelligence MCP`:
- `surface_hidden_risks`
- `synthesize_transition_narrative`

## Step 5: Verify the A2A registration path

Inside Prompt Opinion:
1. Go to the external/A2A agent registration area.
2. Check whether an entry already exists for `external A2A orchestrator`.
3. If not, attempt to register it using the current public A2A URL.
4. Verify discovery against:
   - `/.well-known/agent-card.json`
   - `/readyz`
   - `/tasks`

Current known failure mode from the last pass:
- A2A registration is accepted, but chat execution from Prompt Opinion is still not reliably proven.

Decision rule:
- If A2A registration fails, record that as an active Prompt Opinion blocker.
- If A2A registration succeeds but chat execution does not hit the external runtime, keep A2A lane at `YELLOW` or `RED` (not `GREEN`).
- Do not mislabel the direct-MCP fallback as an A2A success.

## Step 6: Verify the BYO fallback agent

Inside Prompt Opinion:
1. Go to `Agents -> BYO Agents`.
2. Open `Care Transitions Command BYO Fallback`.
3. Verify it still exists.
4. Verify tool bindings are exactly:
   - `Discharge Gatekeeper MCP`
   - `Clinical Intelligence MCP`
5. Verify embedded/community tools are disabled.
6. Verify the system prompt still locks:
   - `scenario_id=third_synthetic_discharge_slice_ready_v1`
   - Prompt 1 -> `assess_discharge_readiness`
   - Prompt 2 -> `surface_hidden_risks`
   - Prompt 3 -> `synthesize_transition_narrative`

Collection/content note:
- the getting-started video shows a workspace collection as a possible BYO-agent content source
- for this repo's fallback verification, collection binding is optional and should not be used as a substitute for MCP tool binding
- if a collection is attached, it should not change the required MCP/tool routing checks

Do not use `General Chat Agent` for fallback verification.

## Step 7: Run the real BYO fallback verification

Use the BYO agent and run the prompts in order.

### Prompt 1
```text
Is this patient safe to discharge today?
```

Expected visible result:
- a visible call to `assess_discharge_readiness`
- a visible structured baseline of `ready`

This is the deterministic baseline.

### Prompt 2
```text
What hidden risk changed that answer? Show me the contradiction and the evidence.
```

Expected visible result:
- a visible call to `surface_hidden_risks`
- a visible contradiction result
- visible evidence anchors to the nursing contradiction note and case-management addendum

### Prompt 3
```text
What exactly must happen before discharge, and prepare the transition package.
```

Expected visible result:
- a visible call to `synthesize_transition_narrative`
- a concrete transition package
- action-oriented next steps that preserve the escalated disposition

## Step 8: Interpret outcomes correctly

Use these rules exactly:

### If Prompt 1 succeeds
- this proves the BYO agent can invoke `Discharge Gatekeeper MCP`
- this proves the deterministic trap-patient baseline is reachable in the real workspace

### If Prompt 2 does not render but MCP logs show both MCPs were hit
- do not mark fallback verification as passed
- treat this as a Prompt Opinion persistence/rendering problem or an incomplete workspace execution problem

### If Prompt 3 does not hit `Clinical Intelligence MCP`
- do not claim Prompt 3 fallback was verified
- the required `synthesize_transition_narrative` workspace path is still unproven

### If A2A registration fails but MCP fallback works
- mark MCP fallback separately as verified or partially verified
- mark A2A registration as blocked

Do not collapse these into one verdict.

## Step 9: Capture evidence

Capture at minimum:
- MCP server config screens
- A2A registration attempt/result
- BYO agent configuration
- Prompt 1 visible result
- Prompt 2 visible result or visible failure state
- Prompt 3 visible result or visible failure state
- timing notes
- an experiment matrix row for every required lane attempt
- request/task correlation notes for every A2A attempt
- explicit lane status (`green`/`yellow`/`red`) for:
  - A2A-main workspace execution
  - dual-tool BYO Prompt 2/3 persistence
  - direct-MCP fallback viability

If an A2A attempt does not hit the external runtime, record the blocker as one of:
- `registration_only`
- `chat_path_not_routed`
- `runtime_hit_but_no_transcript`
- `runtime_hit_but_downstream_failure`

Use these status definitions exactly:
- `green`: the current run folder proves the lane end-to-end and the lane is eligible to be primary
- `yellow`: proof is partial or missing a required artifact; the lane cannot be primary
- `red`: a blocking defect, failed required validation, or missing required evidence makes the lane unusable

Existing evidence from the previous pass is in:
- [`output/playwright/`](../output/playwright)
- [`output/prompt-opinion-e2e/`](../output/prompt-opinion-e2e)

For each new run, use the run bundle created by:
- `output/prompt-opinion-e2e/runs/<run-id>/`
- `output/prompt-opinion-e2e/latest/` (symlink to the latest run)

Required run files:
- `reports/status-summary.md`
- `reports/command-results.json`
- `reports/request-id-correlation.md`
- `notes/validation-notes.md`
- `notes/experiment-matrix.md`
- `notes/request-id-correlation.md`
- `notes/workspace-evidence.md`

Useful existing files:
- [`output/prompt-opinion-e2e/byo-workspace-validation-notes.md`](../output/prompt-opinion-e2e/byo-workspace-validation-notes.md)
- [`output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json`](../output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json)
- [`docs/prompt-opinion-e2e-validation.md`](prompt-opinion-e2e-validation.md)

## Step 10: Known blockers from the last pass

These are the currently known breakpoints:

### A2A registration blocker
- Prompt Opinion now accepts A2A registration
- The remaining blocker is chat execution proof from Prompt Opinion to external runtime

### BYO fallback workspace blocker
- Prompt 1 was visible and correct
- Prompt 2 reached both MCP runtimes but did not persist/render visibly in the conversation
- Prompt 3 did not visibly complete and did not prove the required synth path

### Resulting status
- two MCPs: reachable and registrable
- BYO agent: created and configured
- direct-MCP fallback: only partially proven
- A2A agent: registration proven, chat execution not yet proven

## Recommended operator order

Use this exact order:
1. local validation
2. local boot
3. tunnel/public URL verification
4. existing MCP registration verification
5. A2A registration attempt
6. BYO agent verification
7. Prompt 1
8. Prompt 2
9. Prompt 3
10. experiment matrix and request-id capture
11. final status write-up

Promotion rule:
- use `A2A-main` as the live lane only when the current run folder marks both `A2A-main` and `Direct-MCP fallback` as `green`
- if `A2A-main` is `yellow` or `red` and fallback is `green`, run fallback as the live lane and keep A2A described as the preferred architecture

## Related docs
- [Prompt Opinion integration runbook](prompt-opinion-integration-runbook.md)
- [Phase 2 two-MCP operator runbook](phase2-two-mcp-operator-runbook.md)
- [Prompt Opinion E2E validation report](prompt-opinion-e2e-validation.md)
