# Decisions

Use this file for short, dated decisions that affect more than one workstream.
This file now tracks the active post-pivot system decisions for phase 0 and beyond.

## Entry format
- Date:
- Decision:
- Why:
- Affected files or lanes:
- Follow-up:

## Active decisions
- Date: 2026-04-18
- Decision: Lock the top-level system identity to `Care Transitions Command`.
- Why: The repo is no longer a single-product MCP story. It is a multi-component care-transitions system with one user-facing narrative.
- Affected files or lanes: front-door docs, product, architecture, demo/submission
- Follow-up: Keep `README.md`, `AGENTS.md`, `PLAN.md`, and phase-0 docs aligned to this identity.

- Date: 2026-04-18
- Decision: Preserve `Discharge Gatekeeper MCP` as the existing MCP identity, add `Clinical Intelligence MCP` as the second MCP identity, and use `external A2A orchestrator` as the coordinating agent identity.
- Why: The system needs stable names for the deterministic spine, the contradiction-intelligence layer, and the prompt-level coordinator.
- Affected files or lanes: product, architecture, implementation, demo/submission
- Follow-up: Do not rename these components casually across docs, code, or packaging.

- Date: 2026-04-18
- Decision: Lock the target architecture at `2 MCPs + 1 external A2A`.
- Why: This is the smallest architecture that preserves both the deterministic discharge spine and the hidden-risk contradiction story.
- Affected files or lanes: architecture, implementation, demo/submission, evals
- Follow-up: Reject proposals for a third MCP, a collapsed one-MCP architecture, or wider multi-agent sprawl unless a later explicit decision changes the architecture.

- Date: 2026-04-18
- Decision: Keep the deterministic structured discharge spine foundational and assign it to Discharge Gatekeeper MCP.
- Why: The final system must show that the narrative contradiction changed an inspectable structured posture, not that an unconstrained model generated the entire answer from scratch.
- Affected files or lanes: product, architecture, implementation, evals
- Follow-up: Keep structured posture visible in demo, evals, and data artifacts.

- Date: 2026-04-18
- Decision: Define the hidden-risk contradiction moment as the core product and demo spec.
- Why: This is the clearest proof that the system adds AI value beyond checklist software or generic summarization.
- Affected files or lanes: product, data, architecture, demo/submission, evals
- Follow-up: Keep the canonical trap patient and 3-prompt demo aligned to this moment.

- Date: 2026-04-18
- Decision: Lock the final demo to 3 prompts inside Prompt Opinion with no custom frontend and no A2A streaming.
- Why: The judging path rewards clarity, reliability, and a clean marketplace-ready operator story.
- Affected files or lanes: demo/submission, architecture, implementation
- Follow-up: Keep Prompt Opinion as the only user-facing surface and avoid inventing custom UI requirements.

- Date: 2026-04-18
- Decision: Canonicalize the phase-0 demo patient as one trap patient whose structured posture is `ready` before narrative escalation and `not_ready` after contradiction review.
- Why: The repo needs one durable patient spec that all implementation, eval, and demo work can target.
- Affected files or lanes: data, architecture, evals, demo/submission, implementation
- Follow-up: Treat `docs/phase0-trap-patient-spec.md` as the canonical patient artifact and do not replace it casually.

- Date: 2026-04-18
- Decision: Keep the canonical verdict states `ready`, `ready_with_caveats`, and `not_ready`, and keep the canonical blocker taxonomy unchanged.
- Why: Stable labels reduce cross-workstream drift even as the system architecture broadens.
- Affected files or lanes: product, architecture, evals, implementation
- Follow-up: Any future taxonomy or verdict change requires explicit cross-file updates.

- Date: 2026-04-18
- Decision: Lock the hidden-risk analysis contract in `docs/phase0-hidden-risk-prompt-contract.md` and the reconciliation policy in `docs/phase0-orchestrator-decision-matrix.md`.
- Why: Future implementation work needs explicit output semantics and downgrade logic instead of vague prompt strategy notes.
- Affected files or lanes: implementation, evals, Prompt Opinion integration, demo/submission
- Follow-up: Treat those docs as the implementation source of truth until a later ADR supersedes them.

- Date: 2026-04-18
- Decision: Require a demo-safe direct-MCP fallback path even though the preferred architecture includes an external A2A orchestrator.
- Why: The A2A layer improves the final story but cannot be allowed to become the only working judge path.
- Affected files or lanes: Prompt Opinion integration, demo/submission, failure planning
- Follow-up: Rehearse both the preferred A2A path and the direct-MCP fallback before recording or live judging.

