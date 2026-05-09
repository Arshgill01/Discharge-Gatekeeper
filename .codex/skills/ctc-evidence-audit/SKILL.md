---
name: "ctc-evidence-audit"
description: "Audit Care Transitions Command proof artifacts and run folders. Use when asked to verify baseline completion, map gate requirements to concrete evidence, inspect Prompt Opinion screenshots/transcripts/network/logs, write final status reports, or decide whether a proof is green, red, supplemental, stale, or blocked."
---

# CTC Evidence Audit

## Audit Principle

Every claim must map to a current artifact. Do not accept proxy signals as completion.

Passing tests, green status files, and backend FunctionResponses are useful only if they cover the exact proof requirement being claimed.

## Checklist Shape

For each audit, create a table with:

- requirement
- artifact path
- status: `PASS`, `FAIL`, `PARTIAL`, `NOT RUN`, or `SUPPLEMENTAL`
- notes

Include branch, commit, run folder, public URL, provider evidence, and cleanup status.

## Required Artifacts

Prefer current run-folder evidence:

- `reports/precheck-report.md`
- `reports/provider-evidence.json`
- `reports/registration-verification.json`
- `reports/direct-mcp-status.json`
- `reports/a2a-one-turn-status.json`
- `reports/a2a-downstream-mcp-hit-summary.json`
- `reports/browser-network-events.json`
- `reports/browser-network-summary.json`
- `reports/runtime-log-delta.json`
- `screenshots/*result.txt`
- `screenshots/*result.png`
- proof/failure reports in `reports/`

Use `git status --short --branch` and `git rev-parse HEAD` for tested code identity.

## Visible Proof Rules

For Test 1, visible Prompt Opinion success requires accepted transcript evidence, not only backend evidence.

FunctionResponse or network text can prove:

- backend/tool call worked
- clinical payload was correct
- provider or post-tool synthesis failed after valid response

FunctionResponse or network text cannot satisfy Test 1 visible proof unless the user explicitly changes the standard.

## Failure Classification

Classify failures using the gate language:

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
- A2A runtime/protocol
- downstream MCP invocation
- response shape/content type
- stale public URL/path proxy

## Report Requirements

Final reports for substantial proof work must include:

- branch and commit tested
- precheck result
- Test 1 result
- Test 2 result
- Test 3 result
- run folder paths
- screenshots/transcripts/network/log artifacts
- exact failures and fixes
- whether Phase 9 was entered
- Phase 9 plan/status only if all baseline proofs passed

If a gate failed, state that the goal is incomplete and do not mark Phase 9 started.
