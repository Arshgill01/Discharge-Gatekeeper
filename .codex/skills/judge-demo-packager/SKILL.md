---
name: judge-demo-packager
description: Package the Care Transitions Command judge story, including the preferred A2A path and the direct-MCP fallback path.
compatibility: Codex-compatible skill for demo and submission packaging.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# Judge Demo Packager

## Use this skill when
- tightening the 3-prompt demo
- polishing marketplace or listing text
- deciding what to cut if the A2A layer is unstable
- packaging the two MCP identities under one system narrative

## First read
1. `AGENTS.md`
2. `docs/submission-checklist.md`
3. `docs/prompt-opinion-integration-runbook.md`
4. `docs/phase0-failure-mode-plan.md`
5. `docs/evals.md`

## Narrative rule
The story is:
1. determine whether discharge is safe
2. surface hidden risks or contradictions with citations
3. tell the team what must happen before discharge

## Packaging rules
- top-level name: `Care Transitions Command`
- show the two MCP identities explicitly if tooling surfaces them
- keep the `external A2A orchestrator` as the preferred path, not the only working path
- no custom frontend dependency

## Cut order
1. deterministic readiness clarity
2. hidden-risk evidence clarity
3. next-step clarity
4. A2A polish
