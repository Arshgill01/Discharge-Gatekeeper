---
name: "ctc-baseline-proof-gates"
description: "Run Care Transitions Command baseline proof gates before Phase 9. Use when asked to prove the final baseline, run Direct-MCP or combined Prompt Opinion proofs, perform the required precheck, enforce stop-on-failure gate order, diagnose failed proof phases, or decide whether Phase 9 may start."
---

# CTC Baseline Proof Gates

## Core Rule

Run gates in order and stop at the first failed required proof:

1. PRECHECK
2. Test 1 Direct-MCP Prompt Opinion proof
3. Test 2 combined Direct-MCP plus A2A proof
4. Test 3 fresh reproducibility combined proof
5. Phase 9 planning only after all three tests are green

Do not treat FunctionResponse/network payloads as visible Prompt Opinion success unless the user explicitly changes the proof standard. Preserve them as diagnostic evidence.

## Precheck

Before any proof, create a fresh run folder and write `reports/precheck-report.md`.

Verify:

- branch and commit
- latest intended fixes in the code being tested
- no stale listeners on expected ports
- DGK, CI, and external A2A local readiness
- provider selection and required key presence
- public tunnel/path proxy readiness when Prompt Opinion proof needs it
- Prompt Opinion registrations point at current public URLs

Useful checks:

```sh
git status --short --branch
git rev-parse HEAD
lsof -nP -iTCP:5055 -iTCP:5056 -iTCP:5057 -iTCP:5080 -iTCP:4040 -sTCP:LISTEN 2>/dev/null || true
CLINICAL_INTELLIGENCE_LLM_PROVIDER=google ./po-community-mcp-main/scripts/check-runtime-provider-config.sh
```

## Test 1 Acceptance

Test 1 passes only when the visible accepted Prompt Opinion result shows:

- Prompt 1 final verdict `not_ready`
- Prompt 1 structured baseline `ready`
- Prompt 2 hidden contradiction and evidence anchors
- Prompt 3 compact transition package
- both anchors:
  - `Nursing Note 2026-04-18 20:40`
  - `Case Management Addendum 2026-04-18 20:55`
- no timeout/cancelled/failure banner
- runtime/MCP logs prove expected MCP calls

If Test 1 fails, classify the failure phase and do not run Test 2:

- preflight/env/provider issue
- Prompt Opinion registration issue
- runtime hit missing
- MCP hit missing
- model/provider error
- browser transcript not persisted
- timeout/cancelled after valid response
- wrong clinical output
- evidence anchors missing
- stale process/URL/branch

## Test 2 Acceptance

Only run after a clean Test 1.

Require:

- Direct-MCP lane remains green
- A2A runtime/protocol proof completes
- external A2A path reaches runtime
- downstream evidence proves both MCPs were hit
- final result `not_ready`
- structured baseline `ready`
- hidden-risk result `hidden_risk_present`
- anchors visible
- run-folder status names primary lane and architecture proof lane

## Test 3 Acceptance

Only run after Test 1 and Test 2 are green.

Use a fresh run folder/session after cleanup:

- stop stale services/processes where appropriate
- restart current services
- verify fresh tunnel/path proxy
- avoid old screenshots, transcripts, caches, and logs as proof

## Completion

Before final reporting, audit every explicit requirement against actual artifacts. If any requirement is missing or weakly verified, keep the goal incomplete.

Never enter Phase 9 or call the baseline green unless all three tests pass under the active proof standard.
