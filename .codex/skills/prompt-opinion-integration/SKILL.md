---
name: prompt-opinion-integration
description: Work on Prompt Opinion registration, publish, and fallback mechanics for the two MCPs and the external A2A orchestrator.
compatibility: Codex-compatible skill for Prompt Opinion integration work.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# Prompt Opinion Integration

## Use this skill when
- documenting MCP registration mechanics
- documenting external A2A registration
- tightening publish and marketplace guidance
- protecting the direct-MCP fallback path

## First read
1. `AGENTS.md`
2. `docs/prompt-opinion-integration-runbook.md`
3. `docs/submission-checklist.md`
4. `docs/phase0-failure-mode-plan.md`
5. `docs/mcp-reference-analysis.md`

## Goal
Make Prompt Opinion integration explicit, boring, and resilient.

## Registration order
1. `Discharge Gatekeeper MCP`
2. `Clinical Intelligence MCP`
3. `external A2A orchestrator`

Do not register the orchestrator first.

## Always protect
- separate MCP identities
- synchronous non-streaming A2A behavior
- direct-MCP fallback demo path
- marketplace-safe copy that matches the frozen architecture

## Do not
- assume the A2A layer is publishable if MCP publication is the only supported event path
- blur the two MCP roles into one listing
- rely on hidden local state or manual repair during judging