- Date: 2026-04-19
- Decision: `Clinical Intelligence MCP` defaults to a deterministic heuristic provider for local smoke checks, while keeping a Google Gemini API-backed provider path for real model inference; on provider timeout/unparseable output it returns structured `status=error` with no hidden-risk findings.
- Why: This keeps release-gate and demo safety stable without fabricating hidden-risk escalation when LLM output is unavailable, and preserves a production-ready model integration path.
- Affected files or lanes: Clinical Intelligence MCP runtime, smoke coverage, orchestrator integration assumptions
- Follow-up: Orchestrator integration should treat `status=error` as `clinical_intelligence_unavailable` and preserve deterministic posture per failure-mode plan.

- Date: 2026-04-19
- Decision: Lock a trap/control expected-output matrix and quality-smoke guardrails for `Clinical Intelligence MCP` (`surface_hidden_risks` and `synthesize_transition_narrative`) as phase-1 gates.
- Why: Phase 2 and Prompt Opinion integration need measurable enforcement for hidden-risk detection, no-risk suppression, parseability failure handling, citation quality, and narrative grounding.
- Affected files or lanes: Clinical Intelligence MCP smoke/release gate, eval docs, demo path expectations, Prompt Opinion runbook
- Follow-up: Treat `docs/phase1-clinical-intelligence-expected-output-matrix.md` and the clinical-intelligence smoke checks as required pre-integration gates before two-MCP reconciliation work.

- Date: 2026-04-19
- Decision: Standardize Phase 2 operations on a two-MCP direct run path that boots both MCP runtimes together, registers them separately in Prompt Opinion, and treats Clinical Intelligence `status=error` as `clinical_intelligence_unavailable` while preserving deterministic outputs.
- Why: Phase 2 must prove reliable coexistence and hidden-risk uplift before A2A, with a demo-safe fallback that does not fabricate escalation.
- Affected files or lanes: two-MCP operator scripts, Prompt Opinion integration runbook, phase-2 smoke/release checks
- Follow-up: keep this direct two-MCP path rehearsed and green as a required precondition before any A2A demo path.

- Date: 2026-04-19
- Decision: Lock a Phase 2 two-MCP expected-output matrix and enforce note-dependent trap escalation, clean-control bounded behavior, citation traceability, and fallback story-strength checks in the phase-2 integration smoke.
- Why: The project needs measurable proof that the two-MCP path is already stronger than the structured-only story before A2A implementation becomes a dependency.
- Affected files or lanes: `docs/evals.md`, `docs/phase2-two-mcp-expected-output-matrix.md`, `docs/demo-script.md`, Prompt Opinion runbook, phase-2 smoke checks
- Follow-up: keep `npm --prefix po-community-mcp-main/clinical-intelligence-typescript run smoke:phase2-two-mcp` and `./po-community-mcp-main/scripts/smoke-two-mcp-integration.sh` green as release gates for Phase 2 quality/demo proofing.

- Date: 2026-04-19
- Decision: External A2A runtime is locked to a synchronous, non-streaming agent-card plus task-lifecycle surface that explicitly applies matrix rows 1-12 in code; when Clinical Intelligence MCP invocation fails it emits `clinical_intelligence_unavailable` fallback and preserves deterministic posture.
- Why: Phase 3 requires inspectable orchestration behavior and safe failure handling instead of prompt-only reconciliation.
- Affected files or lanes: external A2A runtime, phase-3 smoke checks, Prompt Opinion A2A registration path
- Follow-up: keep `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh` and external A2A smoke checks green before preferring A2A in demo.

- Date: 2026-04-19
- Decision: Lock Phase 3 A2A quality gates on an implementation-grounded expected-output matrix that requires trap-patient contradiction escalation, control-path bounded behavior, insufficient-context/manual-review behavior, agent-card discovery validity, and direct-MCP fallback continuity.
- Why: Phase 3 quality/readiness must be measurable in the real runtime surfaces used for Prompt Opinion registration, not only in narrative docs.
- Affected files or lanes: `docs/phase3-a2a-expected-output-matrix.md`, `docs/evals.md`, A2A smoke checks, Prompt Opinion runbook, demo/submission packaging
- Follow-up: keep `npm --prefix po-community-mcp-main/external-a2a-orchestrator-typescript run smoke:runtime`, `... run smoke:decision-matrix`, `... run smoke:orchestrator`, and `./po-community-mcp-main/scripts/smoke-a2a-orchestration.sh` green before recording/publish.
