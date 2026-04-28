# Phase 8: Workspace Execution Breakthrough

## Short answer first

Yes, these blockers are still worth one more serious phase.

- `Prompt Opinion A2A chat execution` is likely repo-fixable because the current runtime advertises `supportedInterfaces[0].protocolBinding = JSONRPC` while exposing a custom `/tasks` surface instead of a spec-shaped JSON-RPC or HTTP+JSON A2A execution surface. Registration can pass on card shape alone while chat execution still fails if the selected binding is wrong.
- `Dual-tool BYO Prompt 2/3` is less certain, but still plausibly repo-fixable because the real workspace already reaches the MCP runtimes. That means the problem is not raw reachability. The remaining failure surface is tool-selection ambiguity, payload shape/size, transcript-synthesis compatibility, or Prompt Opinion persistence behavior after multi-MCP execution.

This phase exists to find out decisively, not to keep hoping.

If this phase ends with:
- spec-correct A2A transport work landed,
- browser/network evidence showing Prompt Opinion still does not route to the external runtime, and
- dual-tool BYO still stalls after output/metadata hardening,

then stop calling those blockers “probably fixable” and pivot the submission lane around the proven path.

## Summary

Phase 8 focuses on one job: break the two workspace blockers that have survived too many passes.

The target outcome is not another documentation pass and not another local-only green board.
It is execution:

- Prompt Opinion chat must actually reach the external A2A runtime
- dual-tool BYO Prompt 2 must visibly complete
- dual-tool BYO Prompt 3 must visibly complete
- browser evidence, network evidence, and runtime diagnostics must agree on what happened

## Why this phase exists

The repo already proved:

- local MCP and A2A release gates are green
- Prompt Opinion accepts the external A2A registration surface
- single-tool Clinical Intelligence Prompt 2 works in the real workspace
- single-tool Clinical Intelligence Prompt 3 works with tool-explicit phrasing

The repo has not proved:

- Prompt Opinion A2A chat execution actually routes to the external runtime
- dual-tool BYO Prompt 2/3 reliably persists a final assistant artifact
- canonical Prompt 3 is stable in the real workspace

That means the current bottlenecks are no longer “build more product.”
They are protocol compatibility, workspace execution compatibility, and proof discipline.

## Hard constraints

- architecture stays `2 MCPs + 1 external A2A`
- Prompt Opinion stays the only user-facing surface
- no custom frontend
- no third MCP
- no A2A streaming
- keep the deterministic discharge spine foundational
- keep the hidden-risk contradiction as the core product moment
- final demo remains 3 prompts

## Exit criteria

Phase 8 is complete only when all of the following are true:

- Prompt Opinion A2A chat execution is `green`, or browser/network evidence proves the remaining blocker is platform-side after spec-correct transport work
- dual-tool BYO Prompt 2 is `green`, or browser/network evidence proves the remaining blocker is platform-side after tool-surface hardening
- dual-tool BYO Prompt 3 is `green`, or browser/network evidence proves the remaining blocker is platform-side after tool-surface hardening
- the current run folder includes screenshots, experiment matrix, request/task correlation, and final lane calls
- the repo has an explicit go/no-go answer for Phase 9 submission freeze

## Agent count

Use 3 agents.

## Worktrees and branches

Create one integration branch from `master`, then one feature branch per lane.

```bash
git fetch --all --prune
git switch master
git pull --ff-only origin master
git branch int/phase8-workspace-execution-breakthrough master

git worktree add /Users/arshdeepsingh/Developer/ctc-phase8-a2a-binding -b feat/phase8-a2a-binding-parity int/phase8-workspace-execution-breakthrough
git worktree add /Users/arshdeepsingh/Developer/ctc-phase8-byo-stability -b feat/phase8-byo-dual-tool-stability int/phase8-workspace-execution-breakthrough
git worktree add /Users/arshdeepsingh/Developer/ctc-phase8-browser-proof -b feat/phase8-browser-proof-and-go-no-go int/phase8-workspace-execution-breakthrough
```

Recommended merge order:

```bash
git switch int/phase8-workspace-execution-breakthrough
git merge --no-ff feat/phase8-byo-dual-tool-stability
git merge --no-ff feat/phase8-a2a-binding-parity
git merge --no-ff feat/phase8-browser-proof-and-go-no-go
```

## Parallel and sequential execution

Run in parallel from day 1:

- Agent 1: A2A binding parity and execution compatibility
- Agent 2: dual-tool BYO Prompt 2/3 stabilization
- Agent 3: browser automation, network capture, and proof harness

Sequential rule:

- Agent 3 starts immediately on browser automation and external research.
- Agent 3 performs the decisive authenticated Prompt Opinion validation pass only after Agents 1 and 2 merge into the integration branch.

Reason for this order:

