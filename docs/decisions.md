# Decisions

Use this file for short, dated decisions that affect more than one workstream.

## Entry format
- Date:
- Decision:
- Why:
- Affected files or lanes:
- Follow-up:

## Seed decisions
- Date: 2026-04-15
- Decision: Start with an MCP-first architecture for the hackathon build.
- Why: The differentiator is tool-driven discharge-readiness assessment with Prompt Opinion interoperability, not a custom external runtime.
- Affected files or lanes: architecture, implementation, demo/submission
- Follow-up: Revisit only if MCP proves too restrictive for the core workflow.

- Date: 2026-04-15
- Decision: The initial wedge is discharge readiness plus safe transition coordination.
- Why: It provides strong AI factor, visible workflow value, and realistic feasibility while fitting the hackathon judging path.
- Affected files or lanes: product, data, implementation, demo/submission
- Follow-up: Keep the wedge narrow and avoid drifting into generic care navigation.

- Date: 2026-04-15
- Decision: Use canonical verdict labels `ready`, `ready_with_caveats`, and `not_ready`.
- Why: Stable labels reduce drift across prompts, tools, docs, and demo script.
- Affected files or lanes: product, architecture, evals, implementation
- Follow-up: Only change with explicit cross-file updates.

- Date: 2026-04-15
- Decision: Initial v1 freeze used `assess_discharge_readiness` response keys `verdict`, `blockers`, `evidence`, `next_steps`, `summary` with first-pass blocker labels `clinical`, `medications`, `follow_up`, `education`, `home_support`, `logistics` (superseded by taxonomy unification decision below).
- Why: The first vertical slice needs a compact, inspectable contract for deterministic smoke checks and judge-facing clarity.
- Affected files or lanes: architecture, implementation, evals
- Follow-up: Keep as historical context only; do not use these six labels in active contracts, prompts, or evals.

- Date: 2026-04-15
- Decision: Canonicalize blocker taxonomy for all active code/docs/evals to `clinical_stability`, `pending_diagnostics`, `medication_reconciliation`, `follow_up_and_referrals`, `patient_education`, `home_support_and_services`, `equipment_and_transport`, `administrative_and_documentation` while preserving the v1 top-level response keys (`verdict`, `blockers`, `evidence`, `next_steps`, `summary`).
- Why: AGENTS/product docs already define the canonical discharge taxonomy; unifying runtime and eval language removes drift and prevents judge-path confusion.
- Affected files or lanes: architecture, implementation, evals, demo/submission
- Follow-up: Treat old labels as deprecated aliases with explicit mapping only for migration references: `clinical -> clinical_stability`, `medications -> medication_reconciliation`, `follow_up -> follow_up_and_referrals`, `education -> patient_education`, `home_support -> home_support_and_services`, `logistics -> equipment_and_transport`. The v1 scenario currently triggers six categories and does not trigger `pending_diagnostics` or `administrative_and_documentation` by default.

- Date: 2026-04-15
- Decision: Standardize integration runtime config on explicit `ALLOWED_HOSTS` plus `/healthz` for local/tunnel readiness checks.
- Why: Prompt Opinion testing via dev tunnels fails if host allowlisting is implicit; an explicit env knob and health endpoint reduce integration guesswork and demo risk.
- Affected files or lanes: implementation, architecture, demo/submission
- Follow-up: If deployment moves from dev tunnel to hosted endpoint, keep `ALLOWED_HOSTS` and health checks in the runbook.

- Date: 2026-04-15
- Decision: Lock the first-slice judge demo to a 3-prompt path ending in "What must happen before this patient leaves?" instead of a broader transition-package prompt.
- Why: The v1 tool contract already returns deterministic `next_steps`; centering this keeps the demo short, reliable, and aligned with current implementation.
- Affected files or lanes: demo/submission, evals
- Follow-up: Reintroduce transition-package prompt only after a dedicated artifact generator is shipped and smoke-tested.

- Date: 2026-04-15
- Decision: Restrict the active TypeScript MCP runtime tool surface to `assess_discharge_readiness` and remove starter endpoint exposure (`/hello-world`).
- Why: The judge path should present a discharge-specific product surface, not generic starter tooling.
- Affected files or lanes: implementation, Prompt Opinion integration, demo/submission
- Follow-up: Keep starter utility/tool code quarantined unless explicitly reintroduced with discharge-specific value.

- Date: 2026-04-15
- Decision: Standardize visible runtime and repo identity on "Discharge Gatekeeper" across root docs and TypeScript package metadata; treat `po-community-mcp-main` as substrate.
- Why: First impressions were still starter-branded, which weakens ownership clarity for teammates and judges.
- Affected files or lanes: product, implementation, demo/submission
- Follow-up: Keep any future public-facing text and package metadata aligned to Discharge Gatekeeper naming.

- Date: 2026-04-15
- Decision: Introduce an internal normalized evidence bundle for `assess_discharge_readiness` that merges structured signals and note/document signals, and explicitly tracks contradiction, ambiguity, and missing-evidence markers.
- Why: The readiness engine needs a deterministic evidence substrate that is source-aware and inspectable, without changing the frozen public v1 response keys or verdict labels.
- Affected files or lanes: implementation, evals
- Follow-up: Keep new readiness logic and future tools consuming the normalized bundle instead of hardcoded scenario evidence IDs.

