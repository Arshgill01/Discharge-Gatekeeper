# AGENTS.md
## Mission
Build a judge-winning Prompt Opinion submission for Agents Assemble.
The product is **Discharge Gatekeeper**: an MCP-first healthcare agent that determines whether a patient is safe for discharge, identifies blockers with evidence, and assembles the next-step transition plan.
Everything in this repo should improve the odds of a clean Prompt Opinion demo, a reliable Marketplace publish flow, and a strong sub-3-minute judging story.

## Why this repo exists
This repository is the operating system for parallel Codex work.
Optimize for rapid understanding, low coordination overhead, thin vertical slices, reliable Prompt Opinion integration, demo-first execution, and judge-proof packaging.

## Priorities
Primary goal:
1. Deliver an MCP server that works inside Prompt Opinion.
2. Support patient-context-aware discharge-readiness assessment.
3. Surface clear blockers, evidence, and next-step outputs.
4. Make the demo and submission path reliable.
Secondary goal: keep the architecture clean enough to extend after the hackathon.
Do not trade the primary goal for speculative architecture purity.

## System of record
Treat this file as the map, not the encyclopedia.
The deeper source of truth lives in `docs/`.
Read these first:
1. `docs/product-brief.md`
2. `docs/architecture.md`
3. `docs/demo-script.md`
4. `docs/evals.md`
5. `docs/submission-checklist.md`
Read these for specialized work:
- `docs/mcp-reference-analysis.md`
- `docs/data-plan.md`
- `docs/parallel-workplay.md`
- `docs/decisions.md`

## Product thesis
Discharge Gatekeeper is not a generic hospital copilot.
It is a discharge control-tower agent.
Core job: decide whether a patient is safe for discharge now.
Support jobs: identify blockers, cite evidence from notes and structured context, produce a prioritized next-step plan, and generate clinician and patient transition outputs.
The product should answer:
- Is this patient safe to discharge today?
- If not, what exactly is blocking discharge?
- What must happen before the patient leaves?
- What transition outputs should the team send now?

## Submission lane
Default lane: **MCP-first**.
Use Prompt Opinion internal A2A only as a thin wrapper if it improves integration or demo flow.
Do not start with an external A2A architecture unless the repo owner explicitly changes the plan.

## Non-goals
Do not drift into diagnosis generation, differential generation, treatment recommendation beyond transition support, general-purpose care navigation, broad hospital operations platforms, external-agent-first complexity, pretty dashboards with weak workflow value, or complex infra that does not improve the judging path.

## Canonical demo shape
Primary demo path:
1. User asks in Prompt Opinion Launchpad: “Is this patient safe to discharge today?”
2. The orchestrating agent/toolchain reads patient context, pulls structured FHIR data, uses uploaded notes/documents, runs discharge-readiness tools, and returns a verdict plus blockers and evidence.
3. Follow-up prompts:
   - “What exactly must happen before discharge?”
   - “Prepare the transition package.”
Any change that weakens this flow is suspect.

## Canonical verdict states
Use these exact states unless an ADR changes them:
- `ready`
- `ready_with_caveats`
- `not_ready`
Avoid inventing alternate labels in different files.

## Canonical blocker categories
Use these canonical top-level blocker categories:
- clinical_stability
- pending_diagnostics
- medication_reconciliation
- follow_up_and_referrals
- patient_education
- home_support_and_services
- equipment_and_transport
- administrative_and_documentation
You may add subcategories, but do not casually rename these.

## Canonical outputs
The repo should converge on these outputs:
1. discharge readiness verdict
2. blocker list with severity
3. evidence trace by source
4. prioritized next-step checklist
5. clinician handoff brief
6. patient-friendly discharge instructions
Keep contracts stable once adopted.

## Working norms
When making changes:
1. Read the relevant docs first.
2. Update the narrowest thing that solves the problem.
3. Preserve existing contracts unless there is a documented reason to change them.
4. Write down important decisions in `docs/decisions.md`.
5. Prefer incremental vertical slices over large speculative rewrites.