- Agent 1 fixes the likeliest repo-side A2A execution mismatch first
- Agent 2 attacks the multi-MCP transcript problem directly instead of hiding behind single-tool success
- Agent 3 prevents guesswork by capturing what Prompt Opinion actually does in the browser and on the wire

## Do-not-retry list

Do not spend this phase repeating these already-failed tactics as the primary strategy:

- routing-prompt tweaks alone for dual-tool BYO
- agent-card cosmetic tweaks alone without execution-path changes
- unauthenticated browser checks
- “`prompt-stream` returned 200” as a proxy for successful execution
- more manual tunnel churn without browser/network capture
- more docs-only evidence refreshes without new workspace proof

## Agent 1 prompt

You own Prompt Opinion A2A chat execution. Read `AGENTS.md`, `PLAN.md`, `docs/architecture.md`, `docs/evals.md`, `docs/demo-script.md`, `docs/prompt-opinion-integration-runbook.md`, `docs/prompt-opinion-e2e-validation.md`, `docs/prompt-opinion-complete-verification-guide.md`, `output/prompt-opinion-e2e/final-transcript-debug-notes.md`, and `output/prompt-opinion-e2e/byo-workspace-validation-notes.md`.

Your job is to make Prompt Opinion chat actually hit the external runtime, not merely accept registration.

Start from the strongest repo-side hypothesis:

- the current agent card advertises `JSONRPC` as the preferred binding, but the runtime primarily serves a custom `/tasks` surface
- if Prompt Opinion selects the first supported interface, registration can pass while execution still fails

Required work:

- inspect and, if necessary, refactor `po-community-mcp-main/external-a2a-orchestrator-typescript/{agent-card.ts,index.ts,types.ts,smoke/*.ts}`
- add binding-parity support for the execution path Prompt Opinion actually uses
- if needed, support both:
  - spec-shaped A2A JSON-RPC execution
  - spec-shaped A2A HTTP+JSON execution
- preserve the existing synchronous `/tasks` surface only if it still adds value and does not confuse Prompt Opinion
- add exact runtime diagnostics for:
  - selected binding
  - request method/path
  - request ids and correlation ids
  - execution start/finish
  - downstream MCP correlation
- make browser-observed A2A execution reproducible in local smoke or a dedicated Prompt Opinion compatibility smoke where possible

Research directions:

- read the A2A spec sections on `supportedInterfaces`, client protocol selection, JSON-RPC binding, and HTTP+JSON binding
- verify whether Prompt Opinion is more likely to call `POST /rpc`, `POST /message:send`, `POST /v1/message:send`, or the custom `/tasks` surface
- search for examples of A2A clients that pass registration but fail execution due to binding mismatch, method naming mismatch, or field-naming mismatch

Do not waste time on:

- more card-shape-only tweaks unless they are tied to the execution transport
- streaming work
- adding a second external A2A runtime

Preferred commit structure:

- `refactor(phase8): add prompt-opinion-compatible a2a bindings`
- `fix(phase8): route prompt opinion chat into external runtime`

Validation required:

- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run typecheck`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:runtime`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:decision-matrix`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:orchestrator`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal`
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh`

## Agent 2 prompt

You own dual-tool BYO Prompt 2 and Prompt 3 stabilization. Read `AGENTS.md`, `PLAN.md`, `docs/phase0-hidden-risk-prompt-contract.md`, `docs/phase1-clinical-intelligence-expected-output-matrix.md`, `docs/evals.md`, `docs/demo-script.md`, `docs/prompt-opinion-integration-runbook.md`, `docs/prompt-opinion-e2e-validation.md`, `docs/prompt-opinion-complete-verification-guide.md`, `output/prompt-opinion-e2e/final-transcript-debug-notes.md`, and `output/prompt-opinion-e2e/byo-workspace-validation-notes.md`.

Your job is to make the real Prompt Opinion dual-tool BYO path complete Prompt 2 and Prompt 3 visibly and repeatably.

Start from the strongest repo-side hypotheses:

- Prompt Opinion does reach the MCPs, so the failure is after or around tool execution, not before it
- multi-MCP routing may be fragile because tool metadata and payloads are too large, too ambiguous, or too unfriendly for Prompt Opinion transcript synthesis
- canonical Prompt 3 is weaker than tool-explicit Prompt 3, so the output contract may need a smaller, clearer render-safe path

Required work:

- inspect and, if necessary, refactor:
  - `po-community-mcp-main/clinical-intelligence-typescript/clinical-intelligence/*.ts`
  - `po-community-mcp-main/clinical-intelligence-typescript/tools/*.ts`
  - `po-community-mcp-main/typescript/discharge-readiness/*.ts`
  - any shared MCP metadata or schema surfaces that Prompt Opinion sees
