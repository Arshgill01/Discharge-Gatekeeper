# Parallel Work Playbook

## Why this exists
This repo is designed for multiple Codex agents working in parallel.
The fastest way to break progress is to let multiple agents redefine the system at the same time.

Phase 0 locks the system first.
After that, agents can split cleanly by component or deliverable.

## Locked shared-contract files
Treat these as high-collision files:
- `AGENTS.md`
- `PLAN.md`
- `README.md`
- `docs/product-brief.md`
- `docs/architecture.md`
- `docs/demo-script.md`
- `docs/data-plan.md`
- `docs/decisions.md`
- `docs/phase0-vision-lock.md`
- `docs/phase0-trap-patient-spec.md`

If your task changes any of these, say so clearly in your summary.

## Default workstreams after phase 0
- vision and scaffold
- Discharge Gatekeeper MCP
- Clinical Intelligence MCP
- external A2A orchestrator
- evals
- demo/submission

Each agent should own one lane at a time.

## Before starting
1. Read `PLAN.md`.
2. Read `docs/phase0-vision-lock.md`.
3. Read the two most relevant docs for your lane.
4. Confirm whether your task changes a shared contract.
5. If it does, update `docs/decisions.md` and point downstream agents to the affected files.

## Safe parallel splits
Good examples:
- one agent builds Discharge Gatekeeper MCP structured posture logic while another prepares the trap-patient eval fixtures
- one agent defines Clinical Intelligence MCP contradiction outputs while another hardens the Prompt Opinion operator path
- one agent works on demo packaging while another maintains the trap-patient data artifacts

Bad examples:
- two agents both redefining the 3-prompt demo
- two agents changing blocker taxonomy or verdict labels
- one agent collapsing the story back to one MCP while another builds the external A2A orchestrator
- one agent inventing a custom frontend while others stay inside Prompt Opinion

## Contract freeze policy
Once a contract is referenced by more than one workstream, do not change it casually.
If a change is necessary:
1. update the source doc
2. log the decision in `docs/decisions.md`
3. name the downstream files or lanes that now need updates

## Specific collision risks in this repo
- system identity drift between `Care Transitions Command` and component names
- architecture drift away from `2 MCPs + 1 external A2A`
- demo drift away from the hidden-risk contradiction moment
- data drift away from the canonical trap patient
- scope drift into custom frontend or extra-agent work

## Worktree naming suggestion
Use explicit names:
- `temp/vision-lock`
- `temp/dg-mcp-structured-spine`
- `temp/clinical-intelligence-mcp`
- `temp/external-a2a-orchestrator`
- `temp/trap-patient-evals`
- `temp/demo-packaging`

Avoid vague names like `temp/fix1`.

## Handoff format
When finishing a task, leave a short handoff that includes:
- what changed
- which locked assumptions were preserved
- what remains risky
- what the next best task is

## Best-practice reminder
Parallel work is only useful if every lane reinforces the same system definition.
Keep the architecture locked.
Keep the trap patient canonical.
Keep the demo story coherent.
