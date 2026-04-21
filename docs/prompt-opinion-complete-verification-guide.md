# Prompt Opinion Complete Verification Guide

This is the manual operator guide for verifying the full Prompt Opinion path for:
- `Discharge Gatekeeper MCP`
- `Clinical Intelligence MCP`
- `external A2A orchestrator`

Use this guide when you want to validate what is already set up in your Prompt Opinion account, what still needs to be re-registered, and what is currently broken.

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
- `external A2A orchestrator` was **not** successfully registered as a Prompt Opinion external/A2A agent.
- The BYO fallback path was only partially proven:
  - Prompt 1 worked visibly.
  - Prompt 2 did not persist/render a visible result in Prompt Opinion even though both MCPs were hit.
  - Prompt 3 did not visibly complete and did not prove the required `Clinical Intelligence MCP.synthesize_transition_narrative` workspace path.

### Important operator interpretation
- MCP registration is not permanently one-off if your public tunnel URLs change.
- If the existing MCP registrations still point at valid public URLs and Prompt Opinion connection tests pass, reuse them.
- If the tunnel hostnames changed, edit the existing MCP registrations rather than assuming you need new entries.

## Step 1: Run local prerequisite validation

From repo root:

```bash
./po-community-mcp-main/scripts/run-full-system-validation.sh
./po-community-mcp-main/scripts/check-two-mcp-readiness.sh
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator
npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal
```

Expected result:
- all commands pass
- both MCPs are healthy locally
- the external A2A orchestrator is healthy locally

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
- Prompt Opinion returned `422 Unprocessable Entity` during A2A registration.

Decision rule:
- If A2A registration still fails with `422`, record that as an active Prompt Opinion blocker.
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

Existing evidence from the previous pass is in:
- [`output/playwright/`](../output/playwright)
- [`output/prompt-opinion-e2e/`](../output/prompt-opinion-e2e)

Useful existing files:
- [`output/prompt-opinion-e2e/byo-workspace-validation-notes.md`](../output/prompt-opinion-e2e/byo-workspace-validation-notes.md)
- [`output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json`](../output/prompt-opinion-e2e/prompt-opinion-rehearsal-report.json)
- [`docs/prompt-opinion-e2e-validation.md`](prompt-opinion-e2e-validation.md)

## Step 10: Known blockers from the last pass

These are the currently known breakpoints:

### A2A registration blocker
- Prompt Opinion A2A registration returned `422 Unprocessable Entity`
- This prevented a clean in-workspace A2A proof

### BYO fallback workspace blocker
- Prompt 1 was visible and correct
- Prompt 2 reached both MCP runtimes but did not persist/render visibly in the conversation
- Prompt 3 did not visibly complete and did not prove the required synth path

### Resulting status
- two MCPs: reachable and registrable
- BYO agent: created and configured
- direct-MCP fallback: only partially proven
- A2A agent: not proven in Prompt Opinion

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
10. evidence capture and final status write-up

## Related docs
- [Prompt Opinion integration runbook](prompt-opinion-integration-runbook.md)
- [Phase 2 two-MCP operator runbook](phase2-two-mcp-operator-runbook.md)
- [Prompt Opinion E2E validation report](prompt-opinion-e2e-validation.md)