- make Prompt 2 and Prompt 3 outputs smaller, clearer, and more render-safe without weakening the hidden-risk contradiction moment
- tighten tool descriptions so Prompt Opinion has less routing ambiguity between deterministic and hidden-risk tools
- consider Prompt Opinion-specific slim response modes if they do not break existing contracts
- preserve canonical Prompt 2 contradiction-first output
- make canonical Prompt 3 materially closer to the successful tool-explicit Prompt 3
- add or update smokes that fail when payloads drift back into transcript-hostile shapes

Research directions:

- search for MCP client issues involving large tool payloads, transcript persistence failures, or multi-tool completion stalls
- inspect whether Prompt Opinion behaves better with smaller JSON envelopes, fewer nested arrays, or stronger top-level human-readable summaries
- inspect whether adding clearly bounded `summary`, `headline`, or render-safe text blocks improves final assistant completion probability

Do not waste time on:

- prompt-routing changes alone without tool-surface changes
- breaking verdict labels, blocker taxonomy, or contract shape
- turning the fallback story into single-tool-only operator improvisation

Preferred commit structure:

- `refactor(phase8): harden prompt-opinion tool surfaces for dual-mcp byo`
- `fix(phase8): stabilize dual-tool byo prompt 2 and 3`

Validation required:

- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run typecheck`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:hidden-risk`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:narrative`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp`
- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:release-gate`
- `npm --prefix po-community-mcp-main/typescript run typecheck`
- `npm --prefix po-community-mcp-main/typescript run smoke:demo-path`
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh`

## Agent 3 prompt

You own browser proof, network capture, and final go/no-go evidence. Use the `playwright` skill before browser automation. Read `AGENTS.md`, `PLAN.md`, `docs/demo-script.md`, `docs/prompt-opinion-integration-runbook.md`, `docs/prompt-opinion-complete-verification-guide.md`, `docs/prompt-opinion-e2e-validation.md`, all files under `docs/templates/`, and the latest run folder under `output/prompt-opinion-e2e/latest/`.

Your job is to replace manual guesswork with authenticated Prompt Opinion browser evidence.

Required work:

- build a repeatable browser workflow for:
  - login
  - MCP registration verification
  - external A2A connection verification
  - BYO agent verification
  - Prompt 1 / Prompt 2 / Prompt 3 execution attempts
- capture screenshots in `output/playwright/` and run-folder screenshots in `output/prompt-opinion-e2e/latest/screenshots/`
- capture enough network evidence to answer:
  - did Prompt Opinion call the external runtime at all?
  - if yes, which endpoint and shape?
  - did the workspace hit both MCPs on failed dual-tool turns?
  - where does the transcript/persistence chain break?
- improve `po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh` and related evidence templates so the decisive pass is reproducible
- after Agents 1 and 2 merge, run the decisive authenticated validation pass and update the run folder with green/yellow/red evidence

Research directions:

- use browser automation to inspect actual network requests instead of inferring behavior from partial logs
- search for Prompt Opinion usage patterns, UI behavior, or integration examples that reveal expected A2A and MCP flows
- search for Playwright-based techniques to capture HAR/network logs cleanly in authenticated workflows

Do not waste time on:

- another manual-only validation pass
- unauthenticated browser screenshots
- evidence bundles that omit experiment matrix, request-id correlation, or workspace screenshots

Preferred commit structure:

- `test(phase8): add browser-driven prompt opinion execution harness`
- `docs(phase8): capture workspace execution proof and go-no-go evidence`

Validation required after merge:

- `./po-community-mcp-main/scripts/run-full-system-validation.sh`
- `./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh`
- `./po-community-mcp-main/scripts/check-two-mcp-readiness.sh`
- `./po-community-mcp-main/scripts/check-a2a-readiness.sh`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:prompt-opinion-rehearsal`

## Validation

Phase 8 requires all of the following:

- `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:release-gate`
- `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:release-gate`
- `npm --prefix po-community-mcp-main/typescript run smoke:release-gate`
- `./po-community-mcp-main/scripts/run-full-system-validation.sh`
- `./po-community-mcp-main/scripts/run-prompt-opinion-rehearsal-capture.sh`
- authenticated Prompt Opinion browser evidence under the latest run folder
- a run-folder status board that marks both `A2A-main` and `Direct-MCP fallback` from current evidence
- a written go/no-go call for Phase 9

## Risks

- Prompt Opinion may still have a platform-side execution defect after all repo-side fixes
- the A2A execution blocker may require a transport binding change larger than Phase 7 assumed
- dual-tool BYO may still fail if the platform cannot finalize transcript persistence after multi-MCP execution
- browser automation may require operator credentials and timing discipline that make the decisive pass partly manual

## Assumptions

- use 3 agents
- this is the last serious fix attempt before submission-freeze decisions
- synchronous A2A remains the only staffed architecture lane
- no streaming work is in scope
- if the phase ends with platform-side blocker evidence after repo-side fixes, do not keep relabeling the problem as “needs one more prompt tweak”
