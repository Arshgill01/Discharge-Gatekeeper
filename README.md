# Discharge Gatekeeper Workspace Pack

This directory is a starter repo-operating-system pack for a Codex-driven build of **Discharge Gatekeeper**, an MCP-first Prompt Opinion hackathon project.

## Included
- `AGENTS.md` -> short repo map and operating rules
- `PLAN.md` -> live execution plan
- `docs/` -> product, architecture, demo, eval, data, reference analysis, and submission docs
- `.codex/skills/` -> repo-specific skills with `SKILL.md` frontmatter

## How to use
1. Drop these files into the root of your project repo.
2. Keep `AGENTS.md` short and treat `docs/` as the system of record.
3. Update `PLAN.md` and `docs/decisions.md` as work progresses.
4. Let Codex agents work in narrow parallel lanes instead of broad overlapping tasks.

## First recommended build step
Read:
1. `docs/mcp-reference-analysis.md`
2. `docs/architecture.md`
3. `PLAN.md`

Then scaffold the first MCP tool: `assess_discharge_readiness`.
