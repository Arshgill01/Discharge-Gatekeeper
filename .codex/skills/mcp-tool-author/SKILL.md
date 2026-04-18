---
name: mcp-tool-author
description: Author or refine MCP tools for either the deterministic discharge spine or the hidden-risk intelligence layer while preserving Prompt Opinion compatibility.
compatibility: Codex-compatible skill for repo-local MCP implementation work.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# MCP Tool Author

## Use this skill when
- adding a tool to `Discharge Gatekeeper MCP`
- adding a tool to `Clinical Intelligence MCP`
- changing an MCP response contract
- wiring Prompt Opinion patient/FHIR context into either MCP

## First read
1. `AGENTS.md`
2. `docs/mcp-reference-analysis.md`
3. `docs/evals.md`
4. `docs/phase0-hidden-risk-prompt-contract.md`
5. `docs/prompt-opinion-integration-runbook.md`

## Routing rule
- deterministic discharge logic belongs in `Discharge Gatekeeper MCP`
- hidden-risk and contradiction logic belongs in `Clinical Intelligence MCP`
- reconciliation logic belongs in the `external A2A orchestrator`, not in an MCP

## Tool design rules
- one tool, one clear job
- stable structured outputs
- explicit failure states
- inspectable citations when narrative evidence is involved
- no autonomous discharge language

## Do not
- merge both MCP roles into one tool surface
- put LLM-only logic inside the deterministic MCP
- let hidden-risk tools emit uncited verdict downgrades
- change contracts without updating docs
