# Parallel Work Playbook

## Why this exists
The repo is meant for many Codex agents and worktrees at once.
Without coordination, parallel work turns into duplicated effort, contract churn, and broken demos.

## Default workstreams
Use these lanes unless a decision changes them:
- product
- architecture
- data
- implementation
- evals
- demo/submission

Each spawned agent should own one lane at a time.

## Before starting
1. Read `PLAN.md`.
2. Read the two most relevant docs in `docs/`.
3. Pick a narrow task.
4. Write down the intended output in your own notes or task prompt.
5. Confirm whether the task changes any shared contract.

## Shared-contract files
Be extra careful when editing:
- `AGENTS.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/product-brief.md`
- `docs/evals.md`
- `docs/decisions.md`

If a task changes the meaning of one of these files, the agent should say so clearly in its summary.

## Safe parallel splits
Good parallelization examples:
- one agent refines blocker taxonomy while another writes synthetic note text
- one agent implements a tool while another writes eval prompts
- one agent prepares demo copy while another audits the MCP starter repo

Bad parallelization examples:
- two agents changing the same output contract
- two agents both redefining the demo story
- one agent renaming blocker categories while another hardcodes the old names

## Contract freeze policy
Once a contract is used by more than one workstream, avoid changing it casually.
If a change is necessary:
1. update the contract source doc
2. add a note to `docs/decisions.md`
3. call out downstream files that must be updated

## Worktree naming suggestion
Use explicit names:
- `temp/product-brief`
- `temp/mcp-readiness-tool`
- `temp/data-demo-patient`
- `temp/evals-suite`
- `temp/demo-packaging`

Avoid vague names like `temp/fix1`.

## Handoff format
When finishing a task, leave a short handoff note that includes:
- what changed
- what assumptions were used
- what remains risky
- what the next best task is

## Merge preference
Prefer narrow, reviewable merges.
Do not let one worktree accumulate unrelated changes across docs, code, and demo assets unless the task genuinely spans them.

## Conflict avoidance rules
- do not rename canonical verdict states without a logged decision
- do not rename blocker categories casually
- do not widen scope without updating `PLAN.md`
- do not add flashy demo features that bypass the main readiness flow

## Best-practice reminder
The goal of parallelism is not maximum activity.
It is maximum forward progress with minimal coordination drag.