## Parallel work
This repo is designed for many simultaneous agents.
To reduce collisions: claim one workstream at a time, stay inside that workstream’s scope, update the plan if you change priorities, and leave crisp handoff notes in the docs or commit summary.
Main workstreams:
- product
- architecture
- data
- implementation
- evals
- demo/submission
Use `docs/parallel-workplay.md` before starting large changes.

## File routing
Use this routing:
- product framing -> `docs/product-brief.md`
- architecture and tool contracts -> `docs/architecture.md`
- MCP starter analysis -> `docs/mcp-reference-analysis.md`
- demo flow -> `docs/demo-script.md`
- evaluation prompts and expected behavior -> `docs/evals.md`
- synthetic patient and note design -> `docs/data-plan.md`
- publish/judging tasks -> `docs/submission-checklist.md`
- project state and next tasks -> `PLAN.md`

## Coding guidance
Prefer explicit names, small modules, thin orchestration layers, stable typed contracts, and boring reliability over clever abstractions.
For MCP and integration code:
- keep tool boundaries sharp
- keep prompts short and intentional
- keep response schemas easy to inspect
- make failures legible

## Tool-design guidance
Every tool should justify its existence.
A tool should do one of these:
- fetch or normalize high-value context
- assess a concrete discharge question
- extract or structure blockers
- produce a bounded transition artifact
Avoid vague “do everything” tools.
Each tool should have a narrow purpose, a clear input contract, a stable output shape, and a useful error path.

## Prompt-design guidance
Prompt Opinion judging will reward clarity and reliability.
Do not write fluffy prompts.
Prompts should state the job, state the boundary, state the output contract, and prefer evidence over confident prose.
Avoid overclaiming clinical certainty.
The system assists human review; it does not replace it.

## Demo-first rule
A change is more valuable if it improves at least one of:
- correctness of the readiness verdict
- clarity of blocker evidence
- quality of transition outputs
- reliability of the Prompt Opinion call path
- sharpness of the 3-minute demo
If a change does not improve any of those, question it.

## Documentation rules
Keep AGENTS short enough to be skimmable.
Put detail in `docs/`.
When you discover something important, add it to the right doc rather than as random prompt lore.
Avoid duplicating long instructions across many files.
Prefer one canonical source plus cross-references.

## PLAN and decisions
`PLAN.md` is live.
Update it when priorities change, a workstream is blocked, a milestone is completed, a new immediate task becomes top priority, or a significant risk appears.
Use `docs/decisions.md` for contract changes, lane changes, naming changes, blocker taxonomy changes, major architecture changes, and demo-scope cuts.
Keep entries short, dated, and explicit.

## Safety and quality bar
This is a healthcare workflow project.
Be conservative in claims.
Do not imply autonomous discharge authority, guaranteed safety, readmission prediction certainty, or medical advice beyond workflow support.
Outputs should be framed as readiness support, blocker detection, evidence synthesis, and transition coordination.

## Reference implementation guidance
The Prompt Opinion community MCP repo is a pattern source, not a blueprint to copy blindly.
Borrow integration shape, FHIR-context handling patterns, simple tool registration style, and boring starter structure.
Do not inherit toy naming, template-level assumptions, or overly generic tool semantics.

## Change hygiene
Make narrowly scoped commits.
Avoid giant mixed-purpose diffs.
If touching docs and code together, keep the rationale obvious.
If a change alters the demo path, say so clearly in the summary.

## When unsure
Choose the option that:
1. keeps the discharge wedge sharper
2. keeps the Prompt Opinion path more reliable
3. keeps the demo more legible
4. keeps the repo easier for parallel agents to navigate

## First-response checklist
Before changing files:
1. Read `PLAN.md`.
2. Read the two most relevant docs in `docs/`.
3. Restate the exact subtask to yourself.
4. Identify the narrowest useful change.
5. Confirm that the change helps the core demo path.
6. Then start.

## Final reminder
This repo is not trying to be the final form of healthcare agents.
It is trying to win this hackathon with a product that is specific, credible, inspectable, demoable, and publishable.
Keep the wedge sharp.
Keep the workflow real.
Keep the demo sacred.