- Date: 2026-04-15
- Decision: Add a secondary regression scenario (`second_synthetic_discharge_slice_ready_with_caveats_v1`) and a matrix smoke harness that includes explicit failure fixtures for missing context, insufficient evidence, contradictory evidence, and malformed input.
- Why: Protect the judge demo path from silent logic drift while preserving the primary `first_synthetic_discharge_slice_v1` scenario as the default on-camera flow.
- Affected files or lanes: data, evals, implementation, demo/submission
- Follow-up: Keep truth fixtures and failure expectations aligned with canonical response keys, verdict states, and blocker taxonomy whenever readiness logic changes.

- Date: 2026-04-15
- Decision: Refactor readiness derivation to combine structured gap signals with explicit evidence assertions (`supports_blocker`, `supports_readiness`, `uncertain`) and treat unresolved conflict/uncertainty as visible blockers instead of silently guessing closure.
- Why: The first-pass engine was brittle and overfit to one fixture shape; evidence-driven rule evaluation improves verdict separation (`ready`, `ready_with_caveats`, `not_ready`) across primary, alternate, and contradictory/insufficient-evidence scenarios while preserving the frozen top-level response keys.
- Affected files or lanes: implementation, evals, demo reliability
- Follow-up: Keep canonical blocker categories stable and maintain scenario-based smoke coverage for primary outcome, alternate caveat outcome, and ambiguity handling.

- Date: 2026-04-18
- Decision: Canonicalize operations guidance in `docs/prompt-opinion-integration-runbook.md` as the single operator path for local boot, public endpoint/tunnel exposure, Prompt Opinion MCP connection, and launchpad smoke validation.
- Why: Prior guidance was fragmented and left hidden setup assumptions; one runbook reduces onboarding friction and judge-path reliability risk.
- Affected files or lanes: implementation, Prompt Opinion integration, demo/submission
- Follow-up: Keep root/runtime README links pointed to this runbook and update this runbook first when integration assumptions change.

- Date: 2026-04-18
- Decision: Harden TypeScript runtime operations surface with strict config validation (`PO_ENV`, `PORT`), `ALLOWED_HOSTS` normalization (including URL input), expanded request metadata logs, and a `/readyz` readiness endpoint alongside `/healthz`.
- Why: Prompt Opinion tunnel/public endpoint testing frequently fails on host misconfiguration and stale URLs; clearer validation plus richer health/log diagnostics speeds recovery and reduces demo interruptions.
- Affected files or lanes: implementation, Prompt Opinion integration, runtime troubleshooting
- Follow-up: Keep runbook troubleshooting aligned with runtime log/health fields and revisit readiness checks if additional MCP tools are added.

- Date: 2026-04-18
- Decision: Change the TypeScript runtime default local port from `5000` to `5055`.
- Why: On macOS, Control Center may occupy `5000`, causing first-run failures and avoidable setup friction during Prompt Opinion demos.
- Affected files or lanes: implementation, Prompt Opinion integration, local operator runbook
- Follow-up: Keep docs and compose defaults aligned with `5055` unless a future hosted baseline requires a different standard.

- Decision: Add a pre-demo validation gate that explicitly checks MCP runtime boot (`/healthz`), active tool registration surface (`assess_discharge_readiness` only), canonical contract/taxonomy constants, matrix regression fixtures, and the 3-prompt demo path.
- Why: Existing smoke checks covered core readiness behavior but left runtime and demo-sequence regressions easier to miss before merge or judge recording.
- Affected files or lanes: implementation, evals, demo/submission, Prompt Opinion integration
- Follow-up: Keep `smoke:release-gate` as the default pre-demo command bundle and update fixture/truth checks whenever scenario expectations intentionally change.

- Date: 2026-04-18
- Decision: Establish one shared discharge workflow core (`workflow-core`) and expose a canonical 3-tool MCP suite surface: `assess_discharge_readiness`, `extract_discharge_blockers`, `generate_transition_plan`.
- Why: Readiness, blocker extraction, and transition planning were drifting toward duplicated private logic; one shared spine keeps blocker/evidence/transition contracts coherent and easier to smoke-test for demo reliability.
- Affected files or lanes: implementation, architecture, evals, Prompt Opinion runtime surface
- Follow-up: Keep cross-tool smoke checks enforcing shape/linkage consistency and prevent starter/example tool leakage on the active runtime surface.

- Date: 2026-04-18
- Decision: Expand the active MCP workflow suite to include downstream artifact tools `build_clinician_handoff_brief` and `draft_patient_discharge_instructions`, both generated from the same readiness blocker/evidence/next-step spine.
- Why: The product must show stakeholder-facing transition artifacts, not only a readiness verdict, while preserving assistive/non-autonomous framing and demo reliability.
- Affected files or lanes: implementation, evals, demo/submission, Prompt Opinion integration
- Follow-up: Keep `assess_discharge_readiness` as the canonical entrypoint name, enforce artifact-to-readiness coherence in smoke checks, and keep release-gate coverage inclusive of runtime, readiness, core suite, artifacts, and expanded demo-path checks.
