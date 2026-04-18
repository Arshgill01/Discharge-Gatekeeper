---
name: synthetic-clinical-data-builder
description: Create or refine synthetic patient data and evidence bundles that exercise both the deterministic discharge spine and the hidden-risk layer.
compatibility: Codex-compatible skill for synthetic healthcare demo data.
metadata:
  version: "2.0"
  owner: care-transitions-command
---

# Synthetic Clinical Data Builder

## Use this skill when
- creating or revising a trap patient
- writing note/document evidence for hidden-risk detection
- aligning structured and narrative evidence across both MCPs

## First read
1. `AGENTS.md`
2. `docs/evals.md`
3. `docs/phase0-hidden-risk-prompt-contract.md`
4. `docs/phase0-failure-mode-plan.md`
5. `docs/demo-script.md`

## Goal
Build a patient scenario where:
- the deterministic discharge spine has enough structure to produce a baseline verdict
- the hidden-risk layer has something real to find
- the result is still easy to explain in a judge demo

## Design rules
- at least one important risk must be note-only or contradiction-based
- every hidden-risk trap must be citeable from provided evidence
- weak or irrelevant narrative details should exist so false-positive controls are tested
- the scenario must support the direct-MCP fallback path

## Do not
- make every blocker obvious from structured data alone
- rely on one perfect note that makes synthesis trivial
- create drama that overwhelms the discharge story
