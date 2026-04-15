---
name: prompt-opinion-integration
description: Work on Prompt Opinion-specific integration details for this repo. Use when handling MCP registration, patient-data access assumptions, FHIR-context behavior, endpoint setup, or judge-path reliability.
compatibility: Codex-compatible skill for Prompt Opinion integration work.
metadata:
  version: "1.0"
  owner: discharge-gatekeeper
---

# Prompt Opinion Integration

## Use this skill when
- verifying the MCP server shape against Prompt Opinion expectations
- documenting integration assumptions
- tightening public endpoint and Marketplace readiness
- protecting the Launchpad invocation path

## First read
1. `AGENTS.md`
2. `PLAN.md`
3. `docs/architecture.md`
4. `docs/submission-checklist.md`
5. `docs/mcp-reference-analysis.md`

## Goal
Make the project easy to invoke, inspect, and trust inside Prompt Opinion.

## Workflow
1. Identify the exact integration touchpoint being changed.
2. Confirm whether the change affects:
   - patient context propagation
   - endpoint behavior
   - tool discoverability
   - judge-facing reliability
3. Keep the integration path as boring and stable as possible.
4. Write down any new assumptions in docs.

## Priorities
- working Launchpad flow
- clear tool metadata
- patient/FHIR context correctness
- public endpoint resilience
- Marketplace readiness

## Do not
- add external complexity that does not help judging
- assume invisible local state is acceptable
- bury critical integration assumptions in code only

## Final checks
Before finishing:
1. Would a fresh Prompt Opinion session still work?
2. Did this change improve or weaken judge-path reliability?
3. Did you update the relevant doc if assumptions changed?
